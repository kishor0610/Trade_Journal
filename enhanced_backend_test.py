import requests
import sys
from datetime import datetime

class EnhancedTradingJournalTester:
    def __init__(self):
        self.base_url = "https://trade-ledger-18.preview.emergentagent.com/api"
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None, auth_required=True):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if auth_required and self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data.get('detail', 'Unknown error')}")
                except:
                    print(f"   Response text: {response.text[:200]}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def setup_auth(self):
        """Setup authentication"""
        timestamp = datetime.now().strftime("%H%M%S")
        test_data = {
            "email": f"enhanced_test_{timestamp}@example.com",
            "password": "TestPass123!",
            "name": f"Enhanced Test {timestamp}"
        }
        
        success, response = self.run_test(
            "Setup Auth", "POST", "auth/register", 200, 
            data=test_data, auth_required=False
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            return True
        return False

    def test_daily_analytics(self):
        """Test daily analytics API with calendar data"""
        success, response = self.run_test(
            "Daily Analytics (Calendar)", "GET", "analytics/daily?year=2024&month=8", 200
        )
        
        if success:
            data = response
            print(f"   Calendar data - Year: {data.get('year')}, Month: {data.get('month')}")
            print(f"   Daily entries: {len(data.get('days', []))}")
            print(f"   Summary: {data.get('summary', {})}")
        return success

    def test_balance_history(self):
        """Test balance history API for equity curve"""
        success, response = self.run_test(
            "Balance History (1M)", "GET", "analytics/balance-history?period=1M", 200
        )
        
        if success:
            print(f"   Balance history entries: {len(response)}")
            if response:
                print(f"   Sample entry: {response[0]}")
        return success

    def test_trade_count_history(self):
        """Test trade count history for sparkline"""
        success, response = self.run_test(
            "Trade Count History", "GET", "analytics/trade-count?period=1M", 200
        )
        
        if success:
            data = response
            print(f"   Total trades: {data.get('total', 0)}")
            print(f"   Daily data points: {len(data.get('data', []))}")
        return success

    def test_mt5_accounts_endpoints(self):
        """Test MT5 accounts management endpoints"""
        # Test add MT5 account
        account_data = {
            "name": "Test MT5 Account",
            "login": "12345678",
            "password": "test_password",
            "server": "TestBroker-Demo",
            "platform": "mt5"
        }
        
        success, response = self.run_test(
            "Add MT5 Account", "POST", "mt5/accounts", 200, data=account_data
        )
        
        if not success:
            return False
        
        account_id = response.get('id')
        print(f"   Created account ID: {account_id}")
        
        # Test get MT5 accounts
        success, accounts = self.run_test(
            "Get MT5 Accounts", "GET", "mt5/accounts", 200
        )
        
        if success:
            print(f"   Total accounts: {len(accounts)}")
        
        # Test sync MT5 account
        if account_id:
            success_sync, sync_response = self.run_test(
                "Sync MT5 Account", "POST", f"mt5/accounts/{account_id}/sync", 200
            )
            
            if success_sync:
                print(f"   Sync response: {sync_response.get('message', '')}")
        
        return success

    def test_enhanced_trade_form_fields(self):
        """Test creating trade with all enhanced fields"""
        trade_data = {
            "instrument": "XAU/USD",
            "position": "buy",
            "entry_price": 1950.50,
            "exit_price": 1965.75,
            "quantity": 0.1,
            "entry_date": "2024-08-01",
            "exit_date": "2024-08-02", 
            "notes": "Test trade with all enhanced fields",
            "status": "closed",
            "stop_loss": 1940.00,
            "take_profit": 1970.00,
            "commission": 5.50,
            "swap": -2.30
        }
        
        success, response = self.run_test(
            "Enhanced Trade Creation", "POST", "trades", 200, data=trade_data
        )
        
        if success:
            trade = response
            print(f"   Trade P&L: {trade.get('pnl')}")
            print(f"   Trade P&L %: {trade.get('pnl_percentage')}")
            print(f"   Commission: {trade.get('commission')}")
            print(f"   Swap: {trade.get('swap')}")
        
        return success

def main():
    print("🚀 Starting Enhanced Trading Journal Tests...")
    print("=" * 50)
    
    tester = EnhancedTradingJournalTester()
    
    # Setup authentication first
    if not tester.setup_auth():
        print("❌ Failed to setup authentication")
        return 1
    
    # Test sequence for enhanced features
    test_sequence = [
        ("Daily Analytics", tester.test_daily_analytics),
        ("Balance History", tester.test_balance_history),
        ("Trade Count History", tester.test_trade_count_history),
        ("MT5 Accounts Management", tester.test_mt5_accounts_endpoints),
        ("Enhanced Trade Form", tester.test_enhanced_trade_form_fields),
    ]
    
    failed_tests = []
    
    for test_name, test_func in test_sequence:
        try:
            if not test_func():
                failed_tests.append(test_name)
        except Exception as e:
            print(f"❌ {test_name} - Exception: {str(e)}")
            failed_tests.append(test_name)
    
    # Print results
    print("\n" + "=" * 50)
    print("📊 ENHANCED FEATURES TEST RESULTS")
    print("=" * 50)
    print(f"Total tests run: {tester.tests_run}")
    print(f"Tests passed: {tester.tests_passed}")
    print(f"Tests failed: {tester.tests_run - tester.tests_passed}")
    print(f"Success rate: {(tester.tests_passed / tester.tests_run * 100):.1f}%")
    
    if failed_tests:
        print(f"\n❌ Failed tests:")
        for test in failed_tests:
            print(f"   - {test}")
    else:
        print("\n🎉 All enhanced features working!")
    
    return 0 if len(failed_tests) == 0 else 1

if __name__ == "__main__":
    sys.exit(main())