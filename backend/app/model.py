"""Load the trained XGBoost model and score patients.

The model is trained by backend/train.py and saved to backend/model/.
Prediction always uses exactly the feature order recorded in feature_list.json.
"""

import json
import os
from functools import lru_cache

import xgboost as xgb

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_DIR = os.path.join(BASE_DIR, "model")
FEATURES_PATH = os.path.join(MODEL_DIR, "feature_list.json")
MODEL_PATH = os.path.join(MODEL_DIR, "heart_model.json")
METRICS_PATH = os.path.join(MODEL_DIR, "metrics.json")

FEATURES = [
    "age", "sex", "cp", "trestbps", "chol", "fbs", "restecg",
    "thalach", "exang", "oldpeak", "slope", "ca", "thal",
]


def risk_band(probability: float) -> str:
    if probability >= 0.65:
        return "high"
    if probability >= 0.35:
        return "medium"
    return "low"


@lru_cache(maxsize=1)
def load_model():
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(
            "Trained model not found. Run `python -m app.train` from the backend folder first."
        )
    model = xgb.XGBClassifier()
    model.load_model(MODEL_PATH)
    with open(FEATURES_PATH) as f:
        features = json.load(f)
    return model, features


def load_metrics() -> dict:
    if not os.path.exists(METRICS_PATH):
        return {}
    with open(METRICS_PATH) as f:
        return json.load(f)


def predict_probability(features: dict) -> float:
    model, ordered = load_model()
    row = [[float(features[name]) for name in ordered]]
    return float(model.predict_proba(row)[0][1])


# Plain-language explanations: for each feature, the value range that raises
# risk, and what it means in everyday words. Only features whose value is in
# the risky range are listed for a patient.
_RISK_NOTES = [
    ("age", lambda v: v >= 60, "Older age — risk rises with age"),
    ("trestbps", lambda v: v >= 140, "High resting blood pressure"),
    ("chol", lambda v: v >= 240, "High cholesterol"),
    ("thalach", lambda v: v <= 120, "Low maximum heart rate during exercise"),
    ("exang", lambda v: v == 1, "Chest pain during exercise"),
    ("oldpeak", lambda v: v >= 2.0, "Large ST depression after exercise"),
    ("ca", lambda v: v >= 1, "Narrowed major blood vessels seen on imaging"),
    ("thal", lambda v: v == 7, "Reversible heart-muscle defect (thalassemia test)"),
    ("cp", lambda v: v == 4, "Asymptomatic chest pain type — linked to higher risk in this dataset"),
    ("fbs", lambda v: v == 1, "High fasting blood sugar"),
    ("slope", lambda v: v == 2, "Down-sloping ST segment during exercise"),
    ("sex", lambda v: v == 1, "Male — men in this dataset had higher rates"),
]


def contributions(features: dict) -> list[str]:
    notes = [text for name, check, text in _RISK_NOTES if check(features.get(name, 0))]
    if not notes:
        notes = ["No single feature stands out — the overall pattern is low risk."]
    return notes[:4]
