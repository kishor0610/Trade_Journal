"""
Referral and XP Wallet API Endpoints
Add these to server.py
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
import logging

# Import the referral service
# from referral_service import ReferralService

class ReferralCodeResponse(BaseModel):
    referral_code: str
    referral_link: str

class ReferralStatsResponse(BaseModel):
    total_signups: int
    total_paid: int
    total_xp_earned: int
    current_xp_balance: int
    referred_users: list

class XPRedemptionRequest(BaseModel):
    xp_amount: int
    plan_id: str

# Initialize referral service (add to server.py initialization)
# referral_service = ReferralService(db)

# ============ REFERRAL ENDPOINTS ============

def create_referral_endpoints(api_router, referral_service, get_current_user, FRONTEND_URL):
    """Create referral endpoints - call this in server.py"""
    
    @api_router.get("/referral/code", response_model=ReferralCodeResponse)
    async def get_referral_code(current_user: dict = Depends(get_current_user)):
        """Get or create user's referral code"""
        try:
            user_id = current_user['sub']
            code = await referral_service.create_or_get_referral_code(user_id)
            link = f"{FRONTEND_URL}/register?ref={code}"
            
            return {
                "referral_code": code,
                "referral_link": link
            }
        except Exception as e:
            logging.error(f"Failed to get referral code: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to generate referral code")
    
    @api_router.get("/referral/stats", response_model=ReferralStatsResponse)
    async def get_referral_stats(current_user: dict = Depends(get_current_user)):
        """Get user's referral statistics"""
        try:
            user_id = current_user['sub']
            stats = await referral_service.get_referral_stats(user_id)
            xp_balance = await referral_service.get_user_xp_balance(user_id)
            
            return {
                **stats,
                "current_xp_balance": xp_balance
            }
        except Exception as e:
            logging.error(f"Failed to get referral stats: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to fetch referral statistics")
    
    @api_router.get("/wallet/balance")
    async def get_xp_balance(current_user: dict = Depends(get_current_user)):
        """Get user's current XP balance"""
        try:
            user_id = current_user['sub']
            balance = await referral_service.get_user_xp_balance(user_id)
            return {"xp_balance": balance, "xp_value_inr": balance}  # 1 XP = ₹1
        except Exception as e:
            logging.error(f"Failed to get XP balance: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to fetch balance")
    
    @api_router.get("/wallet/transactions")
    async def get_xp_transactions(
        limit: int = 50,
        current_user: dict = Depends(get_current_user)
    ):
        """Get user's XP transaction history"""
        try:
            user_id = current_user['sub']
            transactions = await referral_service.get_xp_transactions(user_id, limit)
            return {"transactions": transactions}
        except Exception as e:
            logging.error(f"Failed to get transactions: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to fetch transactions")

# ============ ADMIN REFERRAL ENDPOINTS ============

