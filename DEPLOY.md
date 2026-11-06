# Deploying HeartRisk

Nothing here deploys anything by itself — this is the exact click-path and
settings to deploy the backend on Render and the frontend on Vercel.
Deploy in this order: **1. Render backend → 2. Vercel frontend →
3. point the backend at the frontend** (step 3, because the backend's
`FRONTEND_URL` needs the real Vercel URL).

> **Disclaimer — demo / educational project, not for clinical use.** This
> project uses simulated patients and a model trained on the UCI Cleveland
> dataset. It is not a medical device, not a diagnosis, and not clinical
> advice. That disclaimer is shown in the site footer and the README and
> must stay there.

## 1. Backend on Render (from `render.yaml`)

- Render dashboard → **New → Blueprint** → select repo
  **nehilbhakta/heart-attack-risk-prediction** (branch `main`).
- Render reads `render.yaml` at the repo root and creates one web service:

| Setting | Value |
| --- | --- |
| Service name | `heartrisk-api` |
| Runtime | Python |
| Root Directory | `backend` |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| Health Check Path | `/api/health` |
| Instance | Free (spins down after inactivity; first request can take ~1 min) |

Environment variables on the service:

| Variable | Value |
| --- | --- |
| `PYTHON_VERSION` | `3.12.3` |
| `FRONTEND_URL` | *(set in the Render dashboard after step 2 — see step 3)* |
| `DATABASE_URL` | `sqlite:///./heartrisk.db` |

- The trained XGBoost model (`backend/model/heart_model.json`, plus
  `feature_list.json` and `metrics.json`) is committed in the repo, so no
  training step is needed at deploy time — the model loads lazily on first
  prediction.
- When the deploy finishes, copy the service URL, e.g.
  `https://heartrisk-api.onrender.com`. Check
  `https://heartrisk-api.onrender.com/api/health` returns `{"status":"ok"}`.

**Seed the simulated patients (one time, in the Render dashboard):**
Shell tab of the service → run `python -m app.seed` (working directory is
`backend/`). The seed is idempotent — it skips if patients already exist.

> SQLite on Render's free tier lives on an ephemeral disk: **data resets on
> every redeploy/restart**. The simulated cohort can be re-seeded with the
> command above; predictions/alerts created on the live site are not
> preserved. For persistent data, attach a Render Postgres database and set
> `DATABASE_URL` to its connection string (no code change needed —
> `DATABASE_URL` is already read from the environment).

## 2. Frontend on Vercel

- Vercel dashboard → **Add New → Project** → **Import** repo
  **nehilbhakta/heart-attack-risk-prediction**.

| Setting | Value |
| --- | --- |
| Framework Preset | Next.js (auto-detected) |
| Root Directory | `frontend` |
| Build Command | `next build` (default) |
| Output Directory | `.next` (default — leave as is) |
| Install Command | `npm install` (default) |
| Node.js Version | 18.x or later (default) |

Environment variable (add before deploying, under **Environment Variables**):

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | the Render backend URL from step 1, e.g. `https://heartrisk-api.onrender.com` (no trailing slash) |

- Deploy. The site will be live at e.g. `https://heart-risk-xyz.vercel.app`.

## 3. Point the backend at the frontend

- In Render, open the `heartrisk-api` service → **Environment** → set
  `FRONTEND_URL` to the Vercel URL from step 2 (e.g.
  `https://heart-risk-xyz.vercel.app`, no trailing slash) → **Save Changes**.
  Render redeploys automatically. Until this is done, the browser will get
  CORS errors because the backend only allows `http://localhost:3000` and
  `http://127.0.0.1:3000`.

## Local development (unchanged)

```bash
# Terminal 1 — backend (from backend/)
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m app.seed        # once, for the simulated patients
uvicorn app.main:app --reload   # http://localhost:8000

# Terminal 2 — frontend (from frontend/)
npm install
npm run dev               # http://localhost:3000
```

With no env vars set, the frontend calls `http://localhost:8000` and the
backend allows `http://localhost:3000` and `http://127.0.0.1:3000`, exactly
as before. To point local dev at a deployed backend, create
`frontend/.env.local` with `NEXT_PUBLIC_API_URL=<render-url>` (never commit
`.env.local`).
