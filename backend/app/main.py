import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, SessionLocal, engine
from .models import Patient
from .routers import alerts, metrics, patients, predictions
from .seed import seed as seed_patients

Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Render's free tier has an ephemeral SQLite file (wiped on every
    # redeploy/restart) and its web Shell is a paid feature, so the 20
    # simulated patients are re-seeded automatically when the database is
    # empty. seed() itself drops and recreates the tables, so it is only
    # called when no patient exists yet — never unconditionally.
    db = SessionLocal()
    try:
        empty = db.query(Patient).first() is None
    finally:
        db.close()
    if empty:
        seed_patients()
    yield


# Allowed browser origins, comma-separated. Set FRONTEND_URL to the deployed
# Vercel frontend URL (e.g. https://heartrisk-xyz.vercel.app) when deploying;
# localhost stays allowed for local development.
FRONTEND_URL = os.environ.get(
    "FRONTEND_URL", "http://localhost:3000,http://127.0.0.1:3000"
)
allow_origins = [origin.strip() for origin in FRONTEND_URL.split(",") if origin.strip()]

app = FastAPI(title="HeartRisk API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(patients.router)
app.include_router(predictions.router)
app.include_router(alerts.router)
app.include_router(metrics.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
