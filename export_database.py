"""
Database Export Script
======================
This script exports all database data to JSON files for backup or analysis.

Usage:
    python export_database.py

Output:
    Creates a folder 'database_export_TIMESTAMP' with JSON files for each collection
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

async def export_database():
    """Export all database collections to JSON files"""
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    export_dir = Path(f"database_export_{timestamp}")
    export_dir.mkdir(exist_ok=True)
    
    print(f"\n{'='*80}")
    print(f"💾 DATABASE EXPORT")
    print(f"{'='*80}\n")
    print(f"Database: {db_name}")
    print(f"Export Directory: {export_dir}")
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    
    try:
        # Connect to MongoDB
        client = AsyncIOMotorClient(mongo_url)
        db = client[db_name]
        
        print("✅ Connected to database\n")
        
        export_summary = {
            "database": db_name,
            "export_timestamp": datetime.now().isoformat(),
            "collections": {}
        }
        
        # Export Users
        print("📥 Exporting users...")
        users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(None)
        users_file = export_dir / "users.json"
        with open(users_file, 'w', encoding='utf-8') as f:
            json.dump(users, f, indent=2, default=str)
        print(f"   ✓ Exported {len(users)} users to {users_file}")
        export_summary["collections"]["users"] = len(users)
        
        # Export Trades
        print("📥 Exporting trades...")
        trades = await db.trades.find({}, {"_id": 0}).to_list(None)
        trades_file = export_dir / "trades.json"
        with open(trades_file, 'w', encoding='utf-8') as f:
            json.dump(trades, f, indent=2, default=str)
        print(f"   ✓ Exported {len(trades)} trades to {trades_file}")
        export_summary["collections"]["trades"] = len(trades)
        
        # Export MT5 Accounts
        print("📥 Exporting MT5 accounts...")
        mt5_accounts = await db.mt5_accounts.find({}, {"_id": 0}).to_list(None)
        mt5_file = export_dir / "mt5_accounts.json"
        with open(mt5_file, 'w', encoding='utf-8') as f:
            json.dump(mt5_accounts, f, indent=2, default=str)
        print(f"   ✓ Exported {len(mt5_accounts)} MT5 accounts to {mt5_file}")
        export_summary["collections"]["mt5_accounts"] = len(mt5_accounts)
        
        # Export Password Resets
        print("📥 Exporting password resets...")
        password_resets = await db.password_resets.find({}, {"_id": 0}).to_list(None)
        resets_file = export_dir / "password_resets.json"
        with open(resets_file, 'w', encoding='utf-8') as f:
            json.dump(password_resets, f, indent=2, default=str)
        print(f"   ✓ Exported {len(password_resets)} password resets to {resets_file}")
        export_summary["collections"]["password_resets"] = len(password_resets)
        
        # Create summary file
        summary_file = export_dir / "export_summary.json"
        with open(summary_file, 'w', encoding='utf-8') as f:
            json.dump(export_summary, f, indent=2, default=str)
        print(f"\n✓ Created export summary: {summary_file}")
        
        # Create readable report
        report_file = export_dir / "REPORT.txt"
        with open(report_file, 'w', encoding='utf-8') as f:
            f.write(f"DATABASE EXPORT REPORT\n")
            f.write(f"{'='*80}\n\n")
            f.write(f"Database: {db_name}\n")
            f.write(f"Export Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"Export Directory: {export_dir}\n\n")
            f.write(f"{'='*80}\n")
            f.write(f"COLLECTIONS\n")
            f.write(f"{'='*80}\n\n")
            f.write(f"Users: {len(users)}\n")
            f.write(f"Trades: {len(trades)}\n")
            f.write(f"MT5 Accounts: {len(mt5_accounts)}\n")
            f.write(f"Password Resets: {len(password_resets)}\n\n")
            f.write(f"{'='*80}\n")
            f.write(f"FILES CREATED\n")
            f.write(f"{'='*80}\n\n")
            f.write(f"• users.json ({len(users)} records)\n")
            f.write(f"• trades.json ({len(trades)} records)\n")
            f.write(f"• mt5_accounts.json ({len(mt5_accounts)} records)\n")
            f.write(f"• password_resets.json ({len(password_resets)} records)\n")
            f.write(f"• export_summary.json\n")
            f.write(f"• REPORT.txt\n")
        
        print(f"✓ Created readable report: {report_file}")
        
        print(f"\n{'='*80}")
        print(f"✅ EXPORT COMPLETE")
        print(f"{'='*80}\n")
        print(f"Total Collections: 4")
        print(f"Total Records: {len(users) + len(trades) + len(mt5_accounts) + len(password_resets)}")
        print(f"\nAll files saved to: {export_dir.absolute()}")
        print(f"\n{'='*80}\n")
        
        client.close()
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(export_database())
