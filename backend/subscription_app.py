import logging
import os
import uuid
import hashlib
import hmac
from datetime import datetime, timedelta, timezone
from typing import Optional

import httpx
from fastapi import Depends, HTTPException
from pydantic import BaseModel

import server

app = server.app

SUBSCRIPTION_PLANS = {
    "monthly": {"price": 499, "duration_days": 30, "name": "Monthly Plan"},
    "quarterly": {"price": 1399, "duration_days": 90, "name": "Quarterly Plan"},
    "yearly": {"price": 2999, "duration_days": 365, "name": "Yearly Plan", "discount": "50%"},
}


def get_razorpay_credentials() -> tuple[str, str]:
    # Support both canonical names and legacy aliases used in some deployments.
    key_id = (os.environ.get("RAZORPAY_KEY_ID") or os.environ.get("KEY_ID") or "").strip()
    key_secret = (os.environ.get("RAZORPAY_KEY_SECRET") or os.environ.get("KEY_SECRET") or "").strip()
    return key_id, key_secret


def validate_razorpay_credentials() -> tuple[Optional[tuple[str, str]], str]:
    key_id, key_secret = get_razorpay_credentials()
    if not key_id or not key_secret:
        return None, "Razorpay checkout is not configured on the backend. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET env vars and redeploy."
    return (key_id, key_secret), ""


async def create_razorpay_order(key_id: str, key_secret: str, amount_paise: int, user_id: str, plan_id: str) -> dict:
    # Razorpay receipt must be <= 40 chars. Keep it deterministic and compact.
    compact_user = hashlib.sha1(user_id.encode("utf-8")).hexdigest()[:8]
    compact_plan = (plan_id or "p")[:1]
    compact_ts = format(int(datetime.now().timestamp()), "x")
    receipt = f"sub{compact_plan}{compact_ts}{compact_user}"

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            "https://api.razorpay.com/v1/orders",
            auth=(key_id, key_secret),
            json={
                "amount": amount_paise,
                "currency": "INR",
                "receipt": receipt,
                "notes": {
                    "user_id": user_id,
                    "plan": plan_id,
                },
            },
        )

    if response.status_code >= 400:
        error_message = response.text
        try:
            payload = response.json()
            if isinstance(payload, dict):
                error_obj = payload.get("error")
                if isinstance(error_obj, dict):
                    error_message = (
                        error_obj.get("description")
                        or error_obj.get("reason")
                        or error_obj.get("code")
                        or response.text
                    )
        except ValueError:
            pass

        logging.error("Razorpay order creation failed (status=%s): %s", response.status_code, error_message)
        if response.status_code in (400, 401, 403):
            raise HTTPException(status_code=400, detail=f"Razorpay order creation failed: {error_message}")
        raise HTTPException(status_code=502, detail="Razorpay gateway error while creating order")

    return response.json()


def verify_razorpay_signature(order_id: str, payment_id: str, signature: str, key_secret: str) -> None:
    payload = f"{order_id}|{payment_id}".encode("utf-8")
    expected_signature = hmac.new(key_secret.encode("utf-8"), payload, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected_signature, signature):
        raise HTTPException(status_code=400, detail="Invalid payment signature")


async def fetch_razorpay_payment(key_id: str, key_secret: str, payment_id: str) -> dict:
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(
            f"https://api.razorpay.com/v1/payments/{payment_id}",
            auth=(key_id, key_secret),
        )

    if response.status_code >= 400:
        logging.error("Failed to fetch Razorpay payment %s: %s", payment_id, response.text)
        raise HTTPException(status_code=500, detail="Failed to fetch payment details from Razorpay")

    return response.json()


async def capture_razorpay_payment(key_id: str, key_secret: str, payment_id: str, amount_paise: int) -> dict:
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"https://api.razorpay.com/v1/payments/{payment_id}/capture",
            auth=(key_id, key_secret),
            data={
                "amount": amount_paise,
                "currency": "INR",
            },
        )

    if response.status_code >= 400:
        logging.error("Failed to capture Razorpay payment %s: %s", payment_id, response.text)
        raise HTTPException(status_code=500, detail="Failed to capture Razorpay payment")

    return response.json()


class CreateOrderRequest(BaseModel):
    plan: str


