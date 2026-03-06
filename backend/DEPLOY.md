# Backend Deployment (Render / Railway)

## Option A: Render (recommended)

This repository already includes `render.yaml`.

1. Push code to GitHub.
2. In Render, choose **New -> Blueprint** and select this repository.
3. After service creation, set required secret environment variables:
   - `MONGO_URL`
   - `JWT_SECRET`
   - `ADMIN_PASSWORD`
   - `FRONTEND_URL`
   - `CORS_ORIGINS`
4. Optional keys:
   - `RESEND_API_KEY`
   - `METAAPI_TOKEN`
   - `OPENAI_API_KEY` (or use rule-based fallback)
   - `OPENAI_BASE_URL`
5. Deploy.

Health endpoint:
- `GET /api/health`

## Option B: Railway

1. Create a new Railway project from this repository.
2. Set **Root Directory** to `backend`.
3. Build command:
   - `pip install -r requirements.txt`
4. Start command:
   - `uvicorn server:app --host 0.0.0.0 --port $PORT`
5. Add the same environment variables listed above.

## Netlify frontend integration

On Netlify, set:
- `REACT_APP_BACKEND_URL=https://<your-backend-domain>`

Then redeploy the frontend.
