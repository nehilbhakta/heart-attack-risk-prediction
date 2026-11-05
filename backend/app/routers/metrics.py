from fastapi import APIRouter, HTTPException

from ..model import load_metrics
from ..schemas import MetricsOut

router = APIRouter(prefix="/api", tags=["metrics"])


@router.get("/metrics", response_model=MetricsOut)
def get_metrics():
    metrics = load_metrics()
    if not metrics:
        raise HTTPException(
            status_code=503,
            detail="Model metrics not available. Run `python -m app.train` first.",
        )
    return metrics


@router.get("/dashboard")
def get_dashboard():
    from ..database import SessionLocal
    from ..models import Alert, Patient, Prediction

    db = SessionLocal()
    try:
        total = db.query(Patient).count()
        high = db.query(Prediction).filter_by(risk_band="high").count()
        # Count distinct high-risk patients by their latest prediction.
        high_patients = 0
        for patient in db.query(Patient).all():
            latest = (
                db.query(Prediction).filter_by(patient_id=patient.id)
                .order_by(Prediction.id.desc()).first()
            )
            if latest and latest.risk_band == "high":
                high_patients += 1
        open_alerts = db.query(Alert).filter_by(resolved=False).count()
        metrics = load_metrics()
        return {
            "total_patients": total,
            "high_risk_patients": high_patients,
            "high_risk_predictions": high,
            "open_alerts": open_alerts,
            "model_roc_auc": metrics.get("test_roc_auc"),
            "model_accuracy": metrics.get("test_accuracy"),
        }
    finally:
        db.close()
