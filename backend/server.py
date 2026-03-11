from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Query, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
from openai import AsyncOpenAI
from fastapi.responses import StreamingResponse
import io
import csv
import asyncio
import secrets
import resend
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL') or os.environ.get('MONGODB_URI') or os.environ.get('DATABASE_URL')
if not mongo_url:
    raise RuntimeError('MongoDB connection URL is required. Set MONGO_URL, MONGODB_URI, or DATABASE_URL.')

client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'trade_ledger')]

# JWT Settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'trading_journal_secret')
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
JWT_EXPIRATION_HOURS = int(os.environ.get('JWT_EXPIRATION_HOURS', 24))

# Keys
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', '') or EMERGENT_LLM_KEY
OPENAI_BASE_URL = os.environ.get('OPENAI_BASE_URL', '')
AI_MODEL = os.environ.get('AI_MODEL', 'gpt-4o-mini')
METAAPI_TOKEN = os.environ.get('METAAPI_TOKEN', '')
RESEND_API_KEY = os.environ.get('RESEND_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
TWELVE_DATA_API_KEY = os.environ.get('TWELVE_DATA_API_KEY', '')

# Admin credentials
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'admin@tradeledger.com')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'TradeLedger@Admin2024')

# Frontend URL for password reset links
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000')

# Initialize Resend
if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

# Create the main app
app = FastAPI(title="TradeLedger API", version="2.0.0")

# Create routers
api_router = APIRouter(prefix="/api")
admin_router = APIRouter(prefix="/api/admin")

# Security
security = HTTPBearer()

# ============ MODELS ============

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class AdminTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    is_admin: bool = True

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class MT5AccountCreate(BaseModel):
    name: str
    login: str
    password: str
    server: str
    platform: str = "mt5"

class MT5AccountResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    name: str
    login: str
    server: str
    platform: str
    is_connected: bool = False
    last_sync: Optional[str] = None
    balance: Optional[float] = None
    equity: Optional[float] = None
    created_at: str

class TradeCreate(BaseModel):
    instrument: str
    position: str
    entry_price: float
    exit_price: Optional[float] = None
    quantity: float
    entry_date: str
    exit_date: Optional[str] = None
    notes: Optional[str] = ""
    status: str = "open"
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    commission: Optional[float] = 0
    swap: Optional[float] = 0
    mt5_ticket: Optional[str] = None
    mt5_account_id: Optional[str] = None

class TradeUpdate(BaseModel):
    instrument: Optional[str] = None
    position: Optional[str] = None
    entry_price: Optional[float] = None
    exit_price: Optional[float] = None
    quantity: Optional[float] = None
    entry_date: Optional[str] = None
    exit_date: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None

class TradeResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    instrument: str
    position: str
    entry_price: float
    exit_price: Optional[float] = None
    quantity: float
    entry_date: str
    exit_date: Optional[str] = None
    notes: str = ""
    status: str
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    commission: float = 0
    swap: float = 0
    pnl: Optional[float] = None
    pnl_percentage: Optional[float] = None
    mt5_ticket: Optional[str] = None
    mt5_account_id: Optional[str] = None
    created_at: str

class AIInsightRequest(BaseModel):
    question: Optional[str] = None


class CandleResponse(BaseModel):
    time: int
    open: float
    high: float
    low: float
    close: float
    volume: float


def build_rule_based_insight(total_trades: int, total_pnl: float, winning: int, losing: int) -> str:
    win_rate = (winning / total_trades * 100) if total_trades else 0
    tips = []

    if total_trades == 0:
        tips.append("No closed trades yet. Start by journaling at least 20 trades before evaluating strategy changes.")
        tips.append("Use fixed risk per trade (for example 0.5% to 1% of account) to keep early variance controlled.")
    else:
        if win_rate < 45:
            tips.append("Your win rate is low. Tighten entry criteria and avoid taking trades outside your setup checklist.")
        if total_pnl < 0:
            tips.append("You are net negative. Reduce position size for the next 10 trades and prioritize capital preservation.")
        if losing > winning:
            tips.append("Losing trades outnumber winners. Add a hard daily loss limit and stop after 2 to 3 consecutive losses.")
        if win_rate >= 50 and total_pnl > 0:
            tips.append("Performance is positive. Focus on consistency: keep risk fixed and avoid overtrading after winning streaks.")

        tips.append("Track R-multiple per trade and review weekly to identify whether exits or entries are the main bottleneck.")

    summary = (
        f"Trading snapshot: {total_trades} closed trades, win rate {win_rate:.1f}%, total P&L ${total_pnl:.2f}."
    )
    return summary + "\n\nActionable recommendations:\n- " + "\n- ".join(tips[:4])

# ============ AUTH HELPERS ============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(user_id: str, email: str, is_admin: bool = False) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    payload = {"sub": user_id, "email": email, "exp": expire, "is_admin": is_admin}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_admin_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        is_admin = payload.get("is_admin", False)
        if not is_admin:
            raise HTTPException(status_code=403, detail="Admin access required")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ============ PNL CALCULATION ============

# Contract size multipliers for different instruments
# This converts price difference to actual P&L in USD
INSTRUMENT_MULTIPLIERS = {
    # Commodities - Gold/Silver (price per oz, 100 oz per lot)
    'XAU/USD': 100,     # 1 lot = 100 oz, $1 move = $100/lot
    'XAUUSD': 100,
    'Gold': 100,
    'XAG/USD': 5000,    # 1 lot = 5000 oz, $1 move = $5000/lot
    'XAGUSD': 5000,
    'Silver': 5000,
    
    # Forex pairs - Standard lot = 100,000 units
    # For pairs with USD as quote: pip value = $10 per lot per pip (0.0001)
    # We use 10000 because price diff of 0.0001 * 10000 = $1 profit per lot
    'EUR/USD': 100000,
    'EURUSD': 100000,
    'GBP/USD': 100000,
    'GBPUSD': 100000,
    'AUD/USD': 100000,
    'AUDUSD': 100000,
    'NZD/USD': 100000,
    'NZDUSD': 100000,
    'USD/CAD': 100000,
    'USDCAD': 100000,
    'USD/CHF': 100000,
    'USDCHF': 100000,
    'USD/JPY': 1000,    # JPY pairs have different pip value
    'USDJPY': 1000,
    
    # Crypto - Usually 1:1 or varies
    'BTC/USD': 1,       # 1 contract = 1 BTC
    'BTCUSD': 1,
    'BTC': 1,
    'ETH/USD': 1,       # 1 contract = 1 ETH
    'ETHUSD': 1,
    'ETH': 1,
    
    # Indices - Point value per lot
    'NAS100': 1,        # $1 per point per lot
    'US30': 1,
    'SPX500': 1,
    'US500': 1,
    'Stocks': 1,
}

def get_instrument_multiplier(instrument: str) -> float:
    """Get the contract multiplier for an instrument"""
    # Check exact match first
    if instrument in INSTRUMENT_MULTIPLIERS:
        return INSTRUMENT_MULTIPLIERS[instrument]
    
    # Check partial matches (for variations like "GOLD", "gold", etc.)
    instrument_upper = instrument.upper()
    for key, value in INSTRUMENT_MULTIPLIERS.items():
        if key.upper() in instrument_upper or instrument_upper in key.upper():
            return value
    
    # Default to 1 for unknown instruments
    return 1

