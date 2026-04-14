# CRITICAL: Install Razorpay Python SDK first
# Deployment trigger: minor change for commit (2026-04-14)
# [FORCE PUSH TEST] - Copilot added this comment to trigger a backend commit.
# pip install razorpay

# Add to requirements.txt:
# razorpay==1.4.2

# These are the NEW API endpoints to add to server.py:

# ============ SUBSCRIPTION HELPER FUNCTIONS ============

TRIAL_DURATION_DAYS = 14  # Default trial duration in days

async def check_subscription_status(user: dict) -> bool:
    """Check if user has active subscription"""
    if user.get('subscription_status') == 'active':
        end_date = user.get('subscription_end_date')
        if end_date:
            if isinstance(end_date, str):
                end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            if end_date > datetime.now(timezone.utc):
                return True
    return False

async def assign_trial(user_id: str):
    """Assign 7-day trial to new user"""
    trial_end = datetime.now(timezone.utc) + timedelta(days=TRIAL_DURATION_DAYS)
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "subscription_status": "trial",
            "subscription_plan": None,
            "subscription_start_date": datetime.now(timezone.utc).isoformat(),
            "subscription_end_date": trial_end.isoformat(),
            "role": "user",
            "status": "active"
        }}
    )

async def create_audit_log(admin_id: str, action: str, target_user_id: str, details: dict = None):
    """Create audit log entry"""
    log_entry = {
        "id": str(uuid.uuid4()),
        "admin_id": admin_id,
        "action": action,
        "target_user_id": target_user_id,
        "details": details or {},
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.audit_logs.insert_one(log_entry)

async def expire_subscriptions():
    """Check and expire subscriptions (run daily)"""
    now = datetime.now(timezone.utc).isoformat()
    result = await db.users.update_many(
        {
            "subscription_end_date": {"$lt": now},
            "subscription_status": {"$in": ["active", "trial"]}
        },
        {"$set": {
            "subscription_status": "expired",
            "last_status_change": now
        }}
    )
    return result.modified_count

# ============ FEATURE LOCK MIDDLEWARE ============

async def require_active_subscription(user: dict = Depends(get_current_user)):
    """Require active subscription to access feature"""
    is_active = await check_subscription_status(user)
    if not is_active:
        raise HTTPException(
            status_code=403,
            detail="Active subscription required to access this feature"
        )
    return user

# ============ USER MANAGEMENT APIS (ADMIN) ============

@admin_router.post("/users/{user_id}/activate")
async def activate_user(user_id: str, admin: dict = Depends(get_admin_user)):
    """Activate user account"""
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "status": "active",
            "last_status_change": datetime.now(timezone.utc).isoformat()
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(404, "User not found")
    
    await create_audit_log(admin.get('sub'), 'user_activated', user_id)
    return {"message": "User activated successfully"}

@admin_router.post("/users/{user_id}/deactivate")
async def deactivate_user(user_id: str, admin: dict = Depends(get_admin_user)):
    """Deactivate user account"""
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "status": "inactive",
            "last_status_change": datetime.now(timezone.utc).isoformat()
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(404, "User not found")
    
    await create_audit_log(admin.get('sub'), 'user_deactivated', user_id)
    return {"message": "User deactivated successfully"}

@admin_router.post("/users/{user_id}/send-email")
async def send_user_email(user_id: str, email_data: SendEmailRequest, admin: dict = Depends(get_admin_user)):
    """Send email to user"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(404, "User not found")
    
    if not RESEND_API_KEY:
        raise HTTPException(500, "Email service not configured")
    
    try:
        params = {
            "from": SENDER_EMAIL,
            "to": [user['email']],
            "subject": email_data.subject,
            "html": email_data.message
        }
        await asyncio.to_thread(resend.Emails.send, params)
        await create_audit_log(admin.get('sub'), 'email_sent', user_id, {"subject": email_data.subject})
        return {"message": "Email sent successfully"}
    except Exception as e:
        raise HTTPException(500, f"Failed to send email: {str(e)}")

@admin_router.post("/users/{user_id}/reset-password")
async def admin_reset_password(user_id: str, admin: dict = Depends(get_admin_user)):
    """Generate password reset link for user"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(404, "User not found")
    
    reset_token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
    
    await db.password_resets.insert_one({
        "user_id": user['id'],
        "email": user['email'],
        "token": reset_token,
        "expires_at": expires_at.isoformat(),
        "used": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": "admin"
    })
    
    reset_link = f"{FRONTEND_URL}/reset-password?token={reset_token}"
    await create_audit_log(admin.get('sub'), 'password_reset_created', user_id)
    
    return {"message": "Password reset created", "reset_link": reset_link}

# ============ SUBSCRIPTION MANAGEMENT APIs (ADMIN) ============

@admin_router.patch("/subscriptions/{user_id}/extend")
async def extend_subscription(user_id: str, extend_data: ExtendSubscriptionRequest, admin: dict = Depends(get_admin_user)):
    """Admin extends user subscription"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(404, "User not found")
    
    current_end = user.get('subscription_end_date')
    if current_end:
        if isinstance(current_end, str):
            current_end = datetime.fromisoformat(current_end.replace('Z', '+00:00'))
    else:
        current_end = datetime.now(timezone.utc)
    
    new_end = current_end + timedelta(days=extend_data.days)
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "subscription_end_date": new_end.isoformat(),
            "subscription_status": "active"
        }}
    )
    
    await create_audit_log(admin.get('sub'), 'subscription_extended', user_id, {"days": extend_data.days})
    return {"message": f"Subscription extended by {extend_data.days} days", "new_end_date": new_end.isoformat()}

@admin_router.patch("/subscriptions/{user_id}/change-plan")
async def change_user_plan(user_id: str, plan_data: ChangePlanRequest, admin: dict = Depends(get_admin_user)):
    """Admin changes user subscription plan"""
    if plan_data.plan not in SUBSCRIPTION_PLANS:
        raise HTTPException(400, "Invalid plan")
    
    plan = SUBSCRIPTION_PLANS[plan_data.plan]
    new_end = datetime.now(timezone.utc) + timedelta(days=plan['duration_days'])
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "subscription_plan": plan_data.plan,
            "subscription_end_date": new_end.isoformat(),
            "subscription_status": "active"
        }}
    )
    
    await create_audit_log(admin.get('sub'), 'plan_changed', user_id, {"new_plan": plan_data.plan})
    return {"message": f"Plan changed to {plan_data.plan}", "new_end_date": new_end.isoformat()}

@admin_router.post("/subscriptions/{user_id}/activate")
async def admin_activate_subscription(user_id: str, admin: dict = Depends(get_admin_user)):
    """Admin activates user subscription"""
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"subscription_status": "active"}}
    )
    await create_audit_log(admin.get('sub'), 'subscription_activated', user_id)
    return {"message": "Subscription activated"}

@admin_router.post("/subscriptions/{user_id}/deactivate")
async def admin_deactivate_subscription(user_id: str, admin: dict = Depends(get_admin_user)):
    """Admin deactivates user subscription"""
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"subscription_status": "expired"}}
    )
    await create_audit_log(admin.get('sub'), 'subscription_deactivated', user_id)
    return {"message": "Subscription deactivated"}

# ============ SUBSCRIPTION APIs (USER) ============

@api_router.get("/subscriptions/plans")
async def get_subscription_plans():
    """Get available subscription plans"""
    plans = []
    for plan_id, plan_data in SUBSCRIPTION_PLANS.items():
        plans.append({
            "plan_id": plan_id,
            "name": plan_data['name'],
            "price": plan_data['price'],
            "duration_days": plan_data['duration_days'],
            "discount": plan_data.get('discount')
        })
    return {"plans": plans}

@api_router.get("/subscriptions/my-subscription")
async def get_my_subscription(user: dict = Depends(get_current_user)):
    """Get current user subscription status"""
    return {
        "user_id": user['id'],
        "subscription_status": user.get('subscription_status', 'expired'),
        "subscription_plan": user.get('subscription_plan'),
        "subscription_start_date": user.get('subscription_start_date'),
        "subscription_end_date": user.get('subscription_end_date'),
        "is_active": await check_subscription_status(user)
    }

@api_router.post("/subscriptions/create-order")
async def create_subscription_order(order_data: CreateOrderRequest, user: dict = Depends(get_current_user)):
    """Create Razorpay order for subscription"""
    if order_data.plan not in SUBSCRIPTION_PLANS:
        raise HTTPException(400, "Invalid plan")
    
    if not razorpay_client:
        raise HTTPException(500, "Payment service not available")
    
    plan = SUBSCRIPTION_PLANS[order_data.plan]
    amount = int(plan['price'] * 100)  # Convert to paise
    
    try:
        razorpay_order = razorpay_client.order.create({
            "amount": amount,
            "currency": "INR",
            "receipt": f"sub_{user['id']}_{int(datetime.now().timestamp())}",
            "notes": {
                "user_id": user['id'],
                "plan": order_data.plan
            }
        })
        
        return {
            "order_id": razorpay_order['id'],
            "amount": plan['price'],
            "currency": "INR",
            "key_id": RAZORPAY_KEY_ID
        }
    except Exception as e:
        logging.error(f"Razorpay order creation failed: {str(e)}")
        raise HTTPException(500, f"Failed to create order: {str(e)}")

@api_router.post("/subscriptions/verify-payment")
async def verify_subscription_payment(payment_data: VerifyPaymentRequest, user: dict = Depends(get_current_user)):
    """Verify Razorpay payment and activate subscription"""
    if not razorpay_client:
        raise HTTPException(500, "Payment service not available")
    
    try:
        # Verify signature
        razorpay_client.utility.verify_payment_signature({
            'razorpay_order_id': payment_data.razorpay_order_id,
            'razorpay_payment_id': payment_data.razorpay_payment_id,
            'razorpay_signature': payment_data.razorpay_signature
        })
        
        # Get payment details
        payment = razorpay_client.payment.fetch(payment_data.razorpay_payment_id)
        
        if payment['status'] != 'captured':
            raise HTTPException(400, "Payment not completed")
        
        # Store payment record
        plan = SUBSCRIPTION_PLANS[payment_data.plan]
        payment_record = {
            "id": str(uuid.uuid4()),
            "user_id": user['id'],
            "amount": payment['amount'] / 100,  # Convert from paise
            "plan": payment_data.plan,
            "razorpay_order_id": payment_data.razorpay_order_id,
            "razorpay_payment_id": payment_data.razorpay_payment_id,
            "razorpay_signature": payment_data.razorpay_signature,
            "status": "success",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.payments.insert_one(payment_record)
        
        # Update user subscription
        start_date = datetime.now(timezone.utc)
        end_date = start_date + timedelta(days=plan['duration_days'])
        
        await db.users.update_one(
            {"id": user['id']},
            {"$set": {
                "subscription_status": "active",
                "subscription_plan": payment_data.plan,
                "subscription_start_date": start_date.isoformat(),
                "subscription_end_date": end_date.isoformat()
            }}
        )
        
        # Send confirmation email
        if RESEND_API_KEY:
            try:
                email_html = f"""
                <h2>Subscription Activated!</h2>
                <p>Hi {user['name']},</p>
                <p>Your {plan['name']} subscription has been activated successfully.</p>
                <p><strong>Plan:</strong> {plan['name']}</p>
                <p><strong>Amount:</strong> ₹{plan['price']}</p>
                <p><strong>Valid Until:</strong> {end_date.strftime('%B %d, %Y')}</p>
                <p>Thank you for subscribing to TradeLedger!</p>
                """
                params = {
                    "from": SENDER_EMAIL,
                    "to": [user['email']],
                    "subject": "Subscription Activated - TradeLedger",
                    "html": email_html
                }
                await asyncio.to_thread(resend.Emails.send, params)
            except Exception as e:
                logging.error(f"Failed to send confirmation email: {str(e)}")
        
        return {
            "message": "Payment verified and subscription activated",
            "subscription_end_date": end_date.isoformat()
        }
        
    except razorpay.errors.SignatureVerificationError:
        raise HTTPException(400, "Invalid payment signature")
    except Exception as e:
        logging.error(f"Payment verification failed: {str(e)}")
        raise HTTPException(500, f"Payment verification failed: {str(e)}")

# ============ MT5 MANAGEMENT APIs (ADMIN) ============

@admin_router.patch("/mt5/{account_id}/extend")
async def extend_mt5_account(account_id: str, extend_data: ExtendSubscriptionRequest, admin: dict = Depends(get_admin_user)):
    """Extend MT5 account expiry"""
    account = await db.mt5_accounts.find_one({"id": account_id}, {"_id": 0})
    if not account:
        raise HTTPException(404, "MT5 account not found")
    
    current_expiry = account.get('expiry_date')
    if current_expiry:
        if isinstance(current_expiry, str):
            current_expiry = datetime.fromisoformat(current_expiry.replace('Z', '+00:00'))
    else:
        current_expiry = datetime.now(timezone.utc)
    
    new_expiry = current_expiry + timedelta(days=extend_data.days)
    
    await db.mt5_accounts.update_one(
        {"id": account_id},
        {"$set": {"expiry_date": new_expiry.isoformat()}}
    )
    
    await create_audit_log(admin.get('sub'), 'mt5_extended', account.get('user_id'), 
                          {"account_id": account_id, "days": extend_data.days})
    return {"message": f"MT5 account extended by {extend_data.days} days"}

@admin_router.patch("/mt5/{account_id}/activate")
async def activate_mt5_account(account_id: str, admin: dict = Depends(get_admin_user)):
    """Activate MT5 account"""
    await db.mt5_accounts.update_one(
        {"id": account_id},
        {"$set": {"status": "active", "is_connected": True}}
    )
    return {"message": "MT5 account activated"}

@admin_router.patch("/mt5/{account_id}/deactivate")
async def deactivate_mt5_account(account_id: str, admin: dict = Depends(get_admin_user)):
    """Deactivate MT5 account"""
    await db.mt5_accounts.update_one(
        {"id": account_id},
        {"$set": {"status": "inactive", "is_connected": False}}
    )
    return {"message": "MT5 account deactivated"}

# ============ REFUND API (ADMIN) ============

@admin_router.post("/payments/{payment_id}/refund")
async def refund_payment(payment_id: str, refund_data: RefundRequest, admin: dict = Depends(get_admin_user)):
    """Issue refund for payment"""
    if not razorpay_client:
        raise HTTPException(500, "Payment service not available")
    
    payment_record = await db.payments.find_one({"razorpay_payment_id": payment_id}, {"_id": 0})
    if not payment_record:
        raise HTTPException(404, "Payment not found")
    
    try:
        refund = razorpay_client.payment.refund(payment_id, {
            "amount": int(payment_record['amount'] * 100),  # Full refund in paise
            "notes": {"reason": refund_data.reason or "Admin refund"}
        })
        
        # Update payment status
        await db.payments.update_one(
            {"razorpay_payment_id": payment_id},
            {"$set": {"status": "refunded", "refund_id": refund['id']}}
        )
        
        # Deactivate subscription
        await db.users.update_one(
            {"id": payment_record['user_id']},
            {"$set": {"subscription_status": "expired"}}
        )
        
        await create_audit_log(admin.get('sub'), 'payment_refunded', payment_record['user_id'],
                              {"payment_id": payment_id, "amount": payment_record['amount']})
        
        return {"message": "Refund issued successfully", "refund_id": refund['id']}
    except Exception as e:
        logging.error(f"Refund failed: {str(e)}")
        raise HTTPException(500, f"Refund failed: {str(e)}")

# ============ UPDATE REGISTRATION TO ASSIGN TRIAL ============
# Modify the existing @api_router.post("/auth/register") endpoint
# Add this after creating the user:

# await assign_trial(user_id)  # Moved to server.py inline

# ============ AUTO-EXPIRY CRON JOB ============

import asyncio
from apscheduler.schedulers.asyncio import AsyncIOScheduler

scheduler = AsyncIOScheduler()

async def daily_subscription_check():
    """Run daily to expire subscriptions"""
    try:
        count = await expire_subscriptions()
        logging.info(f"Expired {count} subscriptions")
    except Exception as e:
        logging.error(f"Subscription check failed: {str(e)}")

# Schedule to run daily at midnight
scheduler.add_job(daily_subscription_check, 'cron', hour=0, minute=0)

@app.on_event("startup")
async def start_scheduler():
    scheduler.start()
    logging.info("Subscription scheduler started")

@app.on_event("shutdown")
async def shutdown_scheduler():
    scheduler.shutdown()
