"""
Referral System Service
Handles referral tracking, XP wallet, and rewards
"""
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
from typing import Optional, Dict, Any
import uuid
import logging
import secrets
import string

class ReferralService:
    def __init__(self, db):
        self.db = db
        self.users = db.users
        self.referrals = db.referrals
        self.xp_transactions = db.xp_transactions
        
    def generate_referral_code(self, length=6) -> str:
        """Generate unique referral code (uppercase alphanumeric)"""
        characters = string.ascii_uppercase + string.digits
        # Avoid confusing characters
        characters = characters.replace('O', '').replace('0', '').replace('I', '').replace('1', '')
        return ''.join(secrets.choice(characters) for _ in range(length))
    
    async def create_or_get_referral_code(self, user_id: str) -> str:
        """Get existing referral code or create new one"""
        user = await self.users.find_one({"id": user_id})
        
        if user and user.get('referral_code'):
            return user['referral_code']
        
        # Generate unique code
        max_attempts = 10
        for _ in range(max_attempts):
            code = self.generate_referral_code()
            existing = await self.users.find_one({"referral_code": code})
            if not existing:
                # Assign code to user
                await self.users.update_one(
                    {"id": user_id},
                    {"$set": {"referral_code": code}}
                )
                return code
        
        raise Exception("Failed to generate unique referral code")
    
    async def track_signup_from_referral(self, new_user_id: str, referral_code: str) -> bool:
        """Track when someone signs up using a referral code"""
        # Find referrer by code
        referrer = await self.users.find_one({"referral_code": referral_code})
        if not referrer:
            logging.warning(f"Invalid referral code: {referral_code}")
            return False
        
        referrer_id = referrer['id']
        
        # Create referral record
        referral = {
            "id": str(uuid.uuid4()),
            "referrer_id": referrer_id,
            "referred_user_id": new_user_id,
            "status": "signed_up",  # Will change to 'paid' on successful payment
            "reward_applied": False,
            "xp_given": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await self.referrals.insert_one(referral)
        
        # Store referred_by in user record
        await self.users.update_one(
            {"id": new_user_id},
            {"$set": {"referred_by": referrer_id}}
        )
        
        logging.info(f"Referral tracked: {referrer_id} -> {new_user_id}")
        return True
    
    async def process_successful_payment(self, user_id: str, plan: str, amount_paid: float, payment_id: str) -> Dict[str, Any]:
        """
        Process referral rewards after successful payment
        Args:
            user_id: The user who made the payment
            plan: Subscription plan type (monthly, quarterly, yearly)
            amount_paid: Base amount paid (before XP discount)
            payment_id: Razorpay payment ID
        Returns: {bonus_days: int, xp_earned_by_referrer: int}
        """
        result = {"bonus_days": 0, "xp_earned_by_referrer": 0}
        
        # Check if this user was referred
        referral = await self.referrals.find_one({
            "referred_user_id": user_id,
            "reward_applied": False
        })
        
        if not referral:
            logging.info(f"No pending referral found for user {user_id}")
            return result
        
        # Prevent duplicate processing
        if referral.get('xp_given'):
            logging.warning(f"Referral reward already processed for payment: {payment_id}")
            return result
        
        referrer_id = referral['referrer_id']
        
        try:
            # 1. Give referred user +15 days bonus
            bonus_days = 15
            result['bonus_days'] = bonus_days
            
            # Extend subscription by 15 days
            user = await self.users.find_one({"id": user_id})
            if user:
                from datetime import datetime as dt, timedelta
                current_end = user.get('subscription_end_date')
                if current_end:
                    if isinstance(current_end, str):
                        current_end = dt.fromisoformat(current_end.replace("Z", "+00:00"))
                    new_end = current_end + timedelta(days=bonus_days)
                    await self.users.update_one(
                        {"id": user_id},
                        {"$set": {"subscription_end_date": new_end.isoformat()}}
                    )
                    logging.info(f"Extended subscription for {user_id} by {bonus_days} days")
            
            # 2. Give referrer 100 XP
            xp_amount = 100
            await self.credit_xp(
                user_id=referrer_id,
                amount=xp_amount,
                reason="referral_reward",
                reference_id=referral['id']
            )
            result['xp_earned_by_referrer'] = xp_amount
            
            # 3. Mark referral as processed
            await self.referrals.update_one(
                {"id": referral['id']},
                {"$set": {
                    "status": "paid",
                    "reward_applied": True,
                    "xp_given": True,
                    "payment_id": payment_id,
                    "plan": plan,
                    "amount_paid": amount_paid,
                    "processed_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            logging.info(f"Referral rewards processed: {referrer_id} earned {xp_amount} XP, {user_id} got {bonus_days} days bonus")
            
        except Exception as e:
            logging.error(f"Failed to process referral rewards: {str(e)}", exc_info=True)
            
        return result
    
    async def credit_xp(self, user_id: str, amount: int, reason: str, reference_id: str = None):
        """Add XP to user's wallet"""
        # Update user XP balance
        await self.users.update_one(
            {"id": user_id},
            {
                "$inc": {"xp_balance": amount},
                "$set": {"xp_updated_at": datetime.now(timezone.utc).isoformat()}
            }
        )
        
        # Record transaction
        transaction = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "amount": amount,
            "type": "credit",
            "reason": reason,
            "reference_id": reference_id,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await self.xp_transactions.insert_one(transaction)
    
    async def debit_xp(self, user_id: str, amount: int, reason: str, reference_id: str = None) -> bool:
        """Deduct XP from user's wallet. Returns True if successful."""
        user = await self.users.find_one({"id": user_id})
        if not user:
            return False
        
        current_balance = user.get('xp_balance', 0)
        if current_balance < amount:
            logging.warning(f"Insufficient XP balance for user {user_id}: has {current_balance}, needs {amount}")
            return False
        
        # Update user XP balance
        await self.users.update_one(
            {"id": user_id},
            {
                "$inc": {"xp_balance": -amount},
                "$set": {"xp_updated_at": datetime.now(timezone.utc).isoformat()}
            }
        )
        
        # Record transaction
        transaction = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "amount": amount,
            "type": "debit",
            "reason": reason,
            "reference_id": reference_id,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await self.xp_transactions.insert_one(transaction)
        
        return True
    
    async def get_user_xp_balance(self, user_id: str) -> int:
        """Get user's current XP balance"""
        user = await self.users.find_one({"id": user_id}, {"xp_balance": 1})
        return user.get('xp_balance', 0) if user else 0
    
    async def get_referral_stats(self, user_id: str) -> Dict[str, Any]:
        """Get referral statistics for a user"""
        referrals = await self.referrals.find({"referrer_id": user_id}).to_list(None)
        
        total_signups = len(referrals)
        total_paid = len([r for r in referrals if r['status'] == 'paid'])
        total_xp_earned = total_paid * 100  # 100 XP per paid referral
        
        # Get list of referred users with details
        referred_users = []
        for ref in referrals:
            user = await self.users.find_one(
                {"id": ref['referred_user_id']},
                {"email": 1, "name": 1, "subscription_status": 1}
            )
            if user:
                referred_users.append({
                    "email": user.get('email', 'N/A'),
                    "name": user.get('name', 'Unknown'),
                    "status": ref['status'],
                    "signup_date": ref['created_at'],
                    "xp_earned": 100 if ref['status'] == 'paid' else 0
                })
        
        return {
            "total_signups": total_signups,
            "total_paid": total_paid,
            "total_xp_earned": total_xp_earned,
            "referred_users": referred_users
        }
    
    async def get_xp_transactions(self, user_id: str, limit: int = 50) -> list:
        """Get XP transaction history for a user"""
        transactions = await self.xp_transactions.find(
            {"user_id": user_id}
        ).sort("created_at", -1).limit(limit).to_list(limit)
        
        return [{
            "id": t['id'],
            "amount": t['amount'],
            "type": t['type'],
            "reason": t['reason'],
            "created_at": t['created_at']
        } for t in transactions]
