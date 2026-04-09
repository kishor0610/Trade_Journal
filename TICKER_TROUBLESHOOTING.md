# Troubleshooting Market Ticker Not Showing Data

## Issue: Market ticker shows but no crypto/metals data appears

### Step-by-Step Debugging

---

## 1. Verify Environment Variable in Cloud Run

### Check if FINNHUB_API_KEY is set:

```bash
gcloud run services describe trade-journal-backend \
  --region YOUR_REGION \
  --format='get(spec.template.spec.containers[0].env)'
```

**Look for:** `name: FINNHUB_API_KEY, value: d7bdvvhr01qgc9t72sc0d7bdvvhr01qgc9t72scg`

---

## 2. Check Backend Logs

```bash
# View recent logs
gcloud run services logs read trade-journal-backend \
  --region YOUR_REGION \
  --limit=100

# Follow logs in real-time
gcloud run services logs tail trade-journal-backend \
  --region YOUR_REGION
```

**Look for:**
- `📊 Fetching market quotes from Finnhub`
- `✅ BTC-USD: $...`
- `✅ Successfully fetched X/12 quotes`

**If you see errors:**
- `❌ Error fetching...` - API issue
- `Invalid API key` - Wrong key
- No messages at all - Endpoint not being called

---

## 3. Test API Endpoint Directly

### Get your Cloud Run URL:
```bash
gcloud run services describe trade-journal-backend \
  --region YOUR_REGION \
  --format='value(status.url)'
```

### Test the quotes endpoint:
```bash
curl https://YOUR-SERVICE-URL/api/quotes
```

**Expected Response:**
```json
[
  {
    "symbol": "BTC-USD",
    "price": 70946.33,
    "change": -963.87,
    "percent": -1.34
  },
  {
    "symbol": "ETH-USD",
    "price": 2187.12,
    "change": -52.56,
    "percent": -2.35
  },
  ...
]
```

**If you get empty array `[]`:**
- API key might be invalid
- Finnhub API might be rate-limited
- Network issue from Cloud Run

---

## 4. Force New Deployment

Sometimes environment variables don't take effect immediately:

```bash
# Force a new revision
gcloud run deploy trade-journal-backend \
  --source . \
  --region YOUR_REGION \
  --update-env-vars FINNHUB_API_KEY=d7bdvvhr01qgc9t72sc0d7bdvvhr01qgc9t72scg
```

Or via Console:
1. Go to Cloud Run → Your service
2. Click "EDIT & DEPLOY NEW REVISION"
3. Don't change anything
4. Click "DEPLOY"

This forces a fresh container with the new environment variable.

---

## 5. Check Frontend Console

Open browser DevTools (F12) on your app:

### Check Network Tab:
- Look for request to `/api/quotes`
- Status should be `200 OK`
- Response should have data

### Check Console Tab:
```
Market ticker data: Array(12)
```

**If you see:**
- `Market ticker fetch error` - Backend not responding
- `Market data unavailable` - Empty response from backend
- No logs at all - Ticker component not loading

---

## 6. Verify API Key is Valid

Test the Finnhub API directly:

```bash
curl "https://finnhub.io/api/v1/quote?symbol=BINANCE:BTCUSDT&token=d7bdvvhr01qgc9t72sc0d7bdvvhr01qgc9t72scg"
```

**Expected:**
```json
{
  "c": 70946.33,
  "d": -963.87,
  "dp": -1.34,
  "h": 72105.22,
  "l": 70450.11,
  "o": 71910.20,
  "pc": 71910.20,
  "t": 1744420800
}
```

**If you get error:**
```json
{
  "error": "Invalid API key"
}
```
→ The API key is wrong or expired

---

## 7. Common Issues & Solutions

### Issue: "Market data unavailable" on frontend

**Solution:**
1. Check if backend is running
2. Check CORS settings
3. Verify `REACT_APP_BACKEND_URL` in frontend env

### Issue: Backend logs show "Invalid API key"

**Solution:**
1. Verify the API key is correct
2. Get a new key from: https://finnhub.io/dashboard
3. Update environment variable in Cloud Run

### Issue: Some symbols work, others don't

**Solution:**
1. Check backend logs to see which symbols failed
2. Some symbols might require different API tier
3. Try with basic symbols first (AAPL, MSFT)

### Issue: Data shows initially then disappears

**Solution:**
1. Check rate limiting (Finnhub free tier: 60 calls/min)
2. Increase cache TTL in backend (currently 5 seconds)
3. Consider upgrading Finnhub plan

---

## 8. Quick Fix Checklist

✅ **Backend:**
- [ ] Environment variable `FINNHUB_API_KEY` is set
- [ ] Backend deployed after adding env var
- [ ] Backend logs show quote fetching
- [ ] `/api/quotes` endpoint returns data

✅ **Frontend:**
- [ ] `REACT_APP_BACKEND_URL` points to backend
- [ ] MarketTicker component is imported
- [ ] Browser console shows data fetch
- [ ] No CORS errors

✅ **API:**
- [ ] API key is valid (test with curl)
- [ ] Not rate limited (check Finnhub dashboard)
- [ ] Symbols are correct format

---

## 9. Alternative: Use Test Data

If API issues persist, temporarily use mock data:

Add to `backend/server.py`:

```python
@api_router.get("/quotes")
async def get_market_quotes():
    # DEBUG: Return test data
    return [
        {"symbol": "BTC-USD", "price": 70946.33, "change": -963.87, "percent": -1.34},
        {"symbol": "ETH-USD", "price": 2187.12, "change": -52.56, "percent": -2.35},
        {"symbol": "XAUUSD", "price": 2045.30, "change": 12.45, "percent": 0.61},
    ]
```

This will at least show the ticker working while you debug the API.

---

## 10. Contact Support

If still not working:

1. **Check Finnhub Status:** https://status.finnhub.io
2. **Finnhub Support:** support@finnhub.io
3. **Verify API Plan:** https://finnhub.io/dashboard

---

## Expected Behavior

When everything works correctly:

1. **Backend logs show:**
   ```
   📊 Fetching market quotes from Finnhub
   ✅ BTC-USD: $70946.33 (-1.34%)
   ✅ ETH-USD: $2187.12 (-2.35%)
   ✅ SOL-USD: $138.45 (+2.18%)
   ✅ XAUUSD: $2045.30 (+0.61%)
   ✅ XAGUSD: $24.56 (+0.85%)
   ...
   ✅ Successfully fetched 12/12 quotes
   ```

2. **Frontend shows:**
   - Black bar at top with scrolling tickers
   - All 12 symbols visible
   - Green/red colors
   - Prices updating every 5 seconds

3. **Mobile shows:**
   - Ticker visible above header
   - Smooth scrolling
   - Pause on touch/hover
