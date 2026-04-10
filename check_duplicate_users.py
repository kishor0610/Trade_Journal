"""Check for duplicate users and data integrity issues"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def check_database():
    client = AsyncIOMotorClient('mongodb+srv://tradejournal_app:QDT57xvaSD8EMSDz@tradejournal.oyqbtqs.mongodb.net/tradejournal')
    db = client['tradejournal']
    
    # Find all users with email kishorshivaji.ks@gmail.com
    users = await db.users.find({'email': 'kishorshivaji.ks@gmail.com'}).to_list(None)
    
    print(f"\n=== Found {len(users)} user(s) with email kishorshivaji.ks@gmail.com ===\n")
    
    for i, user in enumerate(users, 1):
        print(f"User {i}:")
        print(f"  ID: {user.get('id')}")
        print(f"  Email: {user.get('email')}")
        print(f"  Name: {user.get('name')}")
        print(f"  Created: {user.get('created_at')}")
        print(f"  MongoDB _id: {user.get('_id')}")
        
        # Count trades for this user
        trade_count = await db.trades.count_documents({'user_id': user.get('id')})
        print(f"  Trades: {trade_count}")
        
        # Check account settings
        account = await db.accounts.find_one({'user_id': user.get('id')})
        if account:
            print(f"  Account currency: {account.get('currency')}")
        else:
            print(f"  Account: None")
        print()
    
    # Check total users in database
    total_users = await db.users.count_documents({})
    print(f"Total users in database: {total_users}")
    
    # Check for duplicate emails (any)
    pipeline = [
        {"$group": {"_id": "$email", "count": {"$sum": 1}}},
        {"$match": {"count": {"$gt": 1}}}
    ]
    duplicates = await db.users.aggregate(pipeline).to_list(None)
    
    if duplicates:
        print(f"\n=== Found {len(duplicates)} duplicate email(s) ===")
        for dup in duplicates:
            print(f"  {dup['_id']}: {dup['count']} accounts")
    else:
        print("\nNo duplicate emails found (besides the one we're checking)")
    
    client.close()

asyncio.run(check_database())