def calculate_pnl(trade: dict) -> dict:
    if trade.get('exit_price') and trade.get('status') == 'closed':
        entry = trade['entry_price']
        exit_p = trade['exit_price']
        qty = trade['quantity']  # This is lot size
        position = trade['position']
        commission = trade.get('commission', 0) or 0
        swap = trade.get('swap', 0) or 0
        instrument = trade.get('instrument', '')
        
        # Get the multiplier for this instrument
        multiplier = get_instrument_multiplier(instrument)
        
        # Calculate raw P&L based on position
        if position in ['long', 'buy']:
            raw_pnl = (exit_p - entry) * qty * multiplier
        else:  # short/sell
            raw_pnl = (entry - exit_p) * qty * multiplier
        
        # Subtract trading costs
        pnl = raw_pnl - commission - swap
        
        # Calculate percentage based on entry price
        pnl_percentage = ((exit_p - entry) / entry * 100) if position in ['long', 'buy'] else ((entry - exit_p) / entry * 100)
        
        trade['pnl'] = round(pnl, 2)
        trade['pnl_percentage'] = round(pnl_percentage, 2)
    else:
        trade['pnl'] = None
        trade['pnl_percentage'] = None
    return trade

# ============ AUTH ROUTES ============

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
        "created_at": now
    }
    
    await db.users.insert_one(user_doc)
    token = create_access_token(user_id, user_data.email)
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(id=user_id, email=user_data.email, name=user_data.name, created_at=now)
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(user_data: UserLogin):
    user = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if not user or not verify_password(user_data.password, user['password']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_access_token(user['id'], user['email'])
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(id=user['id'], email=user['email'], name=user['name'], created_at=user['created_at'])
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(**current_user)

# ============ FORGOT PASSWORD ============

@api_router.post("/auth/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    """Send password reset email"""
    user = await db.users.find_one({"email": request.email}, {"_id": 0})
    
    # Always return success to prevent email enumeration
    if not user:
        return {"message": "If this email exists, a reset link has been sent"}
    
    # Generate reset token
    reset_token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
    
    # Store reset token
    await db.password_resets.insert_one({
        "user_id": user['id'],
        "email": request.email,
        "token": reset_token,
        "expires_at": expires_at.isoformat(),
        "used": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Send email if Resend is configured
    if RESEND_API_KEY:
        reset_link = f"{FRONTEND_URL}/reset-password?token={reset_token}"
        
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #10B981;">TradeLedger Password Reset</h2>
            <p>Hi {user['name']},</p>
            <p>You requested to reset your password. Click the button below to create a new password:</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="{reset_link}" style="background-color: #10B981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                    Reset Password
                </a>
            </div>
            <p>Or copy this link: <a href="{reset_link}">{reset_link}</a></p>
            <p style="color: #666; font-size: 12px;">This link expires in 1 hour. If you didn't request this, please ignore this email.</p>
        </div>
        """
        
        try:
            params = {
                "from": SENDER_EMAIL,
                "to": [request.email],
                "subject": "Reset Your TradeLedger Password",
                "html": html_content
            }
            await asyncio.to_thread(resend.Emails.send, params)
        except Exception as e:
            logging.error(f"Failed to send reset email: {str(e)}")
    
    return {"message": "If this email exists, a reset link has been sent", "token": reset_token if not RESEND_API_KEY else None}

@api_router.post("/auth/reset-password")
async def reset_password(request: ResetPasswordRequest):
    """Reset password using token"""
    reset_doc = await db.password_resets.find_one({
        "token": request.token,
        "used": False
    }, {"_id": 0})
    
    if not reset_doc:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    # Check expiration
    expires_at = datetime.fromisoformat(reset_doc['expires_at'].replace('Z', '+00:00'))
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=400, detail="Reset token has expired")
    
    # Update password
    new_hashed = hash_password(request.new_password)
    await db.users.update_one(
        {"id": reset_doc['user_id']},
        {"$set": {"password": new_hashed}}
    )
    
    # Mark token as used
    await db.password_resets.update_one(
        {"token": request.token},
        {"$set": {"used": True}}
    )
    
    return {"message": "Password reset successfully"}

@api_router.get("/auth/verify-reset-token")
async def verify_reset_token(token: str):
    """Verify if reset token is valid"""
    reset_doc = await db.password_resets.find_one({
        "token": token,
        "used": False
    }, {"_id": 0})
    
    if not reset_doc:
        raise HTTPException(status_code=400, detail="Invalid reset token")
    
    expires_at = datetime.fromisoformat(reset_doc['expires_at'].replace('Z', '+00:00'))
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=400, detail="Reset token has expired")
    
    return {"valid": True, "email": reset_doc['email']}

# ============ ADMIN ROUTES ============

@admin_router.post("/login", response_model=AdminTokenResponse)
async def admin_login(user_data: UserLogin):
    """Admin login endpoint"""
    if user_data.email != ADMIN_EMAIL or user_data.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid admin credentials")
    
    token = create_access_token("admin", ADMIN_EMAIL, is_admin=True)
    return AdminTokenResponse(access_token=token)

@admin_router.get("/stats")
async def get_admin_stats(admin: dict = Depends(get_admin_user)):
    """Get overall platform statistics"""
    total_users = await db.users.count_documents({})
    total_trades = await db.trades.count_documents({})
    total_mt5_accounts = await db.mt5_accounts.count_documents({})
    
    # Get trades stats
    all_trades = await db.trades.find({"status": "closed"}, {"_id": 0}).to_list(100000)
    total_pnl = sum(calculate_pnl(t).get('pnl', 0) or 0 for t in all_trades)
    
    # Recent signups (last 7 days)
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    recent_users = await db.users.count_documents({"created_at": {"$gte": week_ago}})
    
    # Recent trades (last 7 days)
    recent_trades = await db.trades.count_documents({"created_at": {"$gte": week_ago}})
    
    return {
        "total_users": total_users,
        "total_trades": total_trades,
        "total_mt5_accounts": total_mt5_accounts,
        "total_pnl": round(total_pnl, 2),
        "recent_users_7d": recent_users,
        "recent_trades_7d": recent_trades
    }

@admin_router.get("/users")
async def get_all_users(
    skip: int = 0,
    limit: int = 50,
    admin: dict = Depends(get_admin_user)
):
    """Get all registered users"""
    users = await db.users.find({}, {"_id": 0, "password": 0}).skip(skip).limit(limit).sort("created_at", -1).to_list(limit)
    
    # Add trade count and P&L for each user
    enriched_users = []
    for user in users:
        trade_count = await db.trades.count_documents({"user_id": user['id']})
        trades = await db.trades.find({"user_id": user['id'], "status": "closed"}, {"_id": 0}).to_list(10000)
        total_pnl = sum(calculate_pnl(t).get('pnl', 0) or 0 for t in trades)
        
        enriched_users.append({
            **user,
            "trade_count": trade_count,
            "total_pnl": round(total_pnl, 2)
        })
    
    total = await db.users.count_documents({})
    return {"users": enriched_users, "total": total}

