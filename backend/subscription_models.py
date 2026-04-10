"""
Subscription and Payment Models for TradeLedger
"""
from pydantic import BaseModel, EmailStr
from typing import Optional, Literal
from datetime import datetime

# Subscription Plans
SUBSCRIPTION_PLANS = {
    "monthly": {"price": 499, "duration_days": 30, "name": "Monthly Plan"},
    "quarterly": {"price": 1399, "duration_days": 90, "name": "Quarterly Plan"},
    "yearly": {"price": 5999, "duration_days": 365, "name": "Yearly Plan", "discount": "50%"}
}

# Pydantic Models
class SubscriptionCreate(BaseModel):
    plan: Literal["monthly", "quarterly", "yearly"]

class SubscriptionResponse(BaseModel):
    user_id: str
    plan: str
    status: str
    start_date: str
    end_date: str
    amount: float

class PaymentCreate(BaseModel):
    plan: Literal["monthly", "quarterly", "yearly"]
    amount: float

class PaymentVerify(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str

class UserStatusUpdate(BaseModel):
    status: Literal["active", "inactive"]

class SendEmailRequest(BaseModel):
    subject: str
    message: str

class ExtendSubscriptionRequest(BaseModel):
    days: int

class ChangePlanRequest(BaseModel):
    plan: Literal["monthly", "quarterly", "yearly"]
