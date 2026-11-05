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
          <p className="risk">
            <span className={`badge ${patient.latest_risk_band ?? "low"}`}>
              {patient.latest_risk_band ?? "—"} risk
            </span>
            <span style={{ fontSize: "1.5rem" }}>{pct(patient.latest_probability)}</span>
          </p>
          <div className="risk-bar">
            <span
              className={patient.latest_risk_band ?? "low"}
              style={{ width: `${Math.round((patient.latest_probability ?? 0) * 100)}%` }}
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

      <h2>What is driving this score?</h2>
      <ul className="factors">
        {patient.contributions.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>

      <h2>Heart rate over 7 days</h2>
      <div className="vital-bars">
        {patient.vitals.map((v) => (
          <div className="bar" key={v.day}>
            <span style={{ height: `${Math.round((v.heart_rate / maxHr) * 90)}px` }} />
            <span>Day {v.day}</span>
            <span>{v.heart_rate} bpm</span>
          </div>
        ))}
      </div>

      <h2>Daily vitals</h2>
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
