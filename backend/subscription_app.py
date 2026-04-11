import logging
import os
import uuid
from datetime import datetime, timedelta, timezone

import razorpay
from fastapi import Depends, HTTPException
from pydantic import BaseModel

import server

app = server.app

RAZORPAY_KEY_ID = os.environ.get("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET", "")

SUBSCRIPTION_PLANS = {
    "monthly": {"price": 499, "duration_days": 30, "name": "Monthly Plan"},
    "quarterly": {"price": 1399, "duration_days": 90, "name": "Quarterly Plan"},
    "yearly": {"price": 5999, "duration_days": 365, "name": "Yearly Plan", "discount": "50%"},
}

try:
    razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET)) if RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET else None
except Exception as exc:
    logging.error("Failed to initialize Razorpay client: %s", exc)
    razorpay_client = None


class CreateOrderRequest(BaseModel):
    plan: str


class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    plan: str


async def check_subscription_status(user: dict) -> bool:
    if user.get("subscription_status") != "active":
        return False

    end_date = user.get("subscription_end_date")
    if not end_date:
        return False

    if isinstance(end_date, str):
        end_date = datetime.fromisoformat(end_date.replace("Z", "+00:00"))

    return end_date > datetime.now(timezone.utc)


@app.get("/api/subscriptions/plans")
async def get_subscription_plans():
    plans = []
    for plan_id, plan_data in SUBSCRIPTION_PLANS.items():
        plans.append(
            {
                "plan_id": plan_id,
                "name": plan_data["name"],
                "price": plan_data["price"],
                "duration_days": plan_data["duration_days"],
                "discount": plan_data.get("discount"),
            }
        )
    return {"plans": plans}


@app.get("/api/subscriptions/my-subscription")
async def get_my_subscription(current_user: dict = Depends(server.get_current_user)):
    return {
        "user_id": current_user["id"],
        "subscription_status": current_user.get("subscription_status", "expired"),
        "subscription_plan": current_user.get("subscription_plan"),
        "subscription_start_date": current_user.get("subscription_start_date"),
        "subscription_end_date": current_user.get("subscription_end_date"),
        "is_active": await check_subscription_status(current_user),
    }


@app.post("/api/subscriptions/create-order")
async def create_subscription_order(order_data: CreateOrderRequest, current_user: dict = Depends(server.get_current_user)):
    if order_data.plan not in SUBSCRIPTION_PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan")

    if not razorpay_client:
        raise HTTPException(status_code=500, detail="Payment service not available")

    plan = SUBSCRIPTION_PLANS[order_data.plan]
    amount_paise = int(plan["price"] * 100)

    try:
        order = razorpay_client.order.create(
            {
                "amount": amount_paise,
                "currency": "INR",
                "receipt": f"sub_{current_user['id']}_{int(datetime.now().timestamp())}",
                "notes": {
                    "user_id": current_user["id"],
                    "plan": order_data.plan,
                },
            }
        )
    except Exception as exc:
        logging.error("Razorpay order creation failed: %s", exc)
        raise HTTPException(status_code=500, detail=f"Failed to create order: {exc}") from exc

    return {
        "order_id": order["id"],
        "amount": plan["price"],
        "amount_paise": amount_paise,
        "currency": "INR",
        "key_id": RAZORPAY_KEY_ID,
        "plan": order_data.plan,
        "plan_name": plan["name"],
    }


@app.post("/api/subscriptions/verify-payment")
async def verify_subscription_payment(payment_data: VerifyPaymentRequest, current_user: dict = Depends(server.get_current_user)):
    if payment_data.plan not in SUBSCRIPTION_PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan")

    if not razorpay_client:
        raise HTTPException(status_code=500, detail="Payment service not available")

    plan = SUBSCRIPTION_PLANS[payment_data.plan]

    try:
        razorpay_client.utility.verify_payment_signature(
            {
                "razorpay_order_id": payment_data.razorpay_order_id,
                "razorpay_payment_id": payment_data.razorpay_payment_id,
                "razorpay_signature": payment_data.razorpay_signature,
            }
        )

        payment = razorpay_client.payment.fetch(payment_data.razorpay_payment_id)
        if payment["status"] == "authorized":
            payment = razorpay_client.payment.capture(
                payment_data.razorpay_payment_id,
                int(plan["price"] * 100),
                "INR",
            )

        if payment["status"] != "captured":
            raise HTTPException(status_code=400, detail="Payment not completed")

        start_date = datetime.now(timezone.utc)
        end_date = start_date + timedelta(days=plan["duration_days"])

        await server.db.payments.insert_one(
            {
                "id": str(uuid.uuid4()),
                "user_id": current_user["id"],
                "amount": payment["amount"] / 100,
                "plan": payment_data.plan,
                "status": "success",
                "razorpay_order_id": payment_data.razorpay_order_id,
                "razorpay_payment_id": payment_data.razorpay_payment_id,
                "razorpay_signature": payment_data.razorpay_signature,
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
    except razorpay.errors.SignatureVerificationError as exc:
        raise HTTPException(status_code=400, detail="Invalid payment signature") from exc
    except HTTPException:
        raise
    except Exception as exc:
        logging.error("Payment verification failed: %s", exc)
        raise HTTPException(status_code=500, detail=f"Payment verification failed: {exc}") from exc

    return {
        "message": "Payment verified and subscription activated",
        "subscription_end_date": end_date.isoformat(),
    }
