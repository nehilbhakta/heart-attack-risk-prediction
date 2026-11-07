"""Tests for POST /api/predict-batch — CSV / Excel batch scoring."""

import io

import pandas as pd

COLUMNS = [
    "age", "sex", "cp", "trestbps", "chol", "fbs", "restecg",
    "thalach", "exang", "oldpeak", "slope", "ca", "thal",
]

LOW_RISK_ROW = {
    "age": 35, "sex": 0, "cp": 2, "trestbps": 110, "chol": 180, "fbs": 0,
    "restecg": 0, "thalach": 175, "exang": 0, "oldpeak": 0.0, "slope": 1,
    "ca": 0, "thal": 3,
}

HIGH_RISK_ROW = {
    "age": 70, "sex": 1, "cp": 4, "trestbps": 170, "chol": 320, "fbs": 1,
    "restecg": 2, "thalach": 95, "exang": 1, "oldpeak": 4.0, "slope": 2,
    "ca": 3, "thal": 7,
}


def _csv_bytes(rows):
    df = pd.DataFrame(rows, columns=COLUMNS)
    return df.to_csv(index=False).encode()


def test_batch_scores_valid_csv(client):
    res = client.post(
        "/api/predict-batch",
        files={"file": ("patients.csv", _csv_bytes([LOW_RISK_ROW, HIGH_RISK_ROW]), "text/csv")},
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["total_rows"] == 2
    assert data["scored"] == 2
    assert data["failed"] == 0
    assert data["summary"]["high"] + data["summary"]["medium"] + data["summary"]["low"] == 2
    first, second = data["results"]
    assert first["row"] == 2  # row 1 is the header
    assert 0.0 <= first["probability"] <= 1.0
    assert first["risk_band"] in ("low", "medium", "high")
    assert first["contributions"]
    assert first["error"] is None
    assert second["row"] == 3


def test_batch_row_with_bad_value_fails_only_that_row(client):
    bad = {**LOW_RISK_ROW, "chol": 50}  # below the 100 minimum
    res = client.post(
        "/api/predict-batch",
        files={"file": ("patients.csv", _csv_bytes([LOW_RISK_ROW, bad]), "text/csv")},
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["total_rows"] == 2
    assert data["scored"] == 1
    assert data["failed"] == 1
    assert data["results"][1]["error"] is not None
    assert "chol" in data["results"][1]["error"]


def test_batch_missing_column_rejected(client):
    df = pd.DataFrame([LOW_RISK_ROW]).drop(columns=["thal"])
    res = client.post(
        "/api/predict-batch",
        files={"file": ("patients.csv", df.to_csv(index=False).encode(), "text/csv")},
    )
    assert res.status_code == 400
    assert "thal" in res.json()["detail"]


def test_batch_wrong_file_type_rejected(client):
    res = client.post(
        "/api/predict-batch",
        files={"file": ("patients.pdf", b"%PDF-1.4", "application/pdf")},
    )
    assert res.status_code == 400


def test_batch_xlsx_works(client):
    buf = io.BytesIO()
    pd.DataFrame([LOW_RISK_ROW], columns=COLUMNS).to_excel(buf, index=False)
    res = client.post(
        "/api/predict-batch",
        files={"file": ("patients.xlsx", buf.getvalue(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
    )
    assert res.status_code == 200, res.text
    assert res.json()["scored"] == 1


def test_batch_does_not_create_patients_or_alerts(client):
    from app.seed import seed

    seed()
    alerts_before = client.get("/api/alerts").json()
    res = client.post(
        "/api/predict-batch",
        files={"file": ("patients.csv", _csv_bytes([HIGH_RISK_ROW]), "text/csv")},
    )
    assert res.status_code == 200
    assert len(client.get("/api/patients").json()) == 20
    # A high-risk row in the file must not add an alert.
    assert client.get("/api/alerts").json() == alerts_before
