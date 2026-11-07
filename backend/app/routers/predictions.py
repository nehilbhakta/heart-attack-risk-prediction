import os
from io import BytesIO

import pandas as pd
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import ValidationError
from sqlalchemy.orm import Session

from ..database import get_db
from ..model import FEATURES, contributions, predict_probability, risk_band
from ..models import Alert, Prediction
from ..schemas import PatientFeatures, PredictRequest, PredictionOut

router = APIRouter(prefix="/api", tags=["predictions"])

MAX_BATCH_ROWS = 500
MAX_FILE_BYTES = 5 * 1024 * 1024  # 5 MB
ALLOWED_EXTENSIONS = {".csv", ".xlsx"}


def _read_table(filename: str, content: bytes) -> pd.DataFrame:
    ext = os.path.splitext(filename or "")[1].lower()
    if ext == ".csv":
        return pd.read_csv(BytesIO(content))
    if ext == ".xlsx":
        return pd.read_excel(BytesIO(content))
    raise HTTPException(
        status_code=400,
        detail="Only .csv and .xlsx files are supported.",
    )


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


@router.post("/predict-batch")
def predict_batch(file: UploadFile = File(...)):
    """Score many patients at once from an uploaded .csv or .xlsx file.

    The file must have all 13 model columns (age, sex, cp, trestbps, chol,
    fbs, restecg, thalach, exang, oldpeak, slope, ca, thal), one patient per
    row. Each row is validated with the same rules as the single-patient
    form and scored with the trained model. Rows are never saved as
    patients and never raise alerts — this is a read-only analysis.
    """
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Please upload a .csv or .xlsx file.",
        )
    content = file.file.read()
    if len(content) > MAX_FILE_BYTES:
        raise HTTPException(
            status_code=400,
            detail="File is too large — the limit is 5 MB.",
        )
    if not content.strip():
        raise HTTPException(status_code=400, detail="The file is empty.")
    try:
        df = _read_table(file.filename, content)
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Could not read the file. Check it is a valid .csv or .xlsx file.",
        )
    # Column names are matched case-insensitively, ignoring surrounding spaces.
    df.columns = [str(c).strip().lower() for c in df.columns]
    missing = [c for c in FEATURES if c not in df.columns]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Missing required column(s): {', '.join(missing)}. "
                f"Your file must have all 13 columns: {', '.join(FEATURES)}."
            ),
        )
    if len(df) == 0:
        raise HTTPException(status_code=400, detail="The file has no data rows.")
    if len(df) > MAX_BATCH_ROWS:
        raise HTTPException(
            status_code=400,
            detail=f"Too many rows — the limit is {MAX_BATCH_ROWS} patients per file.",
        )
    results = []
    summary = {"high": 0, "medium": 0, "low": 0}
    for i, (_, row) in enumerate(df.iterrows(), start=2):  # row 2 = first data row
        values: dict = {}
        error: str | None = None
        for col in FEATURES:
            v = row[col]
            if pd.isna(v):
                error = f"Missing value in column '{col}'."
                break
            # Numpy scalars (np.int64 / np.float64) are not plain Python
            # numbers — convert them so Pydantic validates them correctly.
            values[col] = v.item() if hasattr(v, "item") else v
        if error is None:
            try:
                feats = PatientFeatures(**values)
            except ValidationError as e:
                first = e.errors()[0]
                error = f"{first['loc'][0]}: {first['msg']}."
            else:
                data = feats.model_dump()
                prob = predict_probability(data)
                band = risk_band(prob)
                summary[band] += 1
                results.append({
                    "row": i,
                    "probability": prob,
                    "risk_band": band,
                    "contributions": contributions(data),
                    "error": None,
                })
                continue
        results.append({
            "row": i,
            "probability": None,
            "risk_band": None,
            "contributions": [],
            "error": error,
        })
    scored = sum(1 for r in results if r["error"] is None)
    return {
        "filename": file.filename,
        "total_rows": len(df),
        "scored": scored,
        "failed": len(df) - scored,
        "summary": summary,
        "results": results,
    }
