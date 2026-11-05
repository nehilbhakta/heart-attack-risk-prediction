from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..model import contributions, predict_probability, risk_band
from ..models import Alert, Patient, Prediction, VitalReading
from ..schemas import PatientDetail, PatientOut
from ..seed import generate_features, generate_vitals
import random

router = APIRouter(prefix="/api/patients", tags=["patients"])


def _summary(db: Session, patient: Patient) -> PatientOut:
    vitals = db.query(VitalReading).filter_by(patient_id=patient.id).all()
    latest = (
        db.query(Prediction).filter_by(patient_id=patient.id)
        .order_by(Prediction.id.desc()).first()
    )
    return PatientOut(
        id=patient.id,
        label=patient.label,
        age=patient.age,
        sex=patient.sex,
        simulated=patient.simulated,
        latest_probability=latest.probability if latest else None,
        latest_risk_band=latest.risk_band if latest else None,
        avg_heart_rate=(sum(v.heart_rate for v in vitals) / len(vitals)) if vitals else None,
        avg_systolic=(sum(v.systolic for v in vitals) / len(vitals)) if vitals else None,
        avg_sleep=(sum(v.sleep_hours for v in vitals) / len(vitals)) if vitals else None,
        active_days=sum(1 for v in vitals if v.active) if vitals else None,
    )


@router.get("", response_model=list[PatientOut])
def list_patients(db: Session = Depends(get_db)):
    patients = db.query(Patient).order_by(Patient.id).all()
    return [_summary(db, p) for p in patients]


@router.get("/{patient_id}", response_model=PatientDetail)
def get_patient(patient_id: int, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter_by(id=patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    base = _summary(db, patient)
    vitals = (
        db.query(VitalReading).filter_by(patient_id=patient.id)
        .order_by(VitalReading.day).all()
    )
    feats = {name: getattr(patient, name) for name in [
        "age", "sex", "cp", "trestbps", "chol", "fbs", "restecg",
        "thalach", "exang", "oldpeak", "slope", "ca", "thal",
    ]}
    return PatientDetail(
        **base.model_dump(),
        cp=patient.cp, trestbps=patient.trestbps, chol=patient.chol,
        fbs=patient.fbs, restecg=patient.restecg, thalach=patient.thalach,
        exang=patient.exang, oldpeak=patient.oldpeak, slope=patient.slope,
        ca=patient.ca, thal=patient.thal,
        vitals=[{
            "day": v.day, "heart_rate": v.heart_rate, "systolic": v.systolic,
            "diastolic": v.diastolic, "sleep_hours": v.sleep_hours,
            "active": v.active,
        } for v in vitals],
        contributions=contributions(feats),
    )


@router.post("/{patient_id}/simulate", response_model=PatientDetail)
def simulate_vitals(patient_id: int, db: Session = Depends(get_db)):
    """Generate a fresh 7-day vitals reading for a patient and re-score them
    (the local equivalent of a new wearable data stream arriving)."""
    patient = db.query(Patient).filter_by(id=patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    rng = random.Random()
    # Keep the patient's existing risk profile roughly stable, with variation.
    tilt = 0.5 if (patient.chol >= 240 or patient.exang == 1) else 0.25
    vitals = generate_vitals(rng, tilt)
    db.query(VitalReading).filter_by(patient_id=patient.id).delete()
    for v in vitals:
        db.add(VitalReading(patient_id=patient.id, **v))
    feats = generate_features(rng, vitals, tilt)
    # Vitals drive blood pressure / max heart rate; keep the patient's
    # other clinical features unchanged so the re-score is about new data.
    feats["trestbps"] = int(sum(v["systolic"] for v in vitals) / len(vitals))
    feats["thalach"] = patient.thalach
    for name in ["age", "sex", "cp", "chol", "fbs", "restecg", "exang",
                 "oldpeak", "slope", "ca", "thal"]:
        feats[name] = getattr(patient, name)
    patient.trestbps = feats["trestbps"]
    prob = predict_probability(feats)
    band = risk_band(prob)
    db.add(Prediction(patient_id=patient.id, probability=prob, risk_band=band))
    if band == "high":
        existing = db.query(Alert).filter_by(patient_id=patient.id, resolved=False).first()
        if not existing:
            db.add(Alert(
                patient_id=patient.id,
                message=f"High heart risk detected for {patient.label} "
                        f"({prob:.0%} risk) after new vitals. Please review this patient.",
                probability=prob,
            ))
    db.commit()
    return get_patient(patient_id, db)