@admin_router.get("/users/{user_id}")
async def get_user_details(user_id: str, admin: dict = Depends(get_admin_user)):
    """Get detailed info about a specific user"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get user's trades
    trades = await db.trades.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    trades = [calculate_pnl(t) for t in trades]
    
    # Get user's MT5 accounts
    mt5_accounts = await db.mt5_accounts.find({"user_id": user_id}, {"_id": 0, "password": 0}).to_list(100)
    
    # Calculate stats
    closed_trades = [t for t in trades if t['status'] == 'closed']
    total_pnl = sum(t.get('pnl', 0) or 0 for t in closed_trades)
    winning = len([t for t in closed_trades if (t.get('pnl') or 0) > 0])
    losing = len([t for t in closed_trades if (t.get('pnl') or 0) < 0])
    
    return {
        "user": user,
        "trades": trades[:50],  # Last 50 trades
        "mt5_accounts": mt5_accounts,
        "stats": {
            "total_trades": len(trades),
            "closed_trades": len(closed_trades),
            "open_trades": len(trades) - len(closed_trades),
            "total_pnl": round(total_pnl, 2),
            "winning_trades": winning,
            "losing_trades": losing,
            "win_rate": round(winning / len(closed_trades) * 100, 2) if closed_trades else 0
        }
    }

@admin_router.get("/trades")
async def get_all_trades(
    skip: int = 0,
    limit: int = 100,
    admin: dict = Depends(get_admin_user)
):
    """Get all trades from all users"""
    trades = await db.trades.find({}, {"_id": 0}).skip(skip).limit(limit).sort("created_at", -1).to_list(limit)
    trades = [calculate_pnl(t) for t in trades]
    
    # Enrich with user info
    enriched_trades = []
    for trade in trades:
        user = await db.users.find_one({"id": trade['user_id']}, {"_id": 0, "name": 1, "email": 1})
        enriched_trades.append({
            **trade,
            "user_name": user.get('name') if user else 'Unknown',
            "user_email": user.get('email') if user else 'Unknown'
        })
    
    total = await db.trades.count_documents({})
    return {"trades": enriched_trades, "total": total}

@admin_router.get("/activity")
async def get_recent_activity(
    limit: int = 50,
    admin: dict = Depends(get_admin_user)
):
    """Get recent platform activity"""
    # Recent user registrations
    recent_users = await db.users.find({}, {"_id": 0, "password": 0}).sort("created_at", -1).limit(10).to_list(10)
    
    # Recent trades
    recent_trades = await db.trades.find({}, {"_id": 0}).sort("created_at", -1).limit(20).to_list(20)
    recent_trades = [calculate_pnl(t) for t in recent_trades]
    
    # Enrich trades with user info
    for trade in recent_trades:
        user = await db.users.find_one({"id": trade['user_id']}, {"_id": 0, "name": 1})
        trade['user_name'] = user.get('name') if user else 'Unknown'
    
    # Recent password resets
    recent_resets = await db.password_resets.find({}, {"_id": 0}).sort("created_at", -1).limit(10).to_list(10)
    
    return {
        "recent_users": recent_users,
        "recent_trades": recent_trades,
        "recent_password_resets": recent_resets
    }

@admin_router.delete("/users/{user_id}")
async def delete_user(user_id: str, admin: dict = Depends(get_admin_user)):
    """Delete a user and all their data"""
    # Check if user exists
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Delete user's trades
    await db.trades.delete_many({"user_id": user_id})
    
    # Delete user's MT5 accounts
    await db.mt5_accounts.delete_many({"user_id": user_id})
    
    # Delete user's password resets
    await db.password_resets.delete_many({"user_id": user_id})
    
    # Delete the user
    await db.users.delete_one({"id": user_id})
    
    return {"message": f"User {user['email']} and all associated data deleted successfully"}

@admin_router.get("/export/trades")
async def export_all_trades_csv(admin: dict = Depends(get_admin_user)):
    """Export all trades from all users as CSV"""
    trades = await db.trades.find({}, {"_id": 0}).sort("created_at", -1).to_list(100000)
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header row
    writer.writerow([
        'User ID', 'Instrument', 'Position', 'Status', 'Entry Price', 'Exit Price', 
        'Quantity', 'Entry Date', 'Exit Date', 'P&L', 'P&L %',
        'Stop Loss', 'Take Profit', 'Commission', 'Swap', 'Notes', 'Created At'
    ])
    
    # Data rows
    for trade in trades:
        trade = calculate_pnl(trade)
        writer.writerow([
            trade.get('user_id', ''),
            trade.get('instrument', ''),
            trade.get('position', ''),
            trade.get('status', ''),
            trade.get('entry_price', ''),
            trade.get('exit_price', ''),
            trade.get('quantity', ''),
            trade.get('entry_date', ''),
            trade.get('exit_date', ''),
            trade.get('pnl', ''),
            trade.get('pnl_percentage', ''),
            trade.get('stop_loss', ''),
            trade.get('take_profit', ''),
            trade.get('commission', ''),
            trade.get('swap', ''),
            trade.get('notes', ''),
            trade.get('created_at', '')
        ])
    
    output.seek(0)
    
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode('utf-8')),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=all_trades_export_{datetime.now().strftime('%Y%m%d')}.csv"}
    )

# ============ MT5 ACCOUNT ROUTES ============

@api_router.post("/mt5/accounts", response_model=MT5AccountResponse)
async def add_mt5_account(account_data: MT5AccountCreate, current_user: dict = Depends(get_current_user)):
    account_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    account_doc = {
        "id": account_id,
        "user_id": current_user['id'],
        "name": account_data.name,
        "login": account_data.login,
        "password": account_data.password,
        "server": account_data.server,
        "platform": account_data.platform,
        "is_connected": False,
        "last_sync": None,
        "balance": None,
        "equity": None,
        "created_at": now
    }
    
    await db.mt5_accounts.insert_one(account_doc)
    
    del account_doc['password']
    if '_id' in account_doc:
        del account_doc['_id']
    
    return MT5AccountResponse(**account_doc)

@api_router.get("/mt5/accounts", response_model=List[MT5AccountResponse])
async def get_mt5_accounts(current_user: dict = Depends(get_current_user)):
    accounts = await db.mt5_accounts.find(
        {"user_id": current_user['id']},
        {"_id": 0, "password": 0}
    ).to_list(100)
    return [MT5AccountResponse(**acc) for acc in accounts]

@api_router.delete("/mt5/accounts/{account_id}")
async def delete_mt5_account(account_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.mt5_accounts.delete_one({"id": account_id, "user_id": current_user['id']})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Account not found")
    return {"message": "Account deleted successfully"}

@api_router.post("/mt5/accounts/{account_id}/sync")
async def sync_mt5_account(account_id: str, current_user: dict = Depends(get_current_user)):
    """Sync trades from MT5 account via MetaApi"""
    account = await db.mt5_accounts.find_one(
        {"id": account_id, "user_id": current_user['id']},
        {"_id": 0}
    )
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Check if MetaApi is configured
    if not METAAPI_TOKEN:
        await db.mt5_accounts.update_one(
            {"id": account_id},
            {"$set": {"last_sync": now}}
        )
        return {
            "message": "MetaApi not configured",
            "account_id": account_id,
            "last_sync": now,
            "note": "To enable live MT5 sync, add your MetaApi token to the backend configuration. Get a free token at https://metaapi.cloud"
        }
    
    # MetaApi sync logic would go here
    # For now, update the sync time and return info
    try:
        from metaapi_cloud_sdk import MetaApi
        
        meta_api = MetaApi(METAAPI_TOKEN)
        
        # This is a simplified flow - full implementation would:
        # 1. Create/get MetaApi account linked to user's MT5
        # 2. Deploy the account
        # 3. Fetch history deals/orders
        # 4. Import them as trades
        
        await db.mt5_accounts.update_one(
            {"id": account_id},
            {"$set": {"last_sync": now, "is_connected": True}}
        )
        
        return {
            "message": "Sync initiated",
            "account_id": account_id,
            "last_sync": now,
            "note": "MetaApi integration active. Full sync requires account provisioning."
        }
    except Exception as e:
        logging.error(f"MT5 sync error: {str(e)}")
        return {
            "message": "Sync failed",
            "error": str(e),
            "note": "Check MetaApi configuration and account credentials"
        }

# ============ TRADE ROUTES ============

@api_router.post("/trades", response_model=TradeResponse)
async def create_trade(trade_data: TradeCreate, current_user: dict = Depends(get_current_user)):
    trade_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    trade_doc = {
        "id": trade_id,
        "user_id": current_user['id'],
        **trade_data.model_dump(),
        "created_at": now
    }
    
    trade_doc = calculate_pnl(trade_doc)
    await db.trades.insert_one(trade_doc)
    
    if '_id' in trade_doc:
        del trade_doc['_id']
    return TradeResponse(**trade_doc)

@api_router.get("/trades", response_model=List[TradeResponse])
async def get_trades(
    status: Optional[str] = None,
    instrument: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {"user_id": current_user['id']}
    if status:
        query["status"] = status
    if instrument:
        query["instrument"] = instrument
    if start_date:
        query["entry_date"] = {"$gte": start_date}
    if end_date:
        query.setdefault("entry_date", {})["$lte"] = end_date
    
    trades = await db.trades.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [TradeResponse(**calculate_pnl(t)) for t in trades]

@api_router.get("/trades/{trade_id}", response_model=TradeResponse)
async def get_trade(trade_id: str, current_user: dict = Depends(get_current_user)):
    trade = await db.trades.find_one({"id": trade_id, "user_id": current_user['id']}, {"_id": 0})
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    return TradeResponse(**calculate_pnl(trade))

@api_router.put("/trades/{trade_id}", response_model=TradeResponse)
async def update_trade(trade_id: str, trade_data: TradeUpdate, current_user: dict = Depends(get_current_user)):
    existing = await db.trades.find_one({"id": trade_id, "user_id": current_user['id']}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Trade not found")
    
    update_dict = {k: v for k, v in trade_data.model_dump().items() if v is not None}
    if update_dict:
        await db.trades.update_one({"id": trade_id}, {"$set": update_dict})
    
    updated = await db.trades.find_one({"id": trade_id}, {"_id": 0})
    return TradeResponse(**calculate_pnl(updated))

@api_router.delete("/trades/{trade_id}")
async def delete_trade(trade_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.trades.delete_one({"id": trade_id, "user_id": current_user['id']})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Trade not found")
    return {"message": "Trade deleted successfully"}

@api_router.delete("/trades")
async def delete_all_trades(current_user: dict = Depends(get_current_user)):
    """Delete all trades for the current user"""
    result = await db.trades.delete_many({"user_id": current_user['id']})
    return {
        "message": f"Successfully deleted {result.deleted_count} trades",
        "deleted_count": result.deleted_count
    }

# ============ ANALYTICS ROUTES ============

@api_router.get("/analytics/summary")
async def get_analytics_summary(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {"user_id": current_user['id'], "status": "closed"}
    if start_date:
        query["exit_date"] = {"$gte": start_date}
    if end_date:
        query.setdefault("exit_date", {})["$lte"] = end_date
    
    trades = await db.trades.find(query, {"_id": 0}).to_list(10000)
    
    total_trades = len(trades)
    winning_trades = 0
    losing_trades = 0
    total_pnl = 0
    total_wins = 0
    total_losses = 0
    
    for trade in trades:
        trade = calculate_pnl(trade)
        if trade.get('pnl') is not None:
            total_pnl += trade['pnl']
            if trade['pnl'] > 0:
                winning_trades += 1
                total_wins += trade['pnl']
            elif trade['pnl'] < 0:
                losing_trades += 1
                total_losses += abs(trade['pnl'])
    
    win_rate = (winning_trades / total_trades * 100) if total_trades > 0 else 0
    avg_win = total_wins / winning_trades if winning_trades > 0 else 0
    avg_loss = total_losses / losing_trades if losing_trades > 0 else 0
    avg_win_loss_ratio = avg_win / avg_loss if avg_loss > 0 else 0
    
    open_trades = await db.trades.count_documents({"user_id": current_user['id'], "status": "open"})
    
    daily_stats = {}
    for trade in trades:
        if trade.get('exit_date'):
            day = trade['exit_date'][:10]
            if day not in daily_stats:
                daily_stats[day] = {"wins": 0, "losses": 0, "pnl": 0}
            trade = calculate_pnl(trade)
            if trade.get('pnl'):
                daily_stats[day]['pnl'] += trade['pnl']
                if trade['pnl'] > 0:
                    daily_stats[day]['wins'] += 1
                else:
                    daily_stats[day]['losses'] += 1
    
    winning_days = sum(1 for d in daily_stats.values() if d['pnl'] > 0)
    total_days = len(daily_stats)
    daily_win_rate = (winning_days / total_days * 100) if total_days > 0 else 0
    
    day_wins_total = sum(d['pnl'] for d in daily_stats.values() if d['pnl'] > 0)
    day_losses_total = abs(sum(d['pnl'] for d in daily_stats.values() if d['pnl'] < 0))
    day_win_loss_ratio = day_wins_total / day_losses_total if day_losses_total > 0 else 0
    
    sorted_days = sorted(daily_stats.keys())
    current_win_streak = 0
    max_win_streak = 0
    current_trade_streak = 0
    max_trade_streak = 0
    
    for day in sorted_days:
        if daily_stats[day]['pnl'] > 0:
            current_win_streak += 1
            max_win_streak = max(max_win_streak, current_win_streak)
        else:
            current_win_streak = 0
    
    all_trades_sorted = sorted([t for t in trades if t.get('exit_date')], key=lambda x: x['exit_date'])
    for trade in all_trades_sorted:
        trade = calculate_pnl(trade)
        if trade.get('pnl', 0) > 0:
            current_trade_streak += 1
            max_trade_streak = max(max_trade_streak, current_trade_streak)
        else:
            current_trade_streak = 0
    
    return {
        "total_trades": total_trades,
        "open_trades": open_trades,
        "winning_trades": winning_trades,
        "losing_trades": losing_trades,
        "win_rate": round(win_rate, 2),
        "total_pnl": round(total_pnl, 2),
        "avg_win": round(avg_win, 2),
        "avg_loss": round(avg_loss, 2),
        "avg_win_loss_ratio": round(avg_win_loss_ratio, 2),
        "daily_win_rate": round(daily_win_rate, 2),
        "day_win_loss_ratio": round(day_win_loss_ratio, 2),
        "trading_days": total_days,
        "winning_days": winning_days,
        "win_streak_days": max_win_streak,
        "win_streak_trades": max_trade_streak,
        "current_win_streak_days": current_win_streak,
        "current_win_streak_trades": current_trade_streak
    }

@api_router.get("/analytics/by-instrument")
async def get_analytics_by_instrument(current_user: dict = Depends(get_current_user)):
    trades = await db.trades.find({"user_id": current_user['id'], "status": "closed"}, {"_id": 0}).to_list(10000)
    
    instrument_stats = {}
    for trade in trades:
        trade = calculate_pnl(trade)
        instrument = trade['instrument']
        
        if instrument not in instrument_stats:
            instrument_stats[instrument] = {
                "instrument": instrument,
                "total_trades": 0,
                "winning_trades": 0,
                "losing_trades": 0,
                "total_pnl": 0,
                "total_volume": 0
            }
        
        instrument_stats[instrument]['total_trades'] += 1
        instrument_stats[instrument]['total_volume'] += trade.get('quantity', 0)
        if trade.get('pnl') is not None:
            instrument_stats[instrument]['total_pnl'] += trade['pnl']
            if trade['pnl'] > 0:
                instrument_stats[instrument]['winning_trades'] += 1
            else:
                instrument_stats[instrument]['losing_trades'] += 1
    
    result = []
    for inst, stats in instrument_stats.items():
        stats['total_pnl'] = round(stats['total_pnl'], 2)
        stats['win_rate'] = round(stats['winning_trades'] / stats['total_trades'] * 100, 2) if stats['total_trades'] > 0 else 0
        result.append(stats)
    
    return sorted(result, key=lambda x: x['total_pnl'], reverse=True)

@api_router.get("/analytics/monthly")
async def get_monthly_analytics(current_user: dict = Depends(get_current_user)):
    trades = await db.trades.find({"user_id": current_user['id'], "status": "closed"}, {"_id": 0}).to_list(10000)
    
    monthly_stats = {}
    for trade in trades:
        trade = calculate_pnl(trade)
        if trade.get('exit_date'):
            month = trade['exit_date'][:7]
            if month not in monthly_stats:
                monthly_stats[month] = {"month": month, "pnl": 0, "trades": 0, "wins": 0}
            
            monthly_stats[month]['trades'] += 1
            if trade.get('pnl') is not None:
                monthly_stats[month]['pnl'] += trade['pnl']
                if trade['pnl'] > 0:
                    monthly_stats[month]['wins'] += 1
    
    result = sorted(monthly_stats.values(), key=lambda x: x['month'])
    for r in result:
        r['pnl'] = round(r['pnl'], 2)
        r['win_rate'] = round(r['wins'] / r['trades'] * 100, 2) if r['trades'] > 0 else 0
    
    return result

@api_router.get("/analytics/daily")
async def get_daily_analytics(
    year: int = Query(default=None),
    month: int = Query(default=None),
    current_user: dict = Depends(get_current_user)
):
    now = datetime.now(timezone.utc)
    year = year or now.year
    month = month or now.month
    
    start_date = f"{year}-{month:02d}-01"
    if month == 12:
        end_date = f"{year + 1}-01-01"
    else:
        end_date = f"{year}-{month + 1:02d}-01"
    
    trades = await db.trades.find({
        "user_id": current_user['id'],
        "status": "closed",
        "exit_date": {"$gte": start_date, "$lt": end_date}
    }, {"_id": 0}).to_list(10000)
    
    daily_stats = {}
    total_trades = 0
    total_wins = 0
    total_pnl = 0
    
    for trade in trades:
        trade = calculate_pnl(trade)
        if trade.get('exit_date'):
            day = trade['exit_date'][:10]
            if day not in daily_stats:
                daily_stats[day] = {"date": day, "pnl": 0, "trades": 0, "wins": 0, "percentage": 0}
            
            daily_stats[day]['trades'] += 1
            total_trades += 1
            if trade.get('pnl') is not None:
                daily_stats[day]['pnl'] += trade['pnl']
                total_pnl += trade['pnl']
                if trade['pnl'] > 0:
                    daily_stats[day]['wins'] += 1
                    total_wins += 1
    
    result = sorted(daily_stats.values(), key=lambda x: x['date'])
    for r in result:
        r['pnl'] = round(r['pnl'], 2)
    
    return {
        "year": year,
        "month": month,
        "days": result,
        "summary": {
            "total_trades": total_trades,
            "total_wins": total_wins,
            "total_pnl": round(total_pnl, 2),
            "win_rate": round(total_wins / total_trades * 100, 2) if total_trades > 0 else 0
        }
    }

@api_router.get("/analytics/balance-history")
async def get_balance_history(
    period: str = Query(default="1M"),
    current_user: dict = Depends(get_current_user)
):
    now = datetime.now(timezone.utc)
    
    period_map = {
        "1D": timedelta(days=1),
        "1W": timedelta(weeks=1),
        "1M": timedelta(days=30),
        "6M": timedelta(days=180),
        "1Y": timedelta(days=365),
        "All": timedelta(days=3650)
    }
    
    start_date = (now - period_map.get(period, timedelta(days=30))).isoformat()[:10]
    
    trades = await db.trades.find({
        "user_id": current_user['id'],
        "status": "closed",
        "exit_date": {"$gte": start_date}
    }, {"_id": 0}).sort("exit_date", 1).to_list(10000)
    
    balance_history = []
    cumulative_pnl = 0
    
    for trade in trades:
        trade = calculate_pnl(trade)
        if trade.get('pnl') is not None and trade.get('exit_date'):
            cumulative_pnl += trade['pnl']
            balance_history.append({
                "date": trade['exit_date'][:10],
                "balance": round(cumulative_pnl, 2),
                "trade_pnl": round(trade['pnl'], 2)
            })
    
    return balance_history

@api_router.get("/analytics/trade-count")
async def get_trade_count_history(
    period: str = Query(default="1M"),
    current_user: dict = Depends(get_current_user)
):
    now = datetime.now(timezone.utc)
    
    period_map = {
        "1D": timedelta(days=1),
        "1W": timedelta(weeks=1),
        "1M": timedelta(days=30),
        "6M": timedelta(days=180),
        "1Y": timedelta(days=365),
        "All": timedelta(days=3650)
    }
    
    start_date = (now - period_map.get(period, timedelta(days=30))).isoformat()[:10]
    
    trades = await db.trades.find({
        "user_id": current_user['id'],
        "entry_date": {"$gte": start_date}
    }, {"_id": 0}).to_list(10000)
    
    daily_counts = {}
    for trade in trades:
        day = trade['entry_date'][:10]
        daily_counts[day] = daily_counts.get(day, 0) + 1
    
    result = sorted([{"date": k, "count": v} for k, v in daily_counts.items()], key=lambda x: x['date'])
    total_count = sum(d['count'] for d in result)
    
    return {"total": total_count, "data": result}


# ============ MARKET DATA ROUTES ============

@api_router.get("/market/candles", response_model=List[CandleResponse])
async def get_market_candles(
    symbol: str = Query(default="BTCUSDT"),
    interval: str = Query(default="5m"),
    limit: int = Query(default=500, ge=50, le=1000)
):
    """Fetch OHLCV candles from Twelve Data with Yahoo/Binance fallbacks."""
    interval_map = {
        "1m": "1min",
        "3m": "3min",
        "5m": "5min",
        "15m": "15min",
        "30m": "30min",
        "1h": "1h",
        "2h": "2h",
        "4h": "4h",
        "1d": "1day",
    }
    yahoo_interval_map = {
        "1m": "1m",
        "3m": "5m",
        "5m": "5m",
        "15m": "15m",
        "30m": "30m",
        "1h": "60m",
        "2h": "60m",
        "4h": "60m",
        "1d": "1d",
    }
    yahoo_range_map = {
        "1m": "7d",
        "3m": "30d",
        "5m": "30d",
        "15m": "60d",
        "30m": "60d",
        "1h": "730d",
        "2h": "730d",
        "4h": "730d",
        "1d": "10y",
    }
    if interval not in interval_map:
        raise HTTPException(status_code=400, detail="Unsupported interval")

    clean_symbol = symbol.upper().replace("/", "").replace("-", "")

    # Map local chart symbols to Twelve Data symbols.
    symbol_map = {
        "BTCUSDT": ["BTC/USD", "BTC/USDT"],
        "ETHUSDT": ["ETH/USD", "ETH/USDT"],
        "BNBUSDT": ["BNB/USD", "BNB/USDT"],
        "SOLUSDT": ["SOL/USD", "SOL/USDT"],
        "XAUUSD": ["XAU/USD", "XAUUSD", "XAU/USD:FX_IDC"],
        "XAGUSD": ["XAG/USD", "XAGUSD", "XAG/USD:FX_IDC"],
        "EURUSD": ["EUR/USD", "EURUSD", "EUR/USD:FX_IDC"],
        "GBPUSD": ["GBP/USD", "GBPUSD", "GBP/USD:FX_IDC"],
        "USDJPY": ["USD/JPY", "USDJPY", "USD/JPY:FX_IDC"],
        "AUDUSD": ["AUD/USD", "AUDUSD", "AUD/USD:FX_IDC"],
        "NAS100": ["NASDAQ", "NDX", "IXIC"],
        "US30": ["DJI", "US30"],
        "SPX500": ["SPX", "GSPC", "SPX500"],
    }
    market_symbol_candidates = symbol_map.get(clean_symbol, [symbol, clean_symbol])

    yahoo_symbol_map = {
        "XAUUSD": "GC=F",
        "XAGUSD": "SI=F",
        "EURUSD": "EURUSD=X",
        "GBPUSD": "GBPUSD=X",
        "USDJPY": "JPY=X",
        "AUDUSD": "AUDUSD=X",
        "NAS100": "^NDX",
        "US30": "^DJI",
        "SPX500": "^GSPC",
        "BTCUSDT": "BTC-USD",
        "ETHUSDT": "ETH-USD",
        "BNBUSDT": "BNB-USD",
        "SOLUSDT": "SOL-USD",
    }

    def parse_twelve_datetime(value: str) -> datetime:
        # Twelve Data can return either intraday datetime or date-only values.
        for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
            try:
                return datetime.strptime(value, fmt).replace(tzinfo=timezone.utc)
            except ValueError:
                continue
        raise ValueError(f"Unsupported Twelve Data datetime format: {value}")

    async def fetch_from_twelve_data() -> List[CandleResponse]:
        if not TWELVE_DATA_API_KEY:
            raise HTTPException(status_code=400, detail="TWELVE_DATA_API_KEY is not configured")

        url = "https://api.twelvedata.com/time_series"
        last_error = "No candle data available"

        async with httpx.AsyncClient(timeout=20.0) as client_http:
            for market_symbol in market_symbol_candidates:
                params = {
                    "symbol": market_symbol,
                    "interval": interval_map[interval],
                    "outputsize": limit,
                    "apikey": TWELVE_DATA_API_KEY,
                    "timezone": "UTC",
                }
                response = await client_http.get(url, params=params)
                if response.status_code != 200:
                    last_error = f"Twelve Data request failed for {market_symbol}"
                    continue

                payload = response.json()
                values = payload.get("values")
                if not isinstance(values, list) or len(values) == 0:
                    last_error = payload.get("message", f"No candle data for {market_symbol}")
                    continue

                candles: List[CandleResponse] = []
                for item in reversed(values):
                    dt_raw = item.get("datetime")
                    if not dt_raw:
                        continue

                    try:
                        dt = parse_twelve_datetime(dt_raw)
                    except ValueError:
                        continue

                    candles.append(
                        CandleResponse(
                            time=int(dt.timestamp() * 1000),
                            open=float(item["open"]),
                            high=float(item["high"]),
                            low=float(item["low"]),
                            close=float(item["close"]),
                            volume=float(item.get("volume") or 0),
                        )
                    )

                if candles:
                    return candles

                last_error = f"No valid candle data returned for {market_symbol}"

        raise HTTPException(status_code=400, detail=last_error)

    async def fetch_from_binance() -> List[CandleResponse]:
        url = "https://api.binance.com/api/v3/klines"
        async with httpx.AsyncClient(timeout=15.0) as client_http:
            response = await client_http.get(
                url,
                params={"symbol": clean_symbol, "interval": interval, "limit": limit},
            )

        if response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to fetch candles for symbol")

        raw = response.json()
        return [
            CandleResponse(
                time=int(item[0]),
                open=float(item[1]),
                high=float(item[2]),
                low=float(item[3]),
                close=float(item[4]),
                volume=float(item[5]),
            )
            for item in raw
        ]

    async def fetch_from_yahoo() -> List[CandleResponse]:
        yahoo_symbol = yahoo_symbol_map.get(clean_symbol)
        if not yahoo_symbol:
            raise HTTPException(status_code=400, detail=f"No Yahoo symbol mapping for {clean_symbol}")

        interval_value = yahoo_interval_map[interval]
        range_value = yahoo_range_map[interval]
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{yahoo_symbol}"

        async with httpx.AsyncClient(timeout=20.0) as client_http:
            response = await client_http.get(
                url,
                params={
                    "interval": interval_value,
                    "range": range_value,
                    "includePrePost": "false",
                    "events": "div,splits",
                },
            )

        if response.status_code != 200:
            raise HTTPException(status_code=400, detail=f"Yahoo request failed for {yahoo_symbol}")

        payload = response.json()
        chart = payload.get("chart", {})
        error = chart.get("error")
        if error:
            raise HTTPException(status_code=400, detail=f"Yahoo error: {error.get('description', 'Unknown error')}")

        result_list = chart.get("result") or []
        if not result_list:
            raise HTTPException(status_code=400, detail=f"No Yahoo data for {yahoo_symbol}")

        result = result_list[0]
        timestamps = result.get("timestamp") or []
        quote = ((result.get("indicators") or {}).get("quote") or [{}])[0]

        opens = quote.get("open") or []
        highs = quote.get("high") or []
        lows = quote.get("low") or []
        closes = quote.get("close") or []
        volumes = quote.get("volume") or []

        candles: List[CandleResponse] = []
        for idx, ts in enumerate(timestamps):
            if idx >= len(opens) or idx >= len(highs) or idx >= len(lows) or idx >= len(closes):
                continue

            o = opens[idx]
            h = highs[idx]
            l = lows[idx]
            c = closes[idx]
            v = volumes[idx] if idx < len(volumes) else 0

            if o is None or h is None or l is None or c is None:
                continue

            candles.append(
                CandleResponse(
                    time=int(ts) * 1000,
                    open=float(o),
                    high=float(h),
                    low=float(l),
                    close=float(c),
                    volume=float(v or 0),
                )
            )

        if not candles:
            raise HTTPException(status_code=400, detail=f"No valid Yahoo candles for {yahoo_symbol}")

        return candles[-limit:]

    try:
        return await fetch_from_twelve_data()
    except HTTPException as twelve_error:
        crypto_symbols = {"BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT"}
        provider_errors = [f"twelve:{twelve_error.detail}"]

        if clean_symbol in crypto_symbols:
            try:
                return await fetch_from_binance()
            except HTTPException as binance_error:
                provider_errors.append(f"binance:{binance_error.detail}")

        try:
            return await fetch_from_yahoo()
        except HTTPException as yahoo_error:
            provider_errors.append(f"yahoo:{yahoo_error.detail}")
            raise HTTPException(status_code=400, detail=" | ".join(provider_errors))
    except Exception as e:
        logging.error(f"Candle API error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch market candles")

# ============ AI INSIGHTS ============

@api_router.post("/ai/insights")
async def get_ai_insights(request: AIInsightRequest, current_user: dict = Depends(get_current_user)):
    trades = await db.trades.find({"user_id": current_user['id']}, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    closed_trades = [calculate_pnl(t) for t in trades if t['status'] == 'closed']
    total_pnl = sum(t.get('pnl', 0) or 0 for t in closed_trades)
    winning = len([t for t in closed_trades if t.get('pnl', 0) and t['pnl'] > 0])
    losing = len([t for t in closed_trades if t.get('pnl', 0) and t['pnl'] < 0])
    
    trades_summary = f"""
