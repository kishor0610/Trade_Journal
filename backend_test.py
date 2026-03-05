import requests
import sys
from datetime import datetime

class TradingJournalAPITester:
    def __init__(self):
        self.base_url = "https://trading-log-pro-1.preview.emergentagent.com/api"
        self.token = None
        self.admin_token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_trade_id = None
        self.reset_token = None

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
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)

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

    def test_health_check(self):
        """Test health check endpoint"""
        return self.run_test("Health Check", "GET", "health", 200, auth_required=False)

    def test_user_registration(self):
        """Test user registration"""
        timestamp = datetime.now().strftime("%H%M%S")
        test_data = {
            "email": f"test_user_{timestamp}@example.com",
            "password": "TestPass123!",
            "name": f"Test User {timestamp}"
        }
        
        success, response = self.run_test(
            "User Registration", "POST", "auth/register", 200, 
            data=test_data, auth_required=False
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            print(f"   Token obtained: {self.token[:20]}...")
            return True
        return False

    def test_user_login(self):
        """Test login endpoint with existing user"""
        # First register a user
        timestamp = datetime.now().strftime("%H%M%S") + "login"
        reg_data = {
            "email": f"login_test_{timestamp}@example.com",
            "password": "TestPass123!",
            "name": f"Login Test {timestamp}"
        }
        
        # Register
        reg_success, _ = self.run_test(
            "Registration for Login Test", "POST", "auth/register", 200,
            data=reg_data, auth_required=False
        )
        
        if not reg_success:
            return False
        
        # Now test login
        login_data = {
            "email": reg_data["email"],
            "password": reg_data["password"]
        }
        
        success, response = self.run_test(
            "User Login", "POST", "auth/login", 200,
            data=login_data, auth_required=False
        )
        
        return success and 'access_token' in response

    def test_get_user_profile(self):
        """Test get user profile"""
        return self.run_test("Get User Profile", "GET", "auth/me", 200)[0]

    def test_create_trade(self):
        """Test creating a trade"""
        trade_data = {
            "instrument": "BTC",
            "position": "long",
            "entry_price": 45000.50,
            "exit_price": None,
            "quantity": 0.1,
            "entry_date": "2024-01-15",
            "exit_date": None,
            "notes": "Test trade creation",
            "status": "open"
        }
        
        success, response = self.run_test(
            "Create Trade", "POST", "trades", 200, data=trade_data
        )
        
        if success and 'id' in response:
            self.test_trade_id = response['id']
            print(f"   Trade created with ID: {self.test_trade_id}")
            return True
        return False

    def test_get_trades(self):
        """Test getting trades list"""
        return self.run_test("Get Trades List", "GET", "trades", 200)[0]

    def test_get_trade_by_id(self):
        """Test getting specific trade by ID"""
        if not self.test_trade_id:
            print("❌ No test trade ID available")
            return False
        
        return self.run_test(
            f"Get Trade by ID", "GET", f"trades/{self.test_trade_id}", 200
        )[0]

    def test_update_trade(self):
        """Test updating a trade"""
        if not self.test_trade_id:
            print("❌ No test trade ID available")
            return False
        
        update_data = {
            "exit_price": 46000.75,
            "exit_date": "2024-01-16",
            "status": "closed",
            "notes": "Updated test trade - closed position"
        }
        
        return self.run_test(
            "Update Trade", "PUT", f"trades/{self.test_trade_id}", 200, 
            data=update_data
        )[0]

    def test_analytics_summary(self):
        """Test analytics summary endpoint"""
        return self.run_test("Analytics Summary", "GET", "analytics/summary", 200)[0]

    def test_analytics_by_instrument(self):
        """Test analytics by instrument endpoint"""
        return self.run_test("Analytics by Instrument", "GET", "analytics/by-instrument", 200)[0]

    def test_analytics_monthly(self):
        """Test monthly analytics endpoint"""
        return self.run_test("Monthly Analytics", "GET", "analytics/monthly", 200)[0]

    def test_ai_insights(self):
        """Test AI insights endpoint"""
        insight_data = {
            "question": "What are my trading patterns?"
        }
        
        success, response = self.run_test(
            "AI Insights", "POST", "ai/insights", 200, data=insight_data
        )
        
        if success:
            print(f"   AI Response length: {len(str(response.get('insight', '')))}")
        return success

    def test_delete_trade(self):
        """Test deleting a trade"""
        if not self.test_trade_id:
            print("❌ No test trade ID available")
            return False
        
        return self.run_test(
            "Delete Trade", "DELETE", f"trades/{self.test_trade_id}", 200
        )[0]

    def test_invalid_auth(self):
        """Test invalid authentication"""
        # Save current token
        original_token = self.token
        self.token = "invalid_token"
        
        success, _ = self.run_test("Invalid Auth Test", "GET", "auth/me", 401)
        
        # Restore token
        self.token = original_token
        return success

    def test_forgot_password(self):
        """Test forgot password functionality"""
        # First register a user for this test
        timestamp = datetime.now().strftime("%H%M%S") + "forgot"
        reg_data = {
            "email": f"forgot_test_{timestamp}@example.com",
            "password": "TestPass123!",
            "name": f"Forgot Test {timestamp}"
        }
        
        # Register user first
        reg_success, _ = self.run_test(
            "Registration for Forgot Password Test", "POST", "auth/register", 200,
            data=reg_data, auth_required=False
        )
        
        if not reg_success:
            return False
        
        # Test forgot password
        forgot_data = {"email": reg_data["email"]}
        success, response = self.run_test(
            "Forgot Password", "POST", "auth/forgot-password", 200,
            data=forgot_data, auth_required=False
        )
        
        if success and response.get('token'):
            self.reset_token = response['token']
            print(f"   Reset token obtained: {self.reset_token[:20]}...")
            return True
        return success

    def test_verify_reset_token(self):
        """Test verify reset token"""
        if not self.reset_token:
            print("❌ No reset token available")
            return False
        
        return self.run_test(
            "Verify Reset Token", "GET", f"auth/verify-reset-token?token={self.reset_token}", 200,
            auth_required=False
        )[0]

    def test_reset_password(self):
        """Test reset password functionality"""
        if not self.reset_token:
            print("❌ No reset token available")
            return False
        
        reset_data = {
            "token": self.reset_token,
            "new_password": "NewTestPass123!"
        }
        
        return self.run_test(
            "Reset Password", "POST", "auth/reset-password", 200,
            data=reset_data, auth_required=False
        )[0]

    def test_admin_login(self):
        """Test admin login"""
        admin_data = {
            "email": "admin@tradeledger.com",
            "password": "TradeLedger@Admin2024"
        }
        
        success, response = self.run_test(
            "Admin Login", "POST", "admin/login", 200,
            data=admin_data, auth_required=False
        )
        
        if success and 'access_token' in response:
            self.admin_token = response['access_token']
            print(f"   Admin token obtained: {self.admin_token[:20]}...")
            return True
        return False

    def test_admin_stats(self):
        """Test admin stats endpoint"""
        if not self.admin_token:
            print("❌ No admin token available")
            return False
        
        # Save current token and use admin token
        original_token = self.token
        self.token = self.admin_token
        
        success, response = self.run_test("Admin Stats", "GET", "admin/stats", 200)
        
        if success:
            print(f"   Total users: {response.get('total_users', 0)}")
            print(f"   Total trades: {response.get('total_trades', 0)}")
            print(f"   Total P&L: ${response.get('total_pnl', 0)}")
        
        # Restore token
        self.token = original_token
        return success

    def test_admin_users_list(self):
        """Test admin users list endpoint"""
        if not self.admin_token:
            print("❌ No admin token available")
            return False
        
        # Save current token and use admin token
        original_token = self.token
        self.token = self.admin_token
        
        success, response = self.run_test("Admin Users List", "GET", "admin/users", 200)
        
        if success:
            users_count = len(response.get('users', []))
            print(f"   Found {users_count} users")
        
        # Restore token
        self.token = original_token
        return success

    def test_admin_user_details(self):
        """Test admin user details endpoint"""
        if not self.admin_token or not self.user_id:
            print("❌ No admin token or user ID available")
            return False
        
        # Save current token and use admin token
        original_token = self.token
        self.token = self.admin_token
        
        success, response = self.run_test(
            "Admin User Details", "GET", f"admin/users/{self.user_id}", 200
        )
        
        if success:
            user_name = response.get('user', {}).get('name', 'Unknown')
            trade_count = response.get('stats', {}).get('total_trades', 0)
            print(f"   User: {user_name}, Trades: {trade_count}")
        
        # Restore token
        self.token = original_token
        return success

    def test_admin_all_trades(self):
        """Test admin all trades endpoint"""
        if not self.admin_token:
            print("❌ No admin token available")
            return False
        
        # Save current token and use admin token
        original_token = self.token
        self.token = self.admin_token
        
        success, response = self.run_test("Admin All Trades", "GET", "admin/trades", 200)
        
        if success:
            trades_count = len(response.get('trades', []))
            print(f"   Found {trades_count} trades across all users")
        
        # Restore token
        self.token = original_token
        return success

    def test_admin_activity(self):
        """Test admin recent activity endpoint"""
        if not self.admin_token:
            print("❌ No admin token available")
            return False
        
        # Save current token and use admin token
        original_token = self.token
        self.token = self.admin_token
        
        success, response = self.run_test("Admin Recent Activity", "GET", "admin/activity", 200)
        
        if success:
            recent_users = len(response.get('recent_users', []))
            recent_trades = len(response.get('recent_trades', []))
            print(f"   Recent users: {recent_users}, Recent trades: {recent_trades}")
        
        # Restore token
        self.token = original_token
        return success

    def test_admin_unauthorized_access(self):
        """Test unauthorized admin access with regular user token"""
        if not self.token:
            print("❌ No user token available")
            return False
        
        # Try to access admin endpoint with regular user token (should fail)
        success, _ = self.run_test("Admin Unauthorized Access", "GET", "admin/stats", 403)
        return success

def main():
    print("🚀 Starting Trading Journal API Tests...")
    print("=" * 50)
    
    tester = TradingJournalAPITester()
    
    # Test sequence
    test_sequence = [
        ("Health Check", tester.test_health_check),
        ("User Registration", tester.test_user_registration),
        ("User Login", tester.test_user_login),
        ("Get User Profile", tester.test_get_user_profile),
        ("Create Trade", tester.test_create_trade),
        ("Get Trades List", tester.test_get_trades),
        ("Get Trade by ID", tester.test_get_trade_by_id),
        ("Update Trade", tester.test_update_trade),
        ("Analytics Summary", tester.test_analytics_summary),
        ("Analytics by Instrument", tester.test_analytics_by_instrument),
        ("Monthly Analytics", tester.test_analytics_monthly),
        ("AI Insights", tester.test_ai_insights),
        ("Delete Trade", tester.test_delete_trade),
        ("Invalid Auth Test", tester.test_invalid_auth),
        # Forgot Password Flow
        ("Forgot Password", tester.test_forgot_password),
        ("Verify Reset Token", tester.test_verify_reset_token),
        ("Reset Password", tester.test_reset_password),
        # Admin Dashboard Tests
        ("Admin Login", tester.test_admin_login),
        ("Admin Stats", tester.test_admin_stats),
        ("Admin Users List", tester.test_admin_users_list),
        ("Admin User Details", tester.test_admin_user_details),
        ("Admin All Trades", tester.test_admin_all_trades),
        ("Admin Recent Activity", tester.test_admin_activity),
        ("Admin Unauthorized Access", tester.test_admin_unauthorized_access),
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
    print("📊 TEST RESULTS SUMMARY")
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
        print("\n🎉 All tests passed!")
    
    return 0 if len(failed_tests) == 0 else 1

if __name__ == "__main__":
    sys.exit(main())