from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'trading_journal_secret')
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
JWT_EXPIRATION_HOURS = int(os.environ.get('JWT_EXPIRATION_HOURS', 24))

# LLM Key
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

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

class TradeCreate(BaseModel):
    instrument: str  # XAU/USD, BTC, ETH, Silver, EUR/USD, GBP/USD, Stocks
    position: str  # long or short
    entry_price: float
    exit_price: Optional[float] = None
    quantity: float
    entry_date: str
    exit_date: Optional[str] = None
    notes: Optional[str] = ""
    status: str = "open"  # open or closed

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
    pnl: Optional[float] = None
    pnl_percentage: Optional[float] = None
    created_at: str

class AIInsightRequest(BaseModel):
    question: Optional[str] = None

# ============ AUTH HELPERS ============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(user_id: str, email: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    payload = {
        "sub": user_id,
        "email": email,
        "exp": expire
    }
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

# ============ PNL CALCULATION ============

def calculate_pnl(trade: dict) -> dict:
    if trade.get('exit_price') and trade.get('status') == 'closed':
        entry = trade['entry_price']
        exit_p = trade['exit_price']
        qty = trade['quantity']
        position = trade['position']
        
        if position == 'long':
            pnl = (exit_p - entry) * qty
        else:  # short
            pnl = (entry - exit_p) * qty
        
        pnl_percentage = ((exit_p - entry) / entry * 100) if position == 'long' else ((entry - exit_p) / entry * 100)
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
        user=UserResponse(
            id=user_id,
            email=user_data.email,
            name=user_data.name,
            created_at=now
        )
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(user_data: UserLogin):
    user = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if not user or not verify_password(user_data.password, user['password']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_access_token(user['id'], user['email'])
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user['id'],
            email=user['email'],
            name=user['name'],
            created_at=user['created_at']
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(**current_user)

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
    current_user: dict = Depends(get_current_user)
):
    query = {"user_id": current_user['id']}
    if status:
        query["status"] = status
    if instrument:
        query["instrument"] = instrument
    
    trades = await db.trades.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    return [TradeResponse(**calculate_pnl(t)) for t in trades]

@api_router.get("/trades/{trade_id}", response_model=TradeResponse)
async def get_trade(trade_id: str, current_user: dict = Depends(get_current_user)):
    trade = await db.trades.find_one(
        {"id": trade_id, "user_id": current_user['id']},
        {"_id": 0}
    )
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    
    return TradeResponse(**calculate_pnl(trade))