Trading Summary:
- Total closed trades: {len(closed_trades)}
- Total P&L: ${total_pnl:.2f}
- Winning trades: {winning}
- Losing trades: {losing}
- Win rate: {(winning/len(closed_trades)*100 if closed_trades else 0):.1f}%

Recent trades:
"""
    for t in closed_trades[:15]:
        trades_summary += f"- {t['instrument']} {t['position'].upper()}: Entry ${t['entry_price']}, Exit ${t.get('exit_price', 'N/A')}, P&L: ${t.get('pnl', 0):.2f}\n"
    
    user_question = request.question or "Analyze my trading performance and provide insights on how I can improve."
    
    prompt = f"""You are an expert trading analyst. Based on the following trading data, provide actionable insights.

{trades_summary}

User's question: {user_question}

Provide a concise, helpful analysis with specific recommendations."""

    if not OPENAI_API_KEY:
        fallback = build_rule_based_insight(len(closed_trades), total_pnl, winning, losing)
        return {
            "insight": fallback,
            "summary": {
                "total_trades": len(closed_trades),
                "total_pnl": round(total_pnl, 2),
                "win_rate": round(winning/len(closed_trades)*100 if closed_trades else 0, 2)
            },
            "source": "rule_based"
        }

    try:
        client_kwargs = {"api_key": OPENAI_API_KEY}
        if OPENAI_BASE_URL:
            client_kwargs["base_url"] = OPENAI_BASE_URL

        client = AsyncOpenAI(**client_kwargs)
        completion = await client.chat.completions.create(
            model=AI_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": "You are a professional trading analyst helping traders improve their performance."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.4,
        )

        response = (completion.choices[0].message.content or "").strip()

        return {
            "insight": response,
            "summary": {
                "total_trades": len(closed_trades),
                "total_pnl": round(total_pnl, 2),
                "win_rate": round(winning/len(closed_trades)*100 if closed_trades else 0, 2)
            },
            "source": "llm"
        }
    except Exception as e:
        logging.error(f"AI insight error: {str(e)}")
        fallback = build_rule_based_insight(len(closed_trades), total_pnl, winning, losing)
        return {
            "insight": fallback,
            "summary": {
                "total_trades": len(closed_trades),
                "total_pnl": round(total_pnl, 2),
                "win_rate": round(winning/len(closed_trades)*100 if closed_trades else 0, 2)
            },
            "source": "rule_based"
        }

# ============ IMPORT ROUTES ============

# Symbol mapping for CSV import (broker symbols to app instruments)
SYMBOL_MAPPING = {
    'XAUUSDm': 'XAU/USD',
    'XAUUSD': 'XAU/USD',
    'XAGUSDm': 'XAG/USD',
    'XAGUSD': 'XAG/USD',
    'BTCUSDm': 'BTC/USD',
    'BTCUSD': 'BTC/USD',
    'ETHUSDm': 'ETH/USD',
    'ETHUSD': 'ETH/USD',
    'EURUSDm': 'EUR/USD',
    'EURUSD': 'EUR/USD',
    'GBPUSDm': 'GBP/USD',
    'GBPUSD': 'GBP/USD',
    'USDJPYm': 'USD/JPY',
    'USDJPY': 'USD/JPY',
    'NAS100m': 'NAS100',
    'US30m': 'US30',
}

def normalize_symbol(symbol: str) -> str:
    """Convert broker symbol format to app instrument format"""
    symbol = symbol.strip()
    if symbol in SYMBOL_MAPPING:
        return SYMBOL_MAPPING[symbol]
    # Remove trailing 'm' if present and check again
    if symbol.endswith('m'):
        base = symbol[:-1]
        if base in SYMBOL_MAPPING:
            return SYMBOL_MAPPING[base]
    # Return original if no mapping found
    return symbol

class CSVImportResponse(BaseModel):
    success: bool
    imported_count: int
    skipped_count: int
    errors: List[str] = []
    message: str

@api_router.post("/trades/import-csv", response_model=CSVImportResponse)
async def import_trades_csv(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Import trades from a CSV file (Exness/MT5 format)"""
    
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted")
    
    try:
        # Read and decode the CSV content
        content = await file.read()
        decoded = content.decode('utf-8')
        
        # Parse CSV
        reader = csv.DictReader(io.StringIO(decoded))
        
        imported_count = 0
        skipped_count = 0
        errors = []
        
        # Get existing tickets to avoid duplicates
        existing_tickets = set()
        existing_trades = await db.trades.find(
            {"user_id": current_user['id'], "mt5_ticket": {"$ne": None}},
            {"mt5_ticket": 1, "_id": 0}
        ).to_list(100000)
        for t in existing_trades:
            if t.get('mt5_ticket'):
                existing_tickets.add(str(t['mt5_ticket']))
        
        now = datetime.now(timezone.utc).isoformat()
        trades_to_insert = []
        
        for row_num, row in enumerate(reader, start=2):
            try:
                # Get ticket number
                ticket = row.get('ticket', '').strip()
                if not ticket:
                    skipped_count += 1
                    continue
                
                # Skip if already imported
                if ticket in existing_tickets:
                    skipped_count += 1
                    continue
                
                # Parse required fields
                symbol = row.get('symbol', '').strip()
                if not symbol:
                    errors.append(f"Row {row_num}: Missing symbol")
                    skipped_count += 1
                    continue
                
                trade_type = row.get('type', '').strip().lower()
                if trade_type not in ['buy', 'sell']:
                    errors.append(f"Row {row_num}: Invalid trade type '{trade_type}'")
                    skipped_count += 1
                    continue
                
                # Parse prices
                try:
                    opening_price = float(row.get('opening_price', 0))
                    closing_price = float(row.get('closing_price', 0)) if row.get('closing_price', '').strip() else None
                except ValueError:
                    errors.append(f"Row {row_num}: Invalid price values")
                    skipped_count += 1
                    continue
                
                # Parse lots
                try:
                    lots = float(row.get('lots', 0))
                    if lots <= 0:
                        errors.append(f"Row {row_num}: Invalid lot size")
                        skipped_count += 1
                        continue
                except ValueError:
                    errors.append(f"Row {row_num}: Invalid lot size")
                    skipped_count += 1
                    continue
                
                # Parse dates
                opening_time = row.get('opening_time_utc', '').strip()
                closing_time = row.get('closing_time_utc', '').strip()
                
                # Convert datetime format (2026-03-02T01:33:34.811 -> 2026-03-02T01:33:34)
                entry_date = opening_time[:19] if opening_time else now[:19]
                exit_date = closing_time[:19] if closing_time else None
                
                # Parse optional fields
                stop_loss = None
                take_profit = None
                commission = 0
                swap = 0
                profit = None
                
                try:
                    if row.get('stop_loss', '').strip():
                        stop_loss = float(row['stop_loss'])
                    if row.get('take_profit', '').strip():
                        take_profit = float(row['take_profit'])
                    if row.get('commission_usd', '').strip():
                        commission = float(row['commission_usd'])
                    if row.get('swap_usd', '').strip():
                        swap = float(row['swap_usd'])
                    if row.get('profit_usd', '').strip():
                        profit = float(row['profit_usd'])
                except ValueError:
                    pass  # Use defaults for optional fields
                
                # Normalize symbol to app format
                instrument = normalize_symbol(symbol)
                
                # Determine status
                status = 'closed' if closing_price and exit_date else 'open'
                
                # Create trade document
                trade_id = str(uuid.uuid4())
                trade_doc = {
                    "id": trade_id,
                    "user_id": current_user['id'],
                    "instrument": instrument,
                    "position": trade_type,
                    "entry_price": opening_price,
                    "exit_price": closing_price,
                    "quantity": lots,
                    "entry_date": entry_date,
                    "exit_date": exit_date,
                    "notes": f"Imported from CSV - Ticket #{ticket}",
                    "status": status,
                    "stop_loss": stop_loss,
                    "take_profit": take_profit,
                    "commission": commission,
                    "swap": swap,
                    "mt5_ticket": ticket,
                    "created_at": now
                }
                
                # Use the profit from CSV directly if available, otherwise calculate
                if profit is not None and status == 'closed':
                    trade_doc['pnl'] = round(profit, 2)
                    # Calculate pnl_percentage based on entry price
                    if opening_price > 0 and closing_price:
                        if trade_type == 'buy':
                            trade_doc['pnl_percentage'] = round((closing_price - opening_price) / opening_price * 100, 2)
                        else:
                            trade_doc['pnl_percentage'] = round((opening_price - closing_price) / opening_price * 100, 2)
                else:
                    trade_doc = calculate_pnl(trade_doc)
                
                trades_to_insert.append(trade_doc)
                existing_tickets.add(ticket)
                imported_count += 1
                
            except Exception as e:
                errors.append(f"Row {row_num}: {str(e)}")
                skipped_count += 1
        
        # Bulk insert trades
        if trades_to_insert:
            await db.trades.insert_many(trades_to_insert)
        
        # Limit errors list for response
        if len(errors) > 10:
            errors = errors[:10] + [f"... and {len(errors) - 10} more errors"]
        
        return CSVImportResponse(
            success=True,
            imported_count=imported_count,
            skipped_count=skipped_count,
            errors=errors,
            message=f"Successfully imported {imported_count} trades. {skipped_count} skipped (duplicates or errors)."
        )
        
    except Exception as e:
        logging.error(f"CSV import error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to import CSV: {str(e)}")

