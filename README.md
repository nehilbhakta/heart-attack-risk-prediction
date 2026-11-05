# HeartRisk — Heart Attack Risk Prediction & Alert Pipeline

A full-stack rebuild of my IFT 512 course project (Heart Attack Risk
Prediction and Alert System on AWS), as a **free, local** app — no AWS
account, no cloud cost. The original ran on S3, EMR/Spark, SageMaker
(XGBoost), Lambda, SNS and Athena. This version keeps the same
architecture, with each AWS service replaced by a local equivalent
(see the mapping below), so the whole pipeline can be run and inspected
on a laptop.

> **Disclaimer — not for clinical use.** This is a demo / educational
> project. Patients are simulated ("Patient 01" … "Patient 20"), the
> model is trained on a small public dataset, and the output is a
> probability, not a diagnosis. Never use it for real medical decisions
> — always consult a qualified clinician.

## Features

- 20 simulated patients with 7 days of vitals each (heart rate, blood
  pressure, sleep, activity), aggregated per patient like the original
  Spark processing step
- XGBoost classifier trained on the **UCI Cleveland heart disease
  dataset (303 rows)**, with honest, reproducible metrics (below)
- Risk score as a probability + low / medium / high band, with the
  driving factors explained in plain words
- High-risk predictions raise a persistent **alert** (the local
  equivalent of Lambda + SNS) — view and resolve alerts in the UI
- "Simulate new vitals" generates a fresh 7-day reading for a patient
  and re-scores them
- "Check risk" form: enter any patient's 13 clinical values and get an
  instant prediction
- Dashboard with KPIs: patients, high-risk count, open alerts, model AUC

## Architecture

```
Simulated wearables (7-day vitals, 20 patients)
        │  seed.py — generates + aggregates vitals
        ▼
SQLite database ──────────────── local S3 + Athena (storage + SQL)
        │  app/seed.py — aggregation (was: EMR / Spark)
        ▼
XGBoost model (train.py) ─────── local SageMaker (training + hosting)
        │  app/model.py — loads heart_model.json
        ▼
FastAPI prediction endpoint ──── local Lambda (scoring on demand)
        │  POST /api/predict, POST /api/patients/{id}/simulate
        ▼
Alerts table + Alerts page ───── local SNS (high-risk notifications)
```

| Original (AWS) | This rebuild (local, free) |
|---|---|
| S3 data lake | SQLite database (`heartrisk.db`) + CSV in `backend/data/` |
| EMR / Spark processing | `app/seed.py` aggregation (7-day averages per patient) |
| SageMaker + XGBoost | `app/train.py` — XGBoost, model saved to `backend/model/` |
| Lambda prediction | FastAPI `POST /api/predict` |
| SNS email alerts | Alerts table + Alerts page in the UI |
| Athena SQL analysis | SQLAlchemy queries over SQLite (`DATABASE_URL` switches to PostgreSQL) |

## Model — honest metrics

Trained by `backend/app/train.py` on the UCI Cleveland heart disease
dataset (`processed.cleveland.data`, 303 rows, 14 columns). Target is
binary: heart disease present or not. Missing values in `ca`/`thal`
(6 rows) were replaced with the column median. Stratified 80/20
train/test split, 5-fold cross-validation.

| Metric | Value |
|---|---|
| Test accuracy | 0.885 |
| Test precision | 0.818 |
| Test recall | 0.964 |
| **Test ROC-AUC** | **0.957** |
| 5-fold CV ROC-AUC | 0.896 ± 0.015 |
| Train ROC-AUC | 0.998 |

Note the train/test gap: train AUC 0.998 vs test AUC 0.957. The model
fits the training data almost perfectly, but the 5-fold CV AUC of
0.896 shows it still generalises — unlike the original course project,
which overfit synthetic data (train AUC ~0.998, validation AUC ~0.51,
barely better than chance). The improvement here comes from training
on real patient data instead of simulated vitals alone. Top features by
importance: thal (0.27), chest pain type (0.15), vessels (0.11).

Reproduce the model any time: `cd backend && python -m app.train`
— it rewrites `backend/model/heart_model.json`, `feature_list.json`
and `metrics.json`. Prediction always uses exactly the feature order
in `feature_list.json`.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), React 19, TypeScript, custom CSS |
| Backend | FastAPI, SQLAlchemy, Pydantic |
| ML | XGBoost, scikit-learn, pandas |
| Database | SQLite by default, PostgreSQL via `DATABASE_URL` |
| Tests | pytest (backend), 6 tests |

## How to run locally

### Backend

```bash
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1        # Windows
# source .venv/bin/activate          # macOS / Linux
pip install -r requirements.txt
python -m app.train                  # train the model (writes backend/model/)
python -m app.seed                   # seed 20 simulated patients + alerts
uvicorn app.main:app --reload --port 8000
```

API docs at http://127.0.0.1:8000/docs. To run again later, skip the
install and the seed (re-seeding duplicates nothing — it resets the
database — but it also resets any alerts you resolved).

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. Keep both terminals open: backend on
port 8000, frontend on port 3000.

## API

| Endpoint | What it does |
|---|---|
| `GET /api/health` | Health check |
| `GET /api/dashboard` | KPI counts + model AUC |
| `GET /api/metrics` | Full model metrics + feature importances |
| `GET /api/patients` | All patients with latest risk + 7-day averages |
| `GET /api/patients/{id}` | Patient detail: vitals, features, risk factors |
| `POST /api/patients/{id}/simulate` | New 7-day vitals + re-score |
| `POST /api/predict` | Score any 13-feature patient; high risk creates an alert (if `patient_id` given) |
| `GET /api/alerts` | Alert history |
| `PATCH /api/alerts/{id}/resolve` | Mark an alert resolved |

## Screenshots

To add after first run.

## What this is not

- Not a medical device, not a diagnosis, not clinical advice.
- Patients are simulated; no real patient data is included.
- The dataset is small (303 rows) and from the 1980s Cleveland
  clinic population — results would not transfer directly to a
  modern, different population without retraining.
