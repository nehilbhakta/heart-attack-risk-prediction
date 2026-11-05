from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from .database import Base


class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    label = Column(String, nullable=False)  # "Patient 01" ... — simulated, not a real person
    age = Column(Integer, nullable=False)
    sex = Column(Integer, nullable=False)  # 1 = male, 0 = female
    cp = Column(Integer, nullable=False)  # chest pain type 0-3
    trestbps = Column(Integer, nullable=False)  # resting blood pressure mm Hg
    chol = Column(Integer, nullable=False)  # serum cholesterol mg/dl
    fbs = Column(Integer, nullable=False)  # fasting blood sugar > 120 mg/dl (1/0)
    restecg = Column(Integer, nullable=False)  # resting ECG 0-2
    thalach = Column(Integer, nullable=False)  # maximum heart rate achieved
    exang = Column(Integer, nullable=False)  # exercise induced angina (1/0)
    oldpeak = Column(Float, nullable=False)  # ST depression induced by exercise
    slope = Column(Integer, nullable=False)  # slope of peak exercise ST segment 0-2
    ca = Column(Integer, nullable=False)  # number of major vessels 0-3
    thal = Column(Integer, nullable=False)  # 3 = normal, 6 = fixed defect, 7 = reversible defect
    simulated = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    vitals = relationship("VitalReading", back_populates="patient", cascade="all, delete-orphan")
    predictions = relationship("Prediction", back_populates="patient", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="patient", cascade="all, delete-orphan")


class VitalReading(Base):
    __tablename__ = "vital_readings"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    day = Column(Integer, nullable=False)  # 1..7
    heart_rate = Column(Integer, nullable=False)
    systolic = Column(Integer, nullable=False)
    diastolic = Column(Integer, nullable=False)
    sleep_hours = Column(Float, nullable=False)
    active = Column(Boolean, nullable=False)  # physically active that day

    patient = relationship("Patient", back_populates="vitals")


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=True)
    probability = Column(Float, nullable=False)
    risk_band = Column(String, nullable=False)  # low / medium / high
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    patient = relationship("Patient", back_populates="predictions")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    message = Column(Text, nullable=False)
    probability = Column(Float, nullable=False)
    resolved = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    patient = relationship("Patient", back_populates="alerts")
