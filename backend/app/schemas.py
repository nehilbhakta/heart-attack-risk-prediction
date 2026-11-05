from pydantic import BaseModel, Field


class PatientFeatures(BaseModel):
    """The 13 UCI Cleveland features, in training order. All values are validated
    to the ranges the model was trained on."""

    age: int = Field(ge=20, le=100)
    sex: int = Field(ge=0, le=1)
    cp: int = Field(ge=1, le=4)  # UCI coding: 1 typical angina, 2 atypical, 3 non-anginal, 4 asymptomatic
    trestbps: int = Field(ge=80, le=220)
    chol: int = Field(ge=100, le=600)
    fbs: int = Field(ge=0, le=1)
    restecg: int = Field(ge=0, le=2)
    thalach: int = Field(ge=60, le=220)
    exang: int = Field(ge=0, le=1)
    oldpeak: float = Field(ge=0.0, le=7.0)
    slope: int = Field(ge=0, le=2)
    ca: int = Field(ge=0, le=3)
    thal: int = Field(ge=3, le=7)


class VitalReadingOut(BaseModel):
    day: int
    heart_rate: int
    systolic: int
    diastolic: int
    sleep_hours: float
    active: bool


class PredictionOut(BaseModel):
    probability: float
    risk_band: str
    contributions: list[str]
    patient_id: int | None = None


class PredictRequest(PatientFeatures):
    patient_id: int | None = None


class PatientOut(BaseModel):
    id: int
    label: str
    age: int
    sex: int
    simulated: bool
    latest_probability: float | None = None
    latest_risk_band: str | None = None
    avg_heart_rate: float | None = None
    avg_systolic: float | None = None
    avg_sleep: float | None = None
    active_days: int | None = None


class PatientDetail(PatientOut):
    cp: int
    trestbps: int
    chol: int
    fbs: int
    restecg: int
    thalach: int
    exang: int
    oldpeak: float
    slope: int
    ca: int
    thal: int
    vitals: list[VitalReadingOut] = []
    contributions: list[str] = []


class AlertOut(BaseModel):
    id: int
    patient_id: int
    patient_label: str
    message: str
    probability: float
    resolved: bool
    created_at: str | None = None


class MetricsOut(BaseModel):
    dataset: str
    rows: int
    features: list[str]
    test_accuracy: float
    test_precision: float
    test_recall: float
    test_roc_auc: float
    cv_roc_auc_mean: float
    cv_roc_auc_std: float
    train_roc_auc: float
    feature_importances: dict[str, float]
