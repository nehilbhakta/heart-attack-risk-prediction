from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Alert, Patient
from ..schemas import AlertOut

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.get("", response_model=list[AlertOut])
def list_alerts(db: Session = Depends(get_db)):
    alerts = db.query(Alert).order_by(Alert.id.desc()).all()
    out = []
    for a in alerts:
        patient = db.query(Patient).filter_by(id=a.patient_id).first()
        out.append(AlertOut(
            id=a.id, patient_id=a.patient_id,
            patient_label=patient.label if patient else f"Patient {a.patient_id}",
            message=a.message, probability=a.probability, resolved=a.resolved,
            created_at=a.created_at.isoformat() if a.created_at else None,
        ))
    return out


@router.patch("/{alert_id}/resolve", response_model=AlertOut)
def resolve_alert(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter_by(id=alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.resolved = True
    db.commit()
    patient = db.query(Patient).filter_by(id=alert.patient_id).first()
    return AlertOut(
        id=alert.id, patient_id=alert.patient_id,
        patient_label=patient.label if patient else f"Patient {alert.patient_id}",
        message=alert.message, probability=alert.probability, resolved=alert.resolved,
        created_at=alert.created_at.isoformat() if alert.created_at else None,
    )
