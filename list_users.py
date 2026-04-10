"""List all user emails to find what account was created"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def list_users():
    client = AsyncIOMotorClient('mongodb+srv://tradejournal_app:QDT57xvaSD8EMSDz@tradejournal.oyqbtqs.mongodb.net/tradejournal')
    db = client['tradejournal']
    
    users = await db.users.find({}, {'email': 1, 'name': 1, 'created_at': 1, 'id': 1}).sort('created_at', -1).to_list(None)
    
    print(f"\n=== All {len(users)} users (most recent first) ===\n")
    
    for i, user in enumerate(users, 1):
        trade_count = await db.trades.count_documents({'user_id': user.get('id')})
        account = await db.accounts.find_one({'user_id': user.get('id')})
        currency = account.get('currency') if account else 'No account'
        
        print(f"{i}. {user.get('email')}")
        print(f"   Name: {user.get('name')}")
        print(f"   Created: {user.get('created_at', 'Unknown')}")
        print(f"   Trades: {trade_count}, Currency: {currency}")
        print()
    
    client.close()

asyncio.run(list_users())
