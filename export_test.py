import requests
import sys
from datetime import datetime

class ExportTester:
    def __init__(self):
        self.base_url = "https://trade-ledger-18.preview.emergentagent.com/api"
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0

    def register_and_get_token(self):
        """Register a user and get token"""
        timestamp = datetime.now().strftime("%H%M%S")
        test_data = {
            "email": f"export_test_{timestamp}@example.com",
            "password": "TestPass123!",
            "name": f"Export Test User {timestamp}"
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/auth/register", 
                json=test_data, 
                headers={'Content-Type': 'application/json'},
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                self.token = data['access_token']
                print(f"✅ User registered and token obtained")
                return True
            else:
                print(f"❌ Registration failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Registration error: {str(e)}")
            return False

    def create_sample_trade(self):
        """Create a sample trade for testing"""
        trade_data = {
            "instrument": "XAU/USD",
            "position": "buy",
            "entry_price": 2050.50,
            "exit_price": 2055.75,
            "quantity": 0.1,
            "entry_date": "2024-01-15",
            "exit_date": "2024-01-16",
            "notes": "Sample trade for export testing",
            "status": "closed"
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/trades",
                json=trade_data,
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': f'Bearer {self.token}'
                },
                timeout=30
            )
            
            if response.status_code == 200:
                print(f"✅ Sample trade created successfully")
                return True
            else:
                print(f"❌ Trade creation failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Trade creation error: {str(e)}")
            return False

    def test_csv_export(self):
        """Test CSV export endpoint"""
        self.tests_run += 1
        print(f"\n🔍 Testing CSV Export...")
        
        try:
            response = requests.get(
                f"{self.base_url}/export/trades/csv",
                headers={'Authorization': f'Bearer {self.token}'},
                timeout=30
            )
            
            if response.status_code == 200:
                content_type = response.headers.get('content-type', '')
                content_length = len(response.content)
                
                if 'text/csv' in content_type and content_length > 0:
                    self.tests_passed += 1
                    print(f"✅ Passed - Status: 200, Content-Type: {content_type}, Size: {content_length} bytes")
                    # Check if CSV contains header
                    csv_content = response.text
                    if 'Instrument' in csv_content and 'Position' in csv_content:
                        print(f"✅ CSV contains proper headers")
                        return True
                    else:
                        print(f"❌ CSV missing expected headers")
                        return False
                else:
                    print(f"❌ Invalid content type or empty file: {content_type}, {content_length} bytes")
                    return False
            else:
                print(f"❌ Failed - Status: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False

    def test_xlsx_export(self):
        """Test XLSX export endpoint"""
        self.tests_run += 1
        print(f"\n🔍 Testing XLSX Export...")
        
        try:
            response = requests.get(
                f"{self.base_url}/export/trades/xlsx",
                headers={'Authorization': f'Bearer {self.token}'},
                timeout=30
            )
            
            if response.status_code == 200:
                content_type = response.headers.get('content-type', '')
                content_length = len(response.content)
                
                expected_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                if expected_type in content_type and content_length > 0:
                    self.tests_passed += 1
                    print(f"✅ Passed - Status: 200, Content-Type: {content_type}, Size: {content_length} bytes")
                    return True
                else:
                    print(f"❌ Invalid content type or empty file: {content_type}, {content_length} bytes")
                    return False
            else:
                print(f"❌ Failed - Status: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False

def main():
    print("🚀 Starting Export Endpoints Tests...")
    print("=" * 50)
    
    tester = ExportTester()
    
    # Setup
    if not tester.register_and_get_token():
        print("❌ Failed to setup test user")
        return 1
    
    if not tester.create_sample_trade():
        print("❌ Failed to create sample trade")
        return 1
    
    # Test exports
    csv_success = tester.test_csv_export()
    xlsx_success = tester.test_xlsx_export()
    
    # Print results
    print("\n" + "=" * 50)
    print("📊 EXPORT TESTS SUMMARY")
    print("=" * 50)
    print(f"Total tests run: {tester.tests_run}")
    print(f"Tests passed: {tester.tests_passed}")
    print(f"Tests failed: {tester.tests_run - tester.tests_passed}")
    print(f"Success rate: {(tester.tests_passed / tester.tests_run * 100):.1f}%")
    
    if not (csv_success and xlsx_success):
        failed_tests = []
        if not csv_success:
            failed_tests.append("CSV Export")
        if not xlsx_success:
            failed_tests.append("XLSX Export")
        
        print(f"\n❌ Failed tests:")
        for test in failed_tests:
            print(f"   - {test}")
        return 1
    else:
        print("\n🎉 All export tests passed!")
        return 0

if __name__ == "__main__":
    sys.exit(main())