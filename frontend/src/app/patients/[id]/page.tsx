"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { api, pct, type PatientDetail } from "@/lib/api";

export default function PatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      setPatient(await api.getPatient(Number(id)));
    } catch {
      setError("Could not load this patient. Is the backend running on port 8000?");
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function simulate() {
    setBusy(true);
    setError("");
    try {
      setPatient(await api.simulate(Number(id)));
    } catch {
      setError("Simulation failed. Is the backend running?");
    } finally {
      setBusy(false);
    }
  }

  if (error && !patient) return <p className="error">{error}</p>;
  if (!patient) return <p className="muted">Loading patient…</p>;

  const maxHr = Math.max(...patient.vitals.map((v) => v.heart_rate), 1);
  const prob = patient.latest_probability ?? 0;
  const band = patient.latest_risk_band ?? "low";
  const gaugeR = 54;
  const gaugeC = 2 * Math.PI * gaugeR;
  const gaugeOffset = gaugeC * (1 - prob);
  return (
    <div>
      <p>
        <Link href="/">← All patients</Link>
      </p>
      <h1>
        {patient.label} <span className="badge sim">Simulated</span>
      </h1>
      <p className="muted">
        Age {patient.age} · {patient.sex === 1 ? "Male" : "Female"} · 7 days of
        simulated vitals, averaged like the original Spark processing step.
      </p>

      <div className="detail-grid">
        <div className="detail-card">
          <h3>Risk score</h3>
          <div className="gauge-wrap">
            <div className="gauge" role="img" aria-label={`Risk score ${pct(patient.latest_probability)}, ${band} risk`}>
              <svg width="132" height="132" viewBox="0 0 132 132" aria-hidden="true">
                <circle className="gauge-track" cx="66" cy="66" r={gaugeR} />
                <circle
                  className={`gauge-value ${band}`}
                  cx="66"
                  cy="66"
                  r={gaugeR}
                  strokeDasharray={gaugeC}
                  strokeDashoffset={gaugeOffset}
                />
              </svg>
              <div className="gauge-centre">
                <strong>{pct(patient.latest_probability)}</strong>
                <span>risk score</span>
              </div>
            </div>
            <div>
              <span className={`badge ${band}`}>{band} risk</span>
              <p className="muted" style={{ marginTop: 8 }}>
                Model probability of heart disease for this patient.
              </p>
            </div>
          </div>
          <div className="risk-bar">
            <span
              className={band}
              style={{ width: `${Math.round(prob * 100)}%` }}
            />
          </div>
        </div>
        <div className="detail-card">
          <h3>7-day averages</h3>
          <p>Heart rate: {patient.avg_heart_rate ? Math.round(patient.avg_heart_rate) : "—"} bpm</p>
          <p>Systolic BP: {patient.avg_systolic ? Math.round(patient.avg_systolic) : "—"} mm Hg</p>
          <p>Sleep: {patient.avg_sleep ? patient.avg_sleep.toFixed(1) : "—"} hrs/night</p>
          <p>Active days: {patient.active_days ?? 0} / 7</p>
        </div>
        <div className="detail-card">
          <h3>Clinical features used by the model</h3>
          <p>Cholesterol {patient.chol} mg/dl · Resting BP {patient.trestbps} · Max heart rate {patient.thalach}</p>
          <p>Chest pain type {patient.cp} · Exercise angina {patient.exang ? "yes" : "no"} · ST depression {patient.oldpeak} · Vessels {patient.ca} · Thal {patient.thal}</p>
        </div>
      </div>

      <p className="section-label">Why this score</p>
      <h2 className="section-title">What is driving this score?</h2>
      <ul className="factors">
        {patient.contributions.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>

      <p className="section-label">Vitals</p>
      <h2 className="section-title">Heart rate over 7 days</h2>
      <p className="muted">Resting heart rate is usually 60–100 bpm. Bars outside that range are shown in red.</p>
      <div className="vital-bars">
        {patient.vitals.map((v) => {
          const inRange = v.heart_rate >= 60 && v.heart_rate <= 100;
          return (
            <div className="bar" key={v.day}>
              <span className="bar-value">{v.heart_rate}</span>
              <span
                className={`bar-fill${inRange ? "" : " out"}`}
                style={{ height: `${Math.round((v.heart_rate / maxHr) * 100)}px` }}
              />
              <span className="bar-day">Day {v.day}</span>
            </div>
          );
        })}
      </div>

      <p className="section-label">Log</p>
      <h2 className="section-title">Daily vitals</h2>
      <table className="data">
        <thead>
          <tr>
            <th>Day</th>
            <th>Heart rate</th>
            <th>Blood pressure</th>
            <th>Sleep</th>
            <th>Active</th>
          </tr>
        </thead>
        <tbody>
          {patient.vitals.map((v) => (
            <tr key={v.day}>
              <td>Day {v.day}</td>
              <td>{v.heart_rate} bpm</td>
              <td>
                {v.systolic}/{v.diastolic}
              </td>
              <td>{v.sleep_hours} hrs</td>
              <td>{v.active ? "Yes" : "No"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="toolbar">
        <button onClick={simulate} disabled={busy}>
          {busy ? "Simulating…" : "Simulate new vitals & re-score"}
        </button>
        <Link href="/alerts">
          <button type="button" className="secondary">
            View alerts
          </button>
        </Link>
      </div>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
