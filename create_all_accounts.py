"""Create account documents for all users with trades"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone

async def create_all_accounts():
    client = AsyncIOMotorClient('mongodb+srv://tradejournal_app:QDT57xvaSD8EMSDz@tradejournal.oyqbtqs.mongodb.net/tradejournal')
    db = client['tradejournal']
    
    # Get all users with trades
    users_with_trades = [
        {'id': '4b23b4ee-8fed-4d4e-97d1-554f7ed6f8d3', 'email': 'kishorshivaji.ks@gmail.com'},  # 60 trades
        {'id': None, 'email': 'himanpundhir@gmail.com'},  # 7968 trades
        {'id': None, 'email': 'baranikonar1611@gmail.com'}  # 235 trades
    ]
    
    for user_info in users_with_trades:
        if not user_info['id']:
            user = await db.users.find_one({'email': user_info['email']})
            user_id = user.get('id')
        else:
            user_id = user_info['id']
        
        # Check if account exists
        existing = await db.accounts.find_one({'user_id': user_id})
        
        if existing:
            print(f"✓ {user_info['email']}: Account already exists")
        else:
            account_doc = {
                'user_id': user_id,
                'currency': 'INR',  # Default to INR for Indian users
                'initial_balance': 100000.0,
                'created_at': datetime.now(timezone.utc).isoformat(),
                'updated_at': datetime.now(timezone.utc).isoformat()
            }
            
            result = await db.accounts.insert_one(account_doc)
            print(f"✓ {user_info['email']}: Created account with INR currency")
    
    client.close()

asyncio.run(create_all_accounts())
