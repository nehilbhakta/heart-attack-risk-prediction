from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..model import contributions, predict_probability, risk_band
from ..models import Alert, Prediction
from ..schemas import PredictRequest, PredictionOut

router = APIRouter(prefix="/api", tags=["predictions"])


@router.post("/predict", response_model=PredictionOut)
def predict(body: PredictRequest, db: Session = Depends(get_db)):
    feats = body.model_dump(exclude={"patient_id"})
    prob = predict_probability(feats)
    band = risk_band(prob)
    if body.patient_id is not None:
        db.add(Prediction(patient_id=body.patient_id, probability=prob, risk_band=band))
        if band == "high":
            existing = db.query(Alert).filter_by(
                patient_id=body.patient_id, resolved=False).first()
            if not existing:
                db.add(Alert(
                    patient_id=body.patient_id,
                    message=f"High heart risk detected ({prob:.0%} risk). Please review this patient.",
                    probability=prob,
                ))
        db.commit()
    return PredictionOut(
        probability=prob, risk_band=band,
        contributions=contributions(feats), patient_id=body.patient_id,
    )
