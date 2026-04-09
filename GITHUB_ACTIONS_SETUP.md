# GitHub Actions Auto-Deploy Setup

This will make your backend auto-deploy to Cloud Run whenever you push code.

---

## Prerequisites

You need:
1. Google Cloud project with Cloud Run enabled
2. Service account with deploy permissions
3. GitHub repository secrets configured

---

## Step 1: Create Service Account

```bash
# Set your project ID
export PROJECT_ID="your-project-id"
export SA_NAME="github-actions-deployer"

# Create service account
gcloud iam service-accounts create $SA_NAME \
  --display-name="GitHub Actions Deployer" \
  --project=$PROJECT_ID

# Grant necessary roles
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SA_NAME@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SA_NAME@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SA_NAME@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

# Create and download key
gcloud iam service-accounts keys create key.json \
  --iam-account=$SA_NAME@$PROJECT_ID.iam.gserviceaccount.com
```

---

## Step 2: Add GitHub Secrets

Go to your GitHub repo: https://github.com/kishor0610/Trade_Journal/settings/secrets/actions

Click **"New repository secret"** and add these:

### 1. GCP_PROJECT_ID
- **Name:** `GCP_PROJECT_ID`
- **Value:** Your Google Cloud project ID (e.g., `trade-ledger-12345`)

### 2. GCP_SA_KEY
- **Name:** `GCP_SA_KEY`
- **Value:** Paste the entire contents of `key.json` file

### 3. FINNHUB_API_KEY
- **Name:** `FINNHUB_API_KEY`
- **Value:** `d7bdvvhr01qgc9t72sc0d7bdvvhr01qgc9t72scg`

---

## Step 3: Update Region (if needed)

If your Cloud Run service is NOT in `us-central1`, edit the workflow file:

`.github/workflows/deploy-backend.yml`

Change:
```yaml
REGION: us-central1  # ← Change this to your region
```

To find your region:
```bash
gcloud run services describe trade-journal-backend --format='value(region)'
```

---

## Step 4: Test It!

Push any change to the `backend/` folder:

```bash
# Make a small change
echo "# Test" >> backend/server.py

# Commit and push
git add backend/server.py
git commit -m "test: Trigger auto-deploy"
git push
```

Go to: https://github.com/kishor0610/Trade_Journal/actions

You should see the workflow running!

---

## How It Works

1. **You push code** to `main` branch
2. **GitHub Actions detects** changes in `backend/` folder
3. **Authenticates** to Google Cloud using service account
4. **Deploys** new version to Cloud Run
5. **Updates** environment variables
6. **Done!** New code is live in ~2-3 minutes

---

## Workflow Triggers

The workflow runs when:
- ✅ You push to `main` branch
- ✅ Changes are in `backend/` folder
- ✅ Or workflow file itself is modified

It does NOT run when:
- ❌ Changes only in `frontend/`
- ❌ Changes only in docs/README

---

## Manual Trigger (Optional)

You can also trigger manually:

1. Go to: https://github.com/kishor0610/Trade_Journal/actions
2. Click "Deploy Backend to Cloud Run"
3. Click "Run workflow"
4. Select branch and click "Run workflow"

---

## Troubleshooting

### Error: "Permission denied"

**Solution:** Make sure service account has all 3 roles:
- `roles/run.admin`
- `roles/iam.serviceAccountUser`
- `roles/storage.admin`

### Error: "Invalid credentials"

**Solution:** Verify `GCP_SA_KEY` secret contains the full JSON (including `{` and `}`)

### Error: "Service not found"

**Solution:** Update `SERVICE_NAME` in workflow to match your actual service name

---

## Security Notes

🔒 **NEVER commit `key.json` to GitHub!**

Add to `.gitignore`:
```
key.json
*.json
!package.json
```

🔒 **Rotate service account keys** periodically (every 90 days)

🔒 **Use least privilege** - only grant necessary permissions

---

## Cost Impact

GitHub Actions is FREE for:
- Public repositories: Unlimited minutes
- Private repositories: 2,000 minutes/month

Each deployment takes ~2-3 minutes.

Cloud Run charges are the same (no extra cost for auto-deploy).

---

## Alternative: Cloud Build Triggers

If you prefer Google Cloud native solution:

1. Go to: https://console.cloud.google.com/cloud-build/triggers
2. Click "CREATE TRIGGER"
3. Connect your GitHub repo
4. Set trigger on push to `main` branch
5. Set build config: `cloudbuild.yaml`
6. Save

This is Google's built-in CI/CD, but requires more setup.
