import requests
import time

# Create a user for UI testing
def create_test_user():
    timestamp = str(int(time.time()))[-6:]
    user_data = {
        "email": f"ui_test_{timestamp}@example.com",
        "password": "TestPass123!",
        "name": f"UI Test User {timestamp}"
    }
    
    try:
        response = requests.post(
            "https://trading-log-pro-1.preview.emergentagent.com/api/auth/register",
            json=user_data,
            headers={'Content-Type': 'application/json'},
            timeout=30
        )
        
        if response.status_code == 200:
            print(f"✅ User created successfully: {user_data['email']}")
            print(f"Password: {user_data['password']}")
            return user_data
        else:
            print(f"❌ Failed to create user: {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ Error creating user: {str(e)}")
        return None

if __name__ == "__main__":
    create_test_user()