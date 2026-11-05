"""Seed 20 simulated patients with 7 days of vitals each.

Run from the backend folder:  python -m app.seed

Patients are labelled "Patient 01" ... "Patient 20" — clearly simulated,
not real people. Vitals stay inside realistic medical ranges. After
seeding, each patient is scored with the trained model and a high-risk
alert is created for any patient in the high band (the local equivalent
of the original Lambda + SNS step).
"""

import random

from .database import Base, SessionLocal, engine
from .model import contributions, predict_probability, risk_band
from .models import Alert, Patient, Prediction, VitalReading

FEATURES = [
    "age", "sex", "cp", "trestbps", "chol", "fbs", "restecg",
    "thalach", "exang", "oldpeak", "slope", "ca", "thal",
]


def generate_vitals(rng: random.Random, risk_tilt: float) -> list[dict]:
    """7 days of vitals. risk_tilt 0..1 nudges vitals toward the risky end
    so the seeded cohort has a spread of low / medium / high risk."""
    base_hr = rng.randint(58, 78) + int(risk_tilt * 18)
    base_sys = rng.randint(112, 132) + int(risk_tilt * 28)
    base_dia = rng.randint(70, 84) + int(risk_tilt * 12)
    days = []
    for day in range(1, 8):
        days.append({
            "day": day,
            "heart_rate": max(52, min(118, base_hr + rng.randint(-6, 6))),
            "systolic": max(100, min(185, base_sys + rng.randint(-8, 8))),
            "diastolic": max(60, min(115, base_dia + rng.randint(-5, 5))),
            "sleep_hours": round(max(4.0, min(9.0, rng.uniform(5.5, 8.5) - risk_tilt)), 1),
            "active": rng.random() > (0.25 + risk_tilt * 0.35),
        })
    return days


def generate_features(rng: random.Random, vitals: list[dict], risk_tilt: float) -> dict:
    avg_sys = sum(v["systolic"] for v in vitals) / len(vitals)
    avg_hr = sum(v["heart_rate"] for v in vitals) / len(vitals)
    return {
        "age": rng.randint(35, 78),
        "sex": rng.choice([0, 1]),
        "cp": rng.choices([1, 2, 3, 4], weights=[2, 2, 3, 3])[0],
        "trestbps": int(avg_sys),
        "chol": rng.randint(180, 290) + int(risk_tilt * 60),
        "fbs": 1 if rng.random() < 0.15 + risk_tilt * 0.2 else 0,
        "restecg": rng.choices([0, 1, 2], weights=[5, 3, 2])[0],
        "thalach": max(70, min(200, int(190 - rng.randint(25, 60) - risk_tilt * 35))),
        "exang": 1 if rng.random() < 0.15 + risk_tilt * 0.45 else 0,
        "oldpeak": round(rng.uniform(0, 1.5) + risk_tilt * rng.uniform(0, 2.5), 1),
        "slope": rng.choices([0, 1, 2], weights=[2, 5, 3])[0],
        "ca": rng.choices([0, 1, 2, 3], weights=[6, 2, 1, 1])[0] if risk_tilt < 0.5 else rng.choices([0, 1, 2, 3], weights=[3, 3, 2, 2])[0],
        "thal": rng.choices([3, 6, 7], weights=[6, 1, 3])[0],
    }


def seed() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    rng = random.Random(42)
    db = SessionLocal()
    try:
        for i in range(1, 21):
            # Spread the cohort: mostly low/medium, a few clearly high risk.
            risk_tilt = rng.uniform(0.0, 0.30) if i % 5 else rng.uniform(0.6, 0.95)
            vitals = generate_vitals(rng, risk_tilt)
            feats = generate_features(rng, vitals, risk_tilt)
            patient = Patient(label=f"Patient {i:02d}", simulated=True, **feats)
            db.add(patient)
            db.flush()
            for v in vitals:
                db.add(VitalReading(patient_id=patient.id, **v))
            prob = predict_probability(feats)
            band = risk_band(prob)
            db.add(Prediction(patient_id=patient.id, probability=prob, risk_band=band))
            if band == "high":
                db.add(Alert(
                    patient_id=patient.id,
                    message=f"High heart risk detected for {patient.label} "
                            f"({prob:.0%} risk). Please review this patient.",
                    probability=prob,
                ))
            print(f"Seeded {patient.label}: {band} risk ({prob:.2%})")
        db.commit()
        print("Seeded 20 simulated patients with 7 days of vitals each.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
