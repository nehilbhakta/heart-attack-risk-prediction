from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine
from .routers import alerts, metrics, patients, predictions

Base.metadata.create_all(bind=engine)

app = FastAPI(title="HeartRisk API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
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
