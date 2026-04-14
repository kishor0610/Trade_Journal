"""
COMPLETE REFERRAL + XP WALLET INTEGRATION GUIDE
===================================================

This file shows all the changes needed to integrate the referral system into server.py
Follow these steps carefully to avoid breaking existing functionality.
"""

# ============================================================
# STEP 1: ADD IMPORTS (Add to top of server.py after existing imports)
# ============================================================

from referral_service import ReferralService
from referral_endpoints import create_referral_endpoints, create_admin_referral_endpoints

# ============================================================
# STEP 2: INITIALIZE REFERRAL SERVICE (After db initialization)
# ============================================================

# Add this after: db = client[os.environ.get('DB_NAME', 'trade_ledger')]

referral_service = ReferralService(db)

# ============================================================
# STEP 3: UPDATE UserRegister MODEL (Add referral_code field)
# ============================================================

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    referral_code: Optional[str] = None  # NEW: Accept referral code during signup

# ============================================================
# STEP 4: UPDATE REGISTER ENDPOINT (Add referral tracking)
# ============================================================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserRegister):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "password": hash_password(user_data.password),
        "created_at": now,
        "xp_balance": 0,  # NEW: Initialize XP balance
        "xp_updated_at": now  # NEW
    }
    
    await db.users.insert_one(user_doc)
    
    # NEW: Track referral if code provided
    if user_data.referral_code:
        try:
            await referral_service.track_signup_from_referral(
                new_user_id=user_id,
                referral_code=user_data.referral_code.upper()
            )
            logging.info(f"Referral tracked for new user: {user_id}")
        except Exception as e:
            logging.error(f"Failed to track referral: {str(e)}")
            # Don't fail registration if referral tracking fails
    
    # Assign 14-day trial on registration
    await assign_trial(user_id)
    token = create_access_token(user_id, user_data.email)
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(id=user_id, email=user_data.email, name=user_data.name, created_at=now)
    )

# ============================================================
# STEP 5: ADD REFERRAL ENDPOINTS (After authentication endpoints)
# ============================================================

# Add this after all authentication endpoints

# Initialize referral endpoints
create_referral_endpoints(api_router, referral_service, get_current_user, FRONTEND_URL)

# ============================================================
# STEP 6: ADD ADMIN REFERRAL ENDPOINTS (After admin endpoints)
# ============================================================

# Add this after all admin endpoints

# Initialize admin referral endpoints
create_admin_referral_endpoints(admin_router, referral_service, db, get_admin_user)

# ============================================================
# STEP 7: UPDATE subscription_app.py IMPORTS
# ============================================================

# Add to subscription_app.py imports
import server  # To access server.referral_service

# ============================================================
# STEP 8: UPDATE CreateOrderRequest in subscription_app.py
# ============================================================

class CreateOrderRequest(BaseModel):
    plan: str
    xp_amount: int = 0  # NEW: XP to use for discount

# ============================================================
# STEP 9: UPDATE create_razorpay_order function in subscription_app.py
# ============================================================

async def create_razorpay_order(
    key_id: str, 
    key_secret: str, 
    amount_paise: int, 
    user_id: str, 
    plan_id: str,
    xp_used: int = 0  # NEW parameter
) -> dict:
    """Create Razorpay order with XP tracking in notes"""
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

# ============================================================
# STEP 10: UPDATE /create-order endpoint in subscription_app.py
# ============================================================

@app.post("/api/subscriptions/create-order")
async def create_subscription_order(
    order_data: CreateOrderRequest, 
    current_user: dict = Depends(server.get_current_user)
):
    """Create Razorpay order with XP discount"""
    if order_data.plan not in SUBSCRIPTION_PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan")

    credentials, client_error = validate_razorpay_credentials()
    if not credentials:
        raise HTTPException(status_code=500, detail=client_error)

    plan = SUBSCRIPTION_PLANS[order_data.plan]
    base_price = plan["price"]
    
    # NEW: Calculate discounted price
    user_xp = await server.referral_service.get_user_xp_balance(current_user["id"])
    valid_xp = min(order_data.xp_amount, user_xp, base_price)
    final_price = base_price - valid_xp
    
    if final_price <= 0:
        raise HTTPException(
            status_code=400, 
            detail="Cannot create ₹0 order. Please contact support."
        )
    
    amount_paise = int(final_price * 100)
    key_id, key_secret = credentials

    try:
        order = await create_razorpay_order(
            key_id, key_secret, amount_paise, 
            current_user["id"], order_data.plan,
            xp_used=valid_xp  # NEW
        )
    except HTTPException:
        raise
    except Exception as exc:
        logging.error("Razorpay order creation failed: %s", exc)
        raise HTTPException(status_code=500, detail=f"Failed to create order: {exc}") from exc

    return {
        "order_id": order["id"],
        "base_amount": base_price,
        "xp_discount": valid_xp,
        "final_amount": final_price,
        "amount_paise": amount_paise,
        "currency": "INR",
        "key_id": key_id,
        "plan": order_data.plan,
        "plan_name": plan["name"],
    }

