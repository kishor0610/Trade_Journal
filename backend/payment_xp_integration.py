"""
Updated Payment Endpoints with XP Redemption
These modifications need to be applied to subscription_app.py
"""

# ============ UPDATE MODELS ============

class CreateOrderRequest(BaseModel):
    plan: str
    xp_amount: int = 0  # NEW: XP to use for discount

class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    plan: str
    xp_used: int = 0  # NEW: Track XP used

# ============ HELPER FUNCTION ============

async def calculate_discounted_price(plan_price: int, xp_amount: int, user_id: str, referral_service) -> tuple:
    """
    Calculate final price after XP discount
    Returns: (final_price, valid_xp_used)
    """
    # Validate XP availability
    user_xp_balance = await referral_service.get_user_xp_balance(user_id)
    
    # Cannot use more XP than available
    valid_xp = min(xp_amount, user_xp_balance)
    
    # Cannot reduce price below ₹0
    valid_xp = min(valid_xp, plan_price)
    
    final_price = plan_price - valid_xp
    
    return final_price, valid_xp

# ============ UPDATED CREATE ORDER ENDPOINT ============

@app.post("/api/subscriptions/create-order")
async def create_subscription_order(
    order_data: CreateOrderRequest, 
    current_user: dict = Depends(server.get_current_user),
    referral_service = Depends(lambda: server.referral_service)  # NEW
):
    """
    Create Razorpay order with XP discount applied
    """
    if order_data.plan not in SUBSCRIPTION_PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan")

    credentials, client_error = validate_razorpay_credentials()
    if not credentials:
        raise HTTPException(status_code=500, detail=client_error)

    plan = SUBSCRIPTION_PLANS[order_data.plan]
    base_price = plan["price"]
    
    # NEW: Calculate discounted price with XP
    final_price, valid_xp_used = await calculate_discounted_price(
        base_price, 
        order_data.xp_amount, 
        current_user["id"],
        referral_service
    )
    
    # Razorpay doesn't allow ₹0 orders
    if final_price <= 0:
        raise HTTPException(
            status_code=400, 
            detail="Cannot create ₹0 order. XP covers full amount - contact support for manual activation"
        )
    
    amount_paise = int(final_price * 100)
    key_id, key_secret = credentials

    try:
        # NEW: Pass XP info in order notes
        order = await create_razorpay_order_with_notes(
            key_id, 
            key_secret, 
            amount_paise, 
            current_user["id"], 
            order_data.plan,
            xp_used=valid_xp_used  # NEW
        )
    except HTTPException:
        raise
    except Exception as exc:
        logging.error("Razorpay order creation failed: %s", exc)
        raise HTTPException(status_code=500, detail=f"Failed to create order: {exc}") from exc

    return {
        "order_id": order["id"],
        "base_amount": base_price,
        "xp_discount": valid_xp_used,
        "final_amount": final_price,
        "amount_paise": amount_paise,
        "currency": "INR",
        "key_id": key_id,
        "plan": order_data.plan,
        "plan_name": plan["name"],
    }

# ============ UPDATED ORDER CREATION WITH NOTES ============

async def create_razorpay_order_with_notes(
    key_id: str, 
    key_secret: str, 
    amount_paise: int, 
    user_id: str, 
    plan_id: str,
    xp_used: int = 0  # NEW
) -> dict:
    """Create Razorpay order with XP metadata"""
    receipt = f"sub-{user_id[:8]}-{int(datetime.now(timezone.utc).timestamp())}"
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            "https://api.razorpay.com/v1/orders",
            auth=(key_id, key_secret),
            json={
                "amount": amount_paise,
                "currency": "INR",
                "receipt": receipt,
                "notes": {  # NEW: Store XP usage
                    "user_id": user_id,
                    "plan": plan_id,
                    "xp_used": str(xp_used)
                }
            },
        )
    
    if response.status_code >= 400:
        error_message = response.text
        try:
            error_data = response.json()
            if "error" in error_data:
                error_message = error_data["error"].get("description", error_message)
        except Exception:
            pass
        logging.error("Razorpay order creation failed (status=%s): %s", response.status_code, error_message)
        if response.status_code < 500:
            raise HTTPException(status_code=400, detail=f"Razorpay order creation failed: {error_message}")
        raise HTTPException(status_code=502, detail="Razorpay gateway error while creating order")
    
    return response.json()

