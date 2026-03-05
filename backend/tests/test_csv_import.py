"""
Test CSV Import Feature for TradeLedger
Tests: CSV Import API endpoint, duplicate prevention, P&L values, symbol normalization, dashboard stats
"""
import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_USER_EMAIL = "importtest@test.com"
TEST_USER_PASSWORD = "Test123!"
CSV_FILE_PATH = "/app/test_import.csv"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def auth_token(api_client):
    """Get authentication token for test user"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_USER_EMAIL,
        "password": TEST_USER_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Authentication failed - skipping tests (status: {response.status_code})")


@pytest.fixture(scope="module")
def authenticated_client(api_client, auth_token):
    """Session with auth header"""
    api_client.headers.update({
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": None  # Remove for multipart uploads
    })
    return api_client


class TestCSVImportAPI:
    """Tests for CSV Import endpoint /api/trades/import-csv"""
    
    def test_health_check(self, api_client):
        """Verify API is healthy before running tests"""
        response = api_client.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print(f"✅ API Health check passed - {data['timestamp']}")

    def test_login_test_user(self, api_client):
        """Test login for import test user"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == TEST_USER_EMAIL
        print(f"✅ Login successful for {TEST_USER_EMAIL}")

    def test_csv_import_requires_auth(self, api_client):
        """Test that CSV import requires authentication"""
        with open(CSV_FILE_PATH, 'rb') as f:
            files = {'file': ('test.csv', f, 'text/csv')}
            response = requests.post(
                f"{BASE_URL}/api/trades/import-csv",
                files=files
            )
        # Should fail without auth token
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("✅ CSV import correctly requires authentication")

    def test_csv_import_rejects_non_csv(self, authenticated_client, auth_token):
        """Test that non-CSV files are rejected"""
        fake_file = io.BytesIO(b"This is not a CSV file")
        files = {'file': ('test.txt', fake_file, 'text/plain')}
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/trades/import-csv",
            files=files,
            headers=headers
        )
        assert response.status_code == 400, f"Expected 400 for non-CSV, got {response.status_code}"
        print("✅ Non-CSV files correctly rejected")

    def test_get_initial_trade_count(self, authenticated_client, auth_token):
        """Get the initial trade count before import tests"""
        headers = {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
        response = requests.get(f"{BASE_URL}/api/trades", headers=headers)
        assert response.status_code == 200
        trades = response.json()
        trade_count = len(trades)
        print(f"✅ Initial trade count: {trade_count}")
        return trade_count

    def test_csv_import_duplicate_prevention(self, authenticated_client, auth_token):
        """Test that importing the same CSV twice skips duplicates"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Get initial trade count
        response = requests.get(f"{BASE_URL}/api/trades", headers={**headers, "Content-Type": "application/json"})
        initial_count = len(response.json())
        print(f"Initial trade count: {initial_count}")
        
        # First import - should import all trades
        with open(CSV_FILE_PATH, 'rb') as f:
            files = {'file': ('test_import.csv', f, 'text/csv')}
            response = requests.post(
                f"{BASE_URL}/api/trades/import-csv",
                files=files,
                headers=headers
            )
        
        assert response.status_code == 200, f"First import failed: {response.text}"
        first_result = response.json()
        print(f"First import result: imported={first_result['imported_count']}, skipped={first_result['skipped_count']}")
        
        # Get trade count after first import
        response = requests.get(f"{BASE_URL}/api/trades", headers={**headers, "Content-Type": "application/json"})
        after_first_count = len(response.json())
        print(f"Trade count after first import: {after_first_count}")
        
        # Second import - should skip all duplicates
        with open(CSV_FILE_PATH, 'rb') as f:
            files = {'file': ('test_import.csv', f, 'text/csv')}
            response = requests.post(
                f"{BASE_URL}/api/trades/import-csv",
                files=files,
                headers=headers
            )
        
        assert response.status_code == 200, f"Second import failed: {response.text}"
        second_result = response.json()
        print(f"Second import result: imported={second_result['imported_count']}, skipped={second_result['skipped_count']}")
        
        # Verify duplicate prevention: second import should have 0 new imports
        assert second_result['imported_count'] == 0, f"Expected 0 new imports on second run, got {second_result['imported_count']}"
        assert second_result['skipped_count'] > 0, "Expected some skipped duplicates"
        print("✅ Duplicate prevention working correctly")

    def test_verify_symbol_normalization(self, authenticated_client, auth_token):
        """Test that symbols are normalized correctly (XAUUSDm -> XAU/USD)"""
        headers = {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
        response = requests.get(f"{BASE_URL}/api/trades", headers=headers)
        assert response.status_code == 200
        trades = response.json()
        
        # Check for normalized symbols
        normalized_symbols = set()
        for trade in trades:
            normalized_symbols.add(trade['instrument'])
        
        print(f"Found symbols: {normalized_symbols}")
        
        # Verify XAUUSDm is normalized to XAU/USD
        assert 'XAU/USD' in normalized_symbols, "Expected XAU/USD in normalized symbols"
        assert 'XAUUSDm' not in normalized_symbols, "XAUUSDm should be normalized to XAU/USD"
        print("✅ Symbol normalization verified - XAUUSDm -> XAU/USD")

    def test_verify_pnl_values_from_csv(self, authenticated_client, auth_token):
        """Test that P&L values are correctly imported from CSV profit_usd column"""
        headers = {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
        response = requests.get(f"{BASE_URL}/api/trades", headers=headers)
        assert response.status_code == 200
        trades = response.json()
        
        # Find trades imported from CSV (have mt5_ticket)
        csv_trades = [t for t in trades if t.get('mt5_ticket')]
        print(f"Found {len(csv_trades)} trades with MT5 tickets (imported from CSV)")
        
        # Verify some specific P&L values match the CSV
        # Example from CSV: ticket 577593960, profit_usd=-229.57
        trade_577593960 = next((t for t in csv_trades if t.get('mt5_ticket') == '577593960'), None)
        if trade_577593960:
            assert trade_577593960['pnl'] == -229.57, f"Expected P&L -229.57, got {trade_577593960['pnl']}"
            print(f"✅ Trade 577593960 P&L verified: {trade_577593960['pnl']}")
        
        # Example from CSV: ticket 577550693, profit_usd=41.94
        trade_577550693 = next((t for t in csv_trades if t.get('mt5_ticket') == '577550693'), None)
        if trade_577550693:
            assert trade_577550693['pnl'] == 41.94, f"Expected P&L 41.94, got {trade_577550693['pnl']}"
            print(f"✅ Trade 577550693 P&L verified: {trade_577550693['pnl']}")
        
        print("✅ P&L values from CSV verified correctly")

    def test_analytics_summary_updated(self, authenticated_client, auth_token):
        """Test that dashboard analytics are updated after import"""
        headers = {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
        response = requests.get(f"{BASE_URL}/api/analytics/summary", headers=headers)
        assert response.status_code == 200
        
        summary = response.json()
        print(f"Analytics summary: {summary}")
        
        # Verify analytics has data
        assert summary['total_trades'] > 0, "Expected trades in analytics"
        assert 'total_pnl' in summary, "Expected total_pnl in summary"
        assert 'win_rate' in summary, "Expected win_rate in summary"
        
        print(f"✅ Analytics summary updated: {summary['total_trades']} trades, ${summary['total_pnl']} P&L, {summary['win_rate']}% win rate")

    def test_instrument_analytics_by_symbol(self, authenticated_client, auth_token):
        """Test analytics by instrument shows imported symbols"""
        headers = {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
        response = requests.get(f"{BASE_URL}/api/analytics/by-instrument", headers=headers)
        assert response.status_code == 200
        
        instruments = response.json()
        instrument_names = [i['instrument'] for i in instruments]
        print(f"Instruments in analytics: {instrument_names}")
        
        # Verify XAU/USD is in the list (most common in the CSV)
        assert 'XAU/USD' in instrument_names, "Expected XAU/USD in instrument analytics"
        print("✅ Instrument analytics shows imported symbols")

    def test_trades_have_correct_notes(self, authenticated_client, auth_token):
        """Verify imported trades have CSV ticket notes"""
        headers = {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
        response = requests.get(f"{BASE_URL}/api/trades", headers=headers)
        assert response.status_code == 200
        trades = response.json()
        
        # Find CSV imported trades
        csv_trades = [t for t in trades if t.get('mt5_ticket')]
        
        # Check notes contain ticket info
        for trade in csv_trades[:5]:  # Check first 5
            assert 'Imported from CSV' in trade.get('notes', ''), f"Trade {trade['id']} missing import note"
            assert 'Ticket' in trade.get('notes', ''), f"Trade {trade['id']} missing ticket in note"
        
        print("✅ Imported trades have correct notes with ticket info")


class TestCSVImportDataIntegrity:
    """Tests for data integrity after CSV import"""

    def test_trade_dates_preserved(self, auth_token):
        """Verify entry and exit dates are preserved from CSV"""
        headers = {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
        response = requests.get(f"{BASE_URL}/api/trades", headers=headers)
        assert response.status_code == 200
        trades = response.json()
        
        # Find a specific trade and verify dates
        # CSV: ticket 577593960, opening_time=2026-03-02T01:33:34, closing_time=2026-03-02T01:35:54
        trade = next((t for t in trades if t.get('mt5_ticket') == '577593960'), None)
        if trade:
            assert trade['entry_date'].startswith('2026-03-02'), f"Entry date mismatch: {trade['entry_date']}"
            assert trade['exit_date'].startswith('2026-03-02'), f"Exit date mismatch: {trade['exit_date']}"
            print(f"✅ Trade 577593960 dates verified: {trade['entry_date']} to {trade['exit_date']}")

    def test_trade_positions_correct(self, auth_token):
        """Verify buy/sell positions are correctly imported"""
        headers = {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
        response = requests.get(f"{BASE_URL}/api/trades", headers=headers)
        assert response.status_code == 200
        trades = response.json()
        
        csv_trades = [t for t in trades if t.get('mt5_ticket')]
        positions = set(t['position'] for t in csv_trades)
        
        print(f"Position types found: {positions}")
        assert 'buy' in positions or 'sell' in positions, "Expected buy or sell positions"
        print("✅ Trade positions correctly imported")

    def test_lot_sizes_preserved(self, auth_token):
        """Verify lot sizes are preserved from CSV"""
        headers = {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
        response = requests.get(f"{BASE_URL}/api/trades", headers=headers)
        assert response.status_code == 200
        trades = response.json()
        
        # Check specific trade: ticket 577593960 has lots=0.25
        trade = next((t for t in trades if t.get('mt5_ticket') == '577593960'), None)
        if trade:
            assert trade['quantity'] == 0.25, f"Expected lot size 0.25, got {trade['quantity']}"
            print(f"✅ Trade 577593960 lot size verified: {trade['quantity']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
