"""
Database Viewer Script
======================
This script connects to your MongoDB database and displays all stored data.

Usage:
    python view_database.py

Requirements:
    - motor (async MongoDB driver)
    - python-dotenv
    
Install: pip install motor python-dotenv
"""

import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime
import json

# Load environment variables
ROOT_DIR = Path(__file__).parent / 'backend'
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL') or os.environ.get('MONGODB_URI') or os.environ.get('DATABASE_URL')
if not mongo_url:
    print("❌ Error: MongoDB connection URL not found!")
    print("Set MONGO_URL, MONGODB_URI, or DATABASE_URL in your backend/.env file")
    exit(1)

db_name = os.environ.get('DB_NAME', 'trade_ledger')

async def view_database():
    """Connect to database and display all data"""
    print(f"\n{'='*80}")
    print(f"📊 DATABASE VIEWER - {db_name}")
    print(f"{'='*80}\n")
    
    try:
        # Connect to MongoDB
        client = AsyncIOMotorClient(mongo_url)
        db = client[db_name]
        
        print(f"✅ Connected to database: {db_name}")
        print(f"📅 Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        
        # =====================
        # USERS COLLECTION
        # =====================
        print(f"\n{'─'*80}")
        print("👥 USERS COLLECTION")
        print(f"{'─'*80}")
        
        users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(None)
        print(f"Total Users: {len(users)}\n")
        
        for i, user in enumerate(users, 1):
            print(f"{i}. {user.get('name', 'N/A')} ({user.get('email', 'N/A')})")
            print(f"   ID: {user.get('id', 'N/A')}")
            print(f"   Created: {user.get('created_at', 'N/A')}")
            print(f"   Currency: {user.get('currency', 'USD')}")
            print()
        
        # =====================
        # TRADES COLLECTION
        # =====================
        print(f"\n{'─'*80}")
        print("📈 TRADES COLLECTION")
        print(f"{'─'*80}")
        
        trades = await db.trades.find({}, {"_id": 0}).to_list(None)
        print(f"Total Trades: {len(trades)}")
        
        # Group by status
        open_trades = [t for t in trades if t.get('status') == 'open']
        closed_trades = [t for t in trades if t.get('status') == 'closed']
        
        print(f"  Open: {len(open_trades)}")
        print(f"  Closed: {len(closed_trades)}\n")
        
        # Group by user
        trades_by_user = {}
        for trade in trades:
            user_id = trade.get('user_id', 'unknown')
            if user_id not in trades_by_user:
                trades_by_user[user_id] = []
            trades_by_user[user_id].append(trade)
        
        print("Trades by User:")
        for user_id, user_trades in trades_by_user.items():
            # Find user email
            user = next((u for u in users if u.get('id') == user_id), None)
            user_email = user.get('email', 'Unknown') if user else 'Unknown'
            
            closed = [t for t in user_trades if t.get('status') == 'closed']
            total_pnl = sum(t.get('pnl', 0) or 0 for t in closed)
            
            print(f"  {user_email}: {len(user_trades)} trades (Closed: {len(closed)}, PnL: {total_pnl:.2f})")
        
        # Sample trades
        if trades:
            print(f"\n📋 Sample Trades (showing first 5):")
            for i, trade in enumerate(trades[:5], 1):
                user = next((u for u in users if u.get('id') == trade.get('user_id')), None)
                user_email = user.get('email', 'Unknown') if user else 'Unknown'
                
                print(f"\n  {i}. Trade ID: {trade.get('id', 'N/A')}")
                print(f"     User: {user_email}")
                print(f"     Instrument: {trade.get('instrument', 'N/A')}")
                print(f"     Position: {trade.get('position', 'N/A')}")
                print(f"     Status: {trade.get('status', 'N/A')}")
                print(f"     Entry: {trade.get('entry_price', 'N/A')} | Exit: {trade.get('exit_price', 'N/A')}")
                print(f"     Quantity: {trade.get('quantity', 'N/A')}")
                print(f"     PnL: {trade.get('pnl', 'N/A')}")
                print(f"     Created: {trade.get('created_at', 'N/A')}")
        
        # =====================
        # MT5 ACCOUNTS COLLECTION
        # =====================
        print(f"\n{'─'*80}")
        print("🔗 MT5 ACCOUNTS COLLECTION")
        print(f"{'─'*80}")
        
        mt5_accounts = await db.mt5_accounts.find({}, {"_id": 0}).to_list(None)
        print(f"Total MT5 Accounts: {len(mt5_accounts)}\n")
        
        for i, account in enumerate(mt5_accounts, 1):
            user = next((u for u in users if u.get('id') == account.get('user_id')), None)
            user_email = user.get('email', 'Unknown') if user else 'Unknown'
            
            print(f"{i}. Account ID: {account.get('account_id', 'N/A')}")
            print(f"   User: {user_email}")
            print(f"   Name: {account.get('name', 'N/A')}")
            print(f"   Server: {account.get('server', 'N/A')}")
            print(f"   Status: {account.get('deployment_state', 'N/A')}")
            print()
        
        # =====================
        # PASSWORD RESETS COLLECTION
        # =====================
        print(f"\n{'─'*80}")
        print("🔑 PASSWORD RESETS COLLECTION")
        print(f"{'─'*80}")
        
        password_resets = await db.password_resets.find({}, {"_id": 0}).to_list(None)
        print(f"Total Password Reset Requests: {len(password_resets)}\n")
        
        if password_resets:
            for i, reset in enumerate(password_resets, 1):
                print(f"{i}. Email: {reset.get('email', 'N/A')}")
                print(f"   Token: {reset.get('token', 'N/A')[:20]}...")
                print(f"   Expires: {reset.get('expires_at', 'N/A')}")
                print(f"   Used: {reset.get('used', False)}")
                print()
        
        # =====================
        # SUMMARY STATISTICS
        # =====================
        print(f"\n{'='*80}")
        print("📊 SUMMARY STATISTICS")
        print(f"{'='*80}\n")
        
        # Calculate overall stats
        total_pnl = sum(t.get('pnl', 0) or 0 for t in closed_trades)
        winning_trades = [t for t in closed_trades if (t.get('pnl', 0) or 0) > 0]
        losing_trades = [t for t in closed_trades if (t.get('pnl', 0) or 0) < 0]
        
        print(f"Total Users: {len(users)}")
        print(f"Total Trades: {len(trades)}")
        print(f"  • Open: {len(open_trades)}")
        print(f"  • Closed: {len(closed_trades)}")
        print(f"\nClosed Trades Performance:")
        print(f"  • Total PnL: {total_pnl:.2f}")
        print(f"  • Winning Trades: {len(winning_trades)}")
        print(f"  • Losing Trades: {len(losing_trades)}")
        print(f"  • Win Rate: {(len(winning_trades)/len(closed_trades)*100):.2f}%" if closed_trades else "  • Win Rate: N/A")
        print(f"\nMT5 Accounts: {len(mt5_accounts)}")
        print(f"Password Reset Requests: {len(password_resets)}")
        
        print(f"\n{'='*80}\n")
        
        # Export option
        print("💾 Export Options:")
        print("  To export all data to JSON files, run:")
        print("  python export_database.py")
        
        client.close()
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(view_database())
