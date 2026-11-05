HIGH_RISK_FEATURES = {
    "age": 70, "sex": 1, "cp": 4, "trestbps": 170, "chol": 320, "fbs": 1,
    "restecg": 2, "thalach": 95, "exang": 1, "oldpeak": 4.0, "slope": 2,
    "ca": 3, "thal": 7,
}

LOW_RISK_FEATURES = {
    "age": 35, "sex": 0, "cp": 2, "trestbps": 110, "chol": 180, "fbs": 0,
    "restecg": 0, "thalach": 175, "exang": 0, "oldpeak": 0.0, "slope": 1,
    "ca": 0, "thal": 3,
}


def test_health(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


def test_metrics_endpoint(client):
    res = client.get("/api/metrics")
    assert res.status_code == 200
    data = res.json()
    assert data["rows"] == 303
    assert 0.5 < data["test_roc_auc"] <= 1.0
    assert len(data["features"]) == 13


def test_predict_returns_valid_probability(client):
    res = client.post("/api/predict", json=LOW_RISK_FEATURES)
    assert res.status_code == 200
    data = res.json()
    assert 0.0 <= data["probability"] <= 1.0
    assert data["risk_band"] in ("low", "medium", "high")
    assert data["contributions"]


def test_high_risk_creates_alert(client):
    from app.seed import seed

    seed()
    res = client.post(
        "/api/predict", json={**HIGH_RISK_FEATURES, "patient_id": 1}
    )
    assert res.status_code == 200
    assert res.json()["risk_band"] == "high"
    alerts = client.get("/api/alerts").json()
    assert any(a["patient_id"] == 1 for a in alerts)


def test_patients_list_after_seed(client):
    from app.seed import seed

    seed()
    patients = client.get("/api/patients").json()
    assert len(patients) == 20
    assert patients[0]["label"] == "Patient 01"
    assert patients[0]["simulated"] is True


def test_invalid_input_returns_422(client):
    res = client.post("/api/predict", json={**LOW_RISK_FEATURES, "age": 10})
    assert res.status_code == 422