@api_router.put("/trades/{trade_id}", response_model=TradeResponse)
async def update_trade(trade_id: str, trade_data: TradeUpdate, current_user: dict = Depends(get_current_user)):
    existing = await db.trades.find_one(
        {"id": trade_id, "user_id": current_user['id']},
        {"_id": 0}
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Trade not found")
    
    update_dict = {k: v for k, v in trade_data.model_dump().items() if v is not None}
    
    if update_dict:
        await db.trades.update_one(
            {"id": trade_id},
            {"$set": update_dict}
        )
    
    updated = await db.trades.find_one({"id": trade_id}, {"_id": 0})
    return TradeResponse(**calculate_pnl(updated))

@api_router.delete("/trades/{trade_id}")
async def delete_trade(trade_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.trades.delete_one(
        {"id": trade_id, "user_id": current_user['id']}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Trade not found")
    return {"message": "Trade deleted successfully"}

# ============ ANALYTICS ROUTES ============

@api_router.get("/analytics/summary")
async def get_analytics_summary(current_user: dict = Depends(get_current_user)):
    trades = await db.trades.find(
        {"user_id": current_user['id'], "status": "closed"},
        {"_id": 0}
    ).to_list(1000)
    
    total_trades = len(trades)
    winning_trades = 0
    losing_trades = 0
    total_pnl = 0
    
    for trade in trades:
        trade = calculate_pnl(trade)
        if trade.get('pnl'):
            total_pnl += trade['pnl']
            if trade['pnl'] > 0:
                winning_trades += 1
            else:
                losing_trades += 1
    
    win_rate = (winning_trades / total_trades * 100) if total_trades > 0 else 0
    
    # Open trades
    open_trades = await db.trades.count_documents(
        {"user_id": current_user['id'], "status": "open"}
    )
    
    return {
        "total_trades": total_trades,
        "open_trades": open_trades,
        "winning_trades": winning_trades,
        "losing_trades": losing_trades,
        "win_rate": round(win_rate, 2),
        "total_pnl": round(total_pnl, 2)
    }

@api_router.get("/analytics/by-instrument")
async def get_analytics_by_instrument(current_user: dict = Depends(get_current_user)):
    trades = await db.trades.find(
        {"user_id": current_user['id'], "status": "closed"},
        {"_id": 0}
    ).to_list(1000)
    
    instrument_stats = {}
    
    for trade in trades:
        trade = calculate_pnl(trade)
        instrument = trade['instrument']
        
        if instrument not in instrument_stats:
            instrument_stats[instrument] = {
                "instrument": instrument,
                "total_trades": 0,
                "winning_trades": 0,
                "total_pnl": 0
            }
        
        instrument_stats[instrument]['total_trades'] += 1
        if trade.get('pnl'):
            instrument_stats[instrument]['total_pnl'] += trade['pnl']
            if trade['pnl'] > 0:
                instrument_stats[instrument]['winning_trades'] += 1
    
    result = []
    for inst, stats in instrument_stats.items():
        stats['total_pnl'] = round(stats['total_pnl'], 2)
        stats['win_rate'] = round(stats['winning_trades'] / stats['total_trades'] * 100, 2) if stats['total_trades'] > 0 else 0
        result.append(stats)
    
    return result

@api_router.get("/analytics/monthly")
async def get_monthly_analytics(current_user: dict = Depends(get_current_user)):
    trades = await db.trades.find(
        {"user_id": current_user['id'], "status": "closed"},
        {"_id": 0}
    ).to_list(1000)
    
    monthly_stats = {}
    
    for trade in trades:
        trade = calculate_pnl(trade)
        if trade.get('exit_date'):
            month = trade['exit_date'][:7]  # YYYY-MM format
            
            if month not in monthly_stats:
                monthly_stats[month] = {"month": month, "pnl": 0, "trades": 0}
            
            monthly_stats[month]['trades'] += 1
            if trade.get('pnl'):
                monthly_stats[month]['pnl'] += trade['pnl']
    
    result = sorted(monthly_stats.values(), key=lambda x: x['month'])
    for r in result:
        r['pnl'] = round(r['pnl'], 2)
    
    return result

# ============ AI INSIGHTS ============

@api_router.post("/ai/insights")
async def get_ai_insights(request: AIInsightRequest, current_user: dict = Depends(get_current_user)):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="AI service not configured")
    
    # Get user's trades for context
    trades = await db.trades.find(
        {"user_id": current_user['id']},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    # Calculate stats
    closed_trades = [calculate_pnl(t) for t in trades if t['status'] == 'closed']
    total_pnl = sum(t.get('pnl', 0) or 0 for t in closed_trades)
    winning = len([t for t in closed_trades if t.get('pnl', 0) and t['pnl'] > 0])
    losing = len([t for t in closed_trades if t.get('pnl', 0) and t['pnl'] < 0])
    
    # Build context
    trades_summary = f"""
Trading Summary:
- Total closed trades: {len(closed_trades)}
- Total P&L: ${total_pnl:.2f}
- Winning trades: {winning}
- Losing trades: {losing}
- Win rate: {(winning/len(closed_trades)*100 if closed_trades else 0):.1f}%

Recent trades:
"""
    for t in closed_trades[:10]:
        trades_summary += f"- {t['instrument']} {t['position'].upper()}: Entry ${t['entry_price']}, Exit ${t.get('exit_price', 'N/A')}, P&L: ${t.get('pnl', 0):.2f}\n"
    
    user_question = request.question or "Analyze my trading performance and provide insights on how I can improve."
    
    prompt = f"""You are an expert trading analyst. Based on the following trading data, provide actionable insights.

{trades_summary}

User's question: {user_question}

Provide a concise, helpful analysis with specific recommendations."""

    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"trading-insights-{current_user['id']}",
            system_message="You are a professional trading analyst helping traders improve their performance."
        ).with_model("openai", "gpt-5.2")
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        return {
            "insight": response,
            "summary": {
                "total_trades": len(closed_trades),
                "total_pnl": round(total_pnl, 2),
                "win_rate": round(winning/len(closed_trades)*100 if closed_trades else 0, 2)
            }
        }
    except Exception as e:
        logging.error(f"AI insight error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")

# ============ HEALTH CHECK ============

@api_router.get("/")
async def root():
    return {"message": "Trading Journal API", "status": "healthy"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