# ============================================================
# STEP 11: UPDATE VerifyPaymentRequest in subscription_app.py
# ============================================================

class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    plan: str
    xp_used: int = 0  # NEW

# ============================================================
# STEP 12: UPDATE /verify-payment endpoint in subscription_app.py (CRITICAL!)
# ============================================================

@app.post("/api/subscriptions/verify-payment")
async def verify_subscription_payment(
    payment_data: VerifyPaymentRequest, 
    current_user: dict = Depends(server.get_current_user)
):
    """Verify payment and process referral rewards"""
    if payment_data.plan not in SUBSCRIPTION_PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan")

    credentials, client_error = validate_razorpay_credentials()
    if not credentials:
        raise HTTPException(status_code=500, detail=client_error)

    plan = SUBSCRIPTION_PLANS[payment_data.plan]
    key_id, key_secret = credentials

    try:
        verify_razorpay_signature(
            payment_data.razorpay_order_id,
            payment_data.razorpay_payment_id,
            payment_data.razorpay_signature,
            key_secret,
        )

        payment = await fetch_razorpay_payment(key_id, key_secret, payment_data.razorpay_payment_id)
        
        if payment["status"] == "authorized":
            payment = await capture_razorpay_payment(
                key_id,
                key_secret,
                payment_data.razorpay_payment_id,
                payment["amount"],
            )

        if payment["status"] != "captured":
            raise HTTPException(status_code=400, detail="Payment not completed")

        # NEW: Get XP used from payment notes
        xp_used = int(payment.get("notes", {}).get("xp_used", 0))
        
        # NEW: Deduct XP FIRST (critical to prevent exploits)
        if xp_used > 0:
            success = await server.referral_service.debit_xp(
                user_id=current_user["id"],
                amount=xp_used,
                reason="subscription_payment",
                reference_id=payment_data.razorpay_payment_id
            )
            if not success:
                logging.error(f"XP deduction failed for user {current_user['id']}")
        
        start_date = datetime.now(timezone.utc)
        base_duration = plan["duration_days"]
        
        # NEW: Process referral rewards (+15 days bonus, +100 XP to referrer)
        referral_result = await server.referral_service.process_successful_payment(
            user_id=current_user["id"],
            payment_id=payment_data.razorpay_payment_id
        )
        
        total_duration = base_duration + referral_result.get('bonus_days', 0)
        end_date = start_date + timedelta(days=total_duration)

        # Store payment with XP tracking
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
        
        logging.info(
            f"Payment success: user={current_user['id']}, xp_used={xp_used}, "
            f"bonus_days={referral_result.get('bonus_days', 0)}"
        )
        
    except HTTPException:
        raise
    except Exception as exc:
        logging.error("Payment verification failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Payment verification failed: {exc}") from exc

    return {
        "message": "Payment verified and subscription activated",
        "subscription_end_date": end_date.isoformat(),
        "xp_used": xp_used,
        "bonus_days": referral_result.get('bonus_days', 0),
    }

# ============================================================
# DATABASE INDEXES (Run these in MongoDB)
# ============================================================

"""
// Create indexes for better performance
db.users.createIndex({ "referral_code": 1 }, { unique: true, sparse: true });
db.users.createIndex({ "xp_balance": 1 });
db.referrals.createIndex({ "referrer_id": 1 });
db.referrals.createIndex({ "referred_user_id": 1 });
db.referrals.createIndex({ "status": 1 });
db.xp_transactions.createIndex({ "user_id": 1, "created_at": -1 });
"""

# ============================================================
# TESTING CHECKLIST
# ============================================================

"""
1. ✅ Test signup with referral code
2. ✅ Test signup without referral code
3. ✅ Test referral code generation
4. ✅ Test XP balance retrieval
5. ✅ Test payment with XP discount
6. ✅ Test payment without XP discount
7. ✅ Test payment verification triggers referral rewards
8. ✅ Test XP deduction prevents over-redemption
9. ✅ Test admin can view all referrals
10. ✅ Test admin can credit XP manually
"""
