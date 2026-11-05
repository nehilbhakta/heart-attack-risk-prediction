"use client";

import { useState } from "react";
import { api, pct, type PatientFeatures, type Prediction } from "@/lib/api";

const DEFAULTS: PatientFeatures = {
  age: 55, sex: 1, cp: 2, trestbps: 130, chol: 230, fbs: 0, restecg: 0,
  thalach: 150, exang: 0, oldpeak: 1.0, slope: 1, ca: 0, thal: 3,
};

const FIELDS: { key: keyof PatientFeatures; label: string; min: number; max: number; step: number; help: string }[] = [
  { key: "age", label: "Age (years)", min: 20, max: 100, step: 1, help: "" },
  { key: "sex", label: "Sex (1 = male, 0 = female)", min: 0, max: 1, step: 1, help: "" },
  { key: "cp", label: "Chest pain type (1–4)", min: 1, max: 4, step: 1, help: "1 typical angina, 2 atypical, 3 non-anginal, 4 asymptomatic" },
  { key: "trestbps", label: "Resting blood pressure (mm Hg)", min: 80, max: 220, step: 1, help: "" },
  { key: "chol", label: "Cholesterol (mg/dl)", min: 100, max: 600, step: 1, help: "" },
  { key: "fbs", label: "Fasting blood sugar > 120 (1 = yes, 0 = no)", min: 0, max: 1, step: 1, help: "" },
  { key: "restecg", label: "Resting ECG (0–2)", min: 0, max: 2, step: 1, help: "" },
  { key: "thalach", label: "Max heart rate achieved", min: 60, max: 220, step: 1, help: "" },
  { key: "exang", label: "Exercise-induced angina (1 = yes, 0 = no)", min: 0, max: 1, step: 1, help: "" },
  { key: "oldpeak", label: "ST depression after exercise", min: 0, max: 7, step: 0.1, help: "" },
  { key: "slope", label: "ST slope (0–2)", min: 0, max: 2, step: 1, help: "" },
  { key: "ca", label: "Major vessels (0–3)", min: 0, max: 3, step: 1, help: "" },
  { key: "thal", label: "Thal (3 normal, 6 fixed defect, 7 reversible)", min: 3, max: 7, step: 1, help: "" },
];

export default function CheckPage() {
  const [form, setForm] = useState<PatientFeatures>(DEFAULTS);
  const [result, setResult] = useState<Prediction | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setResult(null);
    try {
      setResult(await api.predict(form));
    } catch {
      setError("Prediction failed. Is the backend running on port 8000?");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="section-label">Risk checker</p>
      <h1>Check risk</h1>
      <p className="muted">
        Enter a patient&apos;s clinical values and the trained XGBoost model
        returns a risk probability. This is a demo with the UCI Cleveland
        dataset — not a diagnosis.
      </p>
      <form onSubmit={submit}>
        <div className="form-grid form-panel">
          {FIELDS.map((f) => (
            <label key={f.key}>
              {f.label}
              {f.help && <span className="muted"> — {f.help}</span>}
              <input
                type="number"
                min={f.min}
                max={f.max}
                step={f.step}
                value={form[f.key]}
                onChange={(e) =>
                  setForm({ ...form, [f.key]: Number(e.target.value) })
                }
                required
              />
            </label>
          ))}
        </div>
        <div className="toolbar">
          <button type="submit" disabled={busy}>
            {busy ? "Scoring…" : "Predict risk"}
          </button>
        </div>
      </form>
      {error && <p className="error">{error}</p>}
      {result && (
        <div className={`result band-${result.risk_band}`}>
          <h2>
            <span className={`badge ${result.risk_band}`}>{result.risk_band} risk</span>{" "}
            <span className="result-score">{pct(result.probability)}</span>
          </h2>
          <p>
            The model estimates a {pct(result.probability)} probability of heart
            disease for these values.
          </p>
          <h3>What is driving this score?</h3>
          <ul className="factors">
            {result.contributions.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