# ============ EXPORT ROUTES ============

@api_router.get("/export/trades/csv")
async def export_trades_csv(current_user: dict = Depends(get_current_user)):
    trades = await db.trades.find({"user_id": current_user['id']}, {"_id": 0}).sort("entry_date", -1).to_list(10000)
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow([
        'Instrument', 'Position', 'Status', 'Entry Price', 'Exit Price', 
        'Quantity', 'Entry Date', 'Exit Date', 'P&L', 'P&L %',
        'Stop Loss', 'Take Profit', 'Commission', 'Swap', 'Notes'
    ])
    
    for trade in trades:
        trade = calculate_pnl(trade)
        writer.writerow([
            trade.get('instrument', ''),
            trade.get('position', ''),
            trade.get('status', ''),
            trade.get('entry_price', ''),
            trade.get('exit_price', ''),
            trade.get('quantity', ''),
            trade.get('entry_date', ''),
            trade.get('exit_date', ''),
            trade.get('pnl', ''),
            trade.get('pnl_percentage', ''),
            trade.get('stop_loss', ''),
            trade.get('take_profit', ''),
            trade.get('commission', ''),
            trade.get('swap', ''),
            trade.get('notes', '')
        ])
    
    output.seek(0)
    
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode('utf-8')),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=trades_export_{datetime.now().strftime('%Y%m%d')}.csv"}
    )