def create_admin_referral_endpoints(admin_router, referral_service, db, get_admin_user):
    """Create admin referral endpoints - call this in server.py"""
    
    @admin_router.get("/referrals/overview")
    async def get_referrals_overview(admin: dict = Depends(get_admin_user)):
        """Get overview of all referrals"""
        try:
            total_referrals = await db.referrals.count_documents({})
            paid_referrals = await db.referrals.count_documents({"status": "paid"})
            total_xp_distributed = paid_referrals * 100
            
            return {
                "total_referrals": total_referrals,
                "paid_referrals": paid_referrals,
                "signup_only": total_referrals - paid_referrals,
                "total_xp_distributed": total_xp_distributed,
                "total_value_inr": total_xp_distributed
            }
        except Exception as e:
            logging.error(f"Failed to get referrals overview: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to fetch overview")
    
    @admin_router.get("/referrals/list")
    async def list_all_referrals(
        skip: int = 0,
        limit: int = 50,
        status: Optional[str] = None,
        admin: dict = Depends(get_admin_user)
    ):
        """List all referrals with pagination"""
        try:
            query = {}
            if status:
                query['status'] = status
            
            referrals = await db.referrals.find(query).skip(skip).limit(limit).to_list(limit)
            
            # Enrich with user data
            enriched = []
            for ref in referrals:
                referrer = await db.users.find_one(
                    {"id": ref['referrer_id']},
                    {"email": 1, "name": 1}
                )
                referred = await db.users.find_one(
                    {"id": ref['referred_user_id']},
                    {"email": 1, "name": 1, "subscription_status": 1}
                )
                
                enriched.append({
                    "id": ref['id'],
                    "referrer": {
                        "email": referrer.get('email') if referrer else 'N/A',
                        "name": referrer.get('name') if referrer else 'Unknown'
                    },
                    "referred": {
                        "email": referred.get('email') if referred else 'N/A',
                        "name": referred.get('name') if referred else 'Unknown',
                        "subscription_status": referred.get('subscription_status') if referred else 'N/A'
                    },
                    "status": ref['status'],
                    "xp_given": ref.get('xp_given', False),
                    "created_at": ref['created_at']
                })
            
            total = await db.referrals.count_documents(query)
            
            return {
                "referrals": enriched,
                "total": total,
                "page": skip // limit + 1,
                "pages": (total + limit - 1) // limit
            }
        except Exception as e:
            logging.error(f"Failed to list referrals: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to fetch referrals")
    
    @admin_router.get("/referrals/user/{user_id}")
    async def get_user_referrals(
        user_id: str,
        admin: dict = Depends(get_admin_user)
    ):
        """Get referral details for specific user"""
        try:
            user = await db.users.find_one({"id": user_id})
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            
            stats = await referral_service.get_referral_stats(user_id)
            xp_balance = await referral_service.get_user_xp_balance(user_id)
            transactions = await referral_service.get_xp_transactions(user_id, limit=100)
            
            return {
                "user": {
                    "email": user.get('email'),
                    "name": user.get('name'),
                    "referral_code": user.get('referral_code')
                },
                "stats": stats,
                "xp_balance": xp_balance,
                "recent_transactions": transactions
            }
        except HTTPException:
            raise
        except Exception as e:
            logging.error(f"Failed to get user referrals: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to fetch user referrals")
    
    @admin_router.get("/wallet/transactions/all")
    async def get_all_xp_transactions(
        skip: int = 0,
        limit: int = 100,
        admin: dict = Depends(get_admin_user)
    ):
        """Get all XP transactions across all users"""
        try:
            transactions = await db.xp_transactions.find().skip(skip).limit(limit).sort("created_at", -1).to_list(limit)
            
            # Enrich with user data
            enriched = []
            for txn in transactions:
                user = await db.users.find_one(
                    {"id": txn['user_id']},
                    {"email": 1, "name": 1}
                )
                enriched.append({
                    "id": txn['id'],
                    "user": {
                        "email": user.get('email') if user else 'N/A',
                        "name": user.get('name') if user else 'Unknown'
                    },
                    "amount": txn['amount'],
                    "type": txn['type'],
                    "reason": txn['reason'],
                    "created_at": txn['created_at']
                })
            
            total = await db.xp_transactions.count_documents({})
            
            return {
                "transactions": enriched,
                "total": total,
                "page": skip // limit + 1
            }
        except Exception as e:
            logging.error(f"Failed to get XP transactions: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to fetch transactions")
    
    @admin_router.post("/wallet/credit/{user_id}")
    async def admin_credit_xp(
        user_id: str,
        amount: int,
        reason: Optional[str] = "admin_credit",
        admin: dict = Depends(get_admin_user)
    ):
        """Admin credits XP to user (manual reward)"""
        try:
            if amount <= 0:
                raise HTTPException(status_code=400, detail="Amount must be positive")
            
            user = await db.users.find_one({"id": user_id})
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            
            await referral_service.credit_xp(
                user_id=user_id,
                amount=amount,
                reason=f"admin_credit: {reason}",
                reference_id=admin.get('sub')
            )
            
            new_balance = await referral_service.get_user_xp_balance(user_id)
            
            return {
                "message": f"Credited {amount} XP to user",
                "new_balance": new_balance
            }
        except HTTPException:
            raise
        except Exception as e:
            logging.error(f"Failed to credit XP: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to credit XP")