class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    plan: str


class ExtendSubscriptionRequest(BaseModel):
    days: int


class ChangePlanRequest(BaseModel):
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

    credentials, client_error = validate_razorpay_credentials()
    if not credentials:
        raise HTTPException(status_code=500, detail=client_error)

    plan = SUBSCRIPTION_PLANS[order_data.plan]
    amount_paise = int(plan["price"] * 100)
    key_id, key_secret = credentials

    try:
        order = await create_razorpay_order(key_id, key_secret, amount_paise, current_user["id"], order_data.plan)
    except HTTPException:
        raise
    except Exception as exc:
        logging.error("Razorpay order creation failed: %s", exc)
        raise HTTPException(status_code=500, detail=f"Failed to create order: {exc}") from exc

    return {
        "order_id": order["id"],
        "amount": plan["price"],
        "amount_paise": amount_paise,
        "currency": "INR",
        "key_id": key_id,
        "plan": order_data.plan,
        "plan_name": plan["name"],
    }


@app.post("/api/subscriptions/verify-payment")
async def verify_subscription_payment(payment_data: VerifyPaymentRequest, current_user: dict = Depends(server.get_current_user)):
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
                int(plan["price"] * 100),
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
    except HTTPException:
        raise
    except Exception as exc:
        logging.error("Payment verification failed: %s", exc)
        raise HTTPException(status_code=500, detail=f"Payment verification failed: {exc}") from exc

    return {
        "message": "Payment verified and subscription activated",
        "subscription_end_date": end_date.isoformat(),
    }


@app.patch("/api/admin/subscriptions/{user_id}/extend")
async def admin_extend_subscription(
    user_id: str,
    extend_data: ExtendSubscriptionRequest,
    admin: dict = Depends(server.get_admin_user),
):
    user = await server.db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    current_end = user.get("subscription_end_date")
    if current_end:
        if isinstance(current_end, str):
            current_end = datetime.fromisoformat(current_end.replace("Z", "+00:00"))
    else:
        current_end = datetime.now(timezone.utc)

    new_end = current_end + timedelta(days=extend_data.days)

    await server.db.users.update_one(
        {"id": user_id},
        {
            "$set": {
                "subscription_end_date": new_end.isoformat(),
                "subscription_status": "active",
            }
        },
    )

    await server.create_audit_log(admin.get("sub"), "subscription_extended", user_id, {"days": extend_data.days})
    return {"message": f"Subscription extended by {extend_data.days} days", "new_end_date": new_end.isoformat()}


@app.patch("/api/admin/subscriptions/{user_id}/change-plan")
async def admin_change_user_plan(
    user_id: str,
    plan_data: ChangePlanRequest,
    admin: dict = Depends(server.get_admin_user),
):
    if plan_data.plan not in SUBSCRIPTION_PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan")

    plan = SUBSCRIPTION_PLANS[plan_data.plan]
    new_end = datetime.now(timezone.utc) + timedelta(days=plan["duration_days"])

    result = await server.db.users.update_one(
        {"id": user_id},
        {
            "$set": {
                "subscription_plan": plan_data.plan,
                "subscription_end_date": new_end.isoformat(),
                "subscription_status": "active",
            }
        },
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    await server.create_audit_log(admin.get("sub"), "plan_changed", user_id, {"new_plan": plan_data.plan})
    return {"message": f"Plan changed to {plan_data.plan}", "new_end_date": new_end.isoformat()}


@app.post("/api/admin/subscriptions/{user_id}/activate")
async def admin_activate_subscription(user_id: str, admin: dict = Depends(server.get_admin_user)):
    result = await server.db.users.update_one(
        {"id": user_id},
        {"$set": {"subscription_status": "active"}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    await server.create_audit_log(admin.get("sub"), "subscription_activated", user_id)
    return {"message": "Subscription activated"}


@app.post("/api/admin/subscriptions/{user_id}/deactivate")
async def admin_deactivate_subscription(user_id: str, admin: dict = Depends(server.get_admin_user)):
    result = await server.db.users.update_one(
        {"id": user_id},
        {"$set": {"subscription_status": "expired"}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    await server.create_audit_log(admin.get("sub"), "subscription_deactivated", user_id)
    return {"message": "Subscription deactivated"}