@api_router.get("/export/trades/xlsx")
async def export_trades_xlsx(current_user: dict = Depends(get_current_user)):
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    
    trades = await db.trades.find({"user_id": current_user['id']}, {"_id": 0}).sort("entry_date", -1).to_list(10000)
    
    wb = Workbook()
    ws = wb.active
    ws.title = "Trades"
    
    header_font = Font(bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="1F2937", end_color="1F2937", fill_type="solid")
    thin_border = Border(
        left=Side(style='thin'),
        right=Side(style='thin'),
        top=Side(style='thin'),
        bottom=Side(style='thin')
    )
    
    headers = [
        'Instrument', 'Position', 'Status', 'Entry Price', 'Exit Price', 
        'Quantity', 'Entry Date', 'Exit Date', 'P&L', 'P&L %',
        'Stop Loss', 'Take Profit', 'Commission', 'Swap', 'Notes'
    ]
    
    for col, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col, value=header)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal='center')
        cell.border = thin_border
    
    green_fill = PatternFill(start_color="D1FAE5", end_color="D1FAE5", fill_type="solid")
    red_fill = PatternFill(start_color="FEE2E2", end_color="FEE2E2", fill_type="solid")
    
    for row_idx, trade in enumerate(trades, 2):
        trade = calculate_pnl(trade)
        row_data = [
            trade.get('instrument', ''),
            trade.get('position', ''),
            trade.get('status', ''),
            trade.get('entry_price', ''),
            trade.get('exit_price', ''),
            trade.get('quantity', ''),
            trade.get('entry_date', ''),
            trade.get('exit_date', ''),
            trade.get('pnl', ''),
            trade.get('pnl_percentage', ''),
            trade.get('stop_loss', ''),
            trade.get('take_profit', ''),
            trade.get('commission', ''),
            trade.get('swap', ''),
            trade.get('notes', '')
        ]
        
        for col, value in enumerate(row_data, 1):
            cell = ws.cell(row=row_idx, column=col, value=value)
            cell.border = thin_border
            
            if col == 9 and value:
                try:
                    if float(value) > 0:
                        cell.fill = green_fill
                    elif float(value) < 0:
                        cell.fill = red_fill
                except:
                    pass
    
    for col in range(1, len(headers) + 1):
        ws.column_dimensions[chr(64 + col)].width = 15
    
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=trades_export_{datetime.now().strftime('%Y%m%d')}.xlsx"}
    )

# ============ HEALTH CHECK ============

@api_router.get("/")
async def root():
    return {"message": "TradeLedger API", "status": "healthy"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# Include routers
app.include_router(api_router)
app.include_router(admin_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