# ============ UPDATED PAYMENT VERIFICATION WITH REFERRAL LOGIC ============

@app.post("/api/subscriptions/verify-payment")
async def verify_subscription_payment(
    payment_data: VerifyPaymentRequest, 
    current_user: dict = Depends(server.get_current_user),
    referral_service = Depends(lambda: server.referral_service)  # NEW
):
    """
    Verify payment and apply:
    1. XP deduction
    2. Subscription activation
    3. Referral rewards (+15 days bonus, +100 XP to referrer)
    """
    if payment_data.plan not in SUBSCRIPTION_PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan")

    credentials, client_error = validate_razorpay_credentials()
    if not credentials:
        raise HTTPException(status_code=500, detail=client_error)

    plan = SUBSCRIPTION_PLANS[payment_data.plan]
    key_id, key_secret = credentials

    try:
        # Verify signature
        verify_razorpay_signature(
            payment_data.razorpay_order_id,
            payment_data.razorpay_payment_id,
            payment_data.razorpay_signature,
            key_secret,
        )

        # Fetch payment details
        payment = await fetch_razorpay_payment(key_id, key_secret, payment_data.razorpay_payment_id)
        
        # Capture if needed
        if payment["status"] == "authorized":
            payment = await capture_razorpay_payment(
                key_id,
                key_secret,
                payment_data.razorpay_payment_id,
                payment["amount"],  # Use actual amount from payment
            )

        if payment["status"] != "captured":
            raise HTTPException(status_code=400, detail="Payment not completed")

        # NEW: Extract XP used from payment notes
        xp_used = int(payment.get("notes", {}).get("xp_used", 0))
        
        # NEW: Deduct XP if used (CRITICAL - do this FIRST before any rewards)
        if xp_used > 0:
            success = await referral_service.debit_xp(
                user_id=current_user["id"],
                amount=xp_used,
                reason="subscription_payment",
                reference_id=payment_data.razorpay_payment_id
            )
            if not success:
                logging.error(f"Failed to deduct XP for user {current_user['id']}")
                # Don't fail the payment, but log the issue
        
        # Calculate subscription dates
        start_date = datetime.now(timezone.utc)
        base_duration = plan["duration_days"]
        
        # NEW: Process referral rewards
        referral_result = await referral_service.process_successful_payment(
            user_id=current_user["id"],
            payment_id=payment_data.razorpay_payment_id
        )
        
        # Add referral bonus days
        total_duration = base_duration + referral_result.get('bonus_days', 0)
        end_date = start_date + timedelta(days=total_duration)

        # Store payment record with XP info
        await server.db.payments.insert_one(
            {
                "id": str(uuid.uuid4()),
                 "user_id": current_user["id"],
                "base_amount": plan["price"],
                "xp_used": xp_used,  # NEW
                "final_amount": payment["amount"] / 100,  # NEW
                "plan": payment_data.plan,
                "status": "success",
                "razorpay_order_id": payment_data.razorpay_order_id,
                "razorpay_payment_id": payment_data.razorpay_payment_id,
                "razorpay_signature": payment_data.razorpay_signature,
                "referral_bonus_days": referral_result.get('bonus_days', 0),  # NEW
                "created_at": start_date.isoformat(),
            }
        )

        # Update user subscription
        await server.db.users.update_one(
            {"id": current_user["id"]},
            {
                "$set": {
                    "subscription_status": "active",
                    "subscription_plan": payment_data.plan,
                    "subscription_start_date": start_date.isoformat(),
                    "subscription_end_date": end_date.isoformat(),
                }
            },
        )
        
        # NEW: Log referral rewards
        reward_message = ""
        if referral_result.get('bonus_days', 0) > 0:
            reward_message = f" +{referral_result['bonus_days']} bonus days from referral!"
        
        logging.info(
            f"Payment success: user={current_user['id']}, "
            f"plan={payment_data.plan}, xp_used={xp_used}, "
            f"bonus_days={referral_result.get('bonus_days', 0)}"
        )
        
    except HTTPException:
        raise
    except Exception as exc:
        logging.error("Payment verification failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Payment verification failed: {exc}") from exc

    return {
        "message": "Payment verified and subscription activated" + reward_message,
        "subscription_end_date": end_date.isoformat(),
        "xp_used": xp_used,
        "bonus_days": referral_result.get('bonus_days', 0),
        "referrer_reward": referral_result.get('xp_earned_by_referrer', 0)
    }
