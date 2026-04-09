# Google Cloud Run Environment Variables Setup

## Adding FINNHUB_API_KEY to Google Cloud Run

### Method 1: Via Google Cloud Console (Recommended)

1. **Go to Cloud Run Console:**
   - Visit: https://console.cloud.google.com/run
   - Select your service: `trade-journal-backend`

2. **Edit Service Configuration:**
   - Click on your service name
   - Click "EDIT & DEPLOY NEW REVISION" button at the top

3. **Add Environment Variable:**
   - Scroll down to "Container, Variables & Secrets, Connections, Security" section
   - Click on "VARIABLES & SECRETS" tab
   - Click "+ ADD VARIABLE"
   - Enter:
     - **Name:** `FINNHUB_API_KEY`
     - **Value:** `d7bdvvhr01qgc9t72sc0d7bdvvhr01qgc9t72scg`

4. **Deploy:**
   - Scroll to bottom and click "DEPLOY"
   - Wait for deployment to complete (usually 1-2 minutes)

---

### Method 2: Via gcloud CLI

```bash
gcloud run services update trade-journal-backend \
  --update-env-vars FINNHUB_API_KEY=d7bdvvhr01qgc9t72sc0d7bdvvhr01qgc9t72scg \
  --region YOUR_REGION
```

Replace `YOUR_REGION` with your actual region (e.g., `us-central1`)

---

### Method 3: Via Cloud Run YAML

If you deploy using YAML, add this to your environment variables:

```yaml
env:
  - name: FINNHUB_API_KEY
    value: d7bdvvhr01qgc9t72sc0d7bdvvhr01qgc9t72scg
```

---

## All Required Environment Variables

Make sure these are set in your Cloud Run service:

### Required for Market Ticker:
- ✅ `FINNHUB_API_KEY` - For market quotes, news, and economic calendar

### Required for Core Functionality:
- ✅ `MONGO_URL` - MongoDB connection string
- ✅ `DB_NAME` - Database name (default: trade_ledger_18)
- ✅ `JWT_SECRET` - Secret key for JWT tokens
- ✅ `FRONTEND_URL` - Your frontend URL
- ✅ `CORS_ORIGINS` - Allowed origins for CORS

### Optional but Recommended:
- `ADMIN_EMAIL` - Admin email (default: admin@tradeledger.com)
- `ADMIN_PASSWORD` - Admin password
- `RESEND_API_KEY` - For email functionality
- `METAAPI_TOKEN` - For MT5 integration
- `GROQ_API_KEY` - For AI insights
- `TWELVE_DATA_API_KEY` - For additional market data

---

## Verify Environment Variable is Set

After deployment, check if the variable is set:

```bash
gcloud run services describe trade-journal-backend \
  --region YOUR_REGION \
  --format='value(spec.template.spec.containers[0].env)'
```

---

## Testing

After adding the environment variable:

1. **Check Backend Logs:**
   ```bash
   gcloud run services logs read trade-journal-backend \
     --region YOUR_REGION \
     --limit=50
   ```

2. **Test API Endpoint:**
   ```bash
   curl https://YOUR-SERVICE-URL/api/quotes
   ```

You should see JSON with market data.

---

## Troubleshooting

### Issue: "Market data unavailable"

**Solution:**
1. Check if FINNHUB_API_KEY is set correctly
2. Verify the API key is valid
3. Check Cloud Run logs for errors:
   ```bash
   gcloud run services logs read trade-journal-backend --region YOUR_REGION
   ```

### Issue: Environment variable not taking effect

**Solution:**
1. Make sure you deployed a new revision after adding the variable
2. Force a new deployment:
   ```bash
   gcloud run services update trade-journal-backend \
     --region YOUR_REGION \
     --no-traffic
   gcloud run services update-traffic trade-journal-backend \
     --region YOUR_REGION \
     --to-latest
   ```

---

## Security Note

For production, consider using **Google Secret Manager** instead of plain environment variables:

1. Create secret in Secret Manager:
   ```bash
   echo -n "d7bdvvhr01qgc9t72sc0d7bdvvhr01qgc9t72scg" | \
   gcloud secrets create finnhub-api-key --data-file=-
   ```

2. Grant Cloud Run access:
   ```bash
   gcloud secrets add-iam-policy-binding finnhub-api-key \
     --member=serviceAccount:YOUR-SERVICE-ACCOUNT \
     --role=roles/secretmanager.secretAccessor
   ```

3. Mount secret in Cloud Run:
   - In Console: Use "Reference a secret" option
   - Via CLI:
     ```bash
     gcloud run services update trade-journal-backend \
       --update-secrets=FINNHUB_API_KEY=finnhub-api-key:latest \
       --region YOUR_REGION
     ```
