"""Create missing account document for user"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone

async def fix_account():
    client = AsyncIOMotorClient('mongodb+srv://tradejournal_app:QDT57xvaSD8EMSDz@tradejournal.oyqbtqs.mongodb.net/tradejournal')
    db = client['tradejournal']
    
    user_id = '4b23b4ee-8fed-4d4e-97d1-554f7ed6f8d3'
    
    # Check if account exists
    existing = await db.accounts.find_one({'user_id': user_id})
    
    if existing:
        print(f"Account already exists: {existing}")
    else:
        # Create account document with INR currency
        account_doc = {
            'user_id': user_id,
            'currency': 'INR',
            'initial_balance': 100000.0,
            'created_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat()
        }
        
        result = await db.accounts.insert_one(account_doc)
        print(f"Created account document with INR currency: {result.inserted_id}")
    
    # Also check user password and verify it can be checked
    user = await db.users.find_one({'id': user_id})
    print(f"\nUser exists: {user.get('email')}")
    print(f"Has password hash: {bool(user.get('password'))}")
    print(f"Password hash length: {len(user.get('password', ''))}")
    
    client.close()

asyncio.run(fix_account())
