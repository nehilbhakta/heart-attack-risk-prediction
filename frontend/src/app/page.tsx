export const dynamic = "force-dynamic";

import Link from "next/link";
import { api, pct } from "@/lib/api";

export default async function Home() {
  const [dash, patients, metrics] = await Promise.all([
    api.dashboard(),
    api.listPatients(),
    api.metrics(),
  ]);
  const sorted = [...patients].sort(
    (a, b) => (b.latest_probability ?? 0) - (a.latest_probability ?? 0)
  );
  return (
    <div>
      <section className="hero">
        <h1>Heart attack risk, at a glance</h1>
        <p className="tagline">
          20 simulated patients, 7 days of vitals each, scored by an XGBoost
          model trained on the UCI Cleveland heart disease dataset. High-risk
          patients raise an alert — the local version of the AWS Lambda + SNS
          step from the original project.
        </p>
      </section>

      <div className="kpi-grid">
        <div className="kpi">
          <div className="label">Simulated patients</div>
          <div className="value">{dash.total_patients}</div>
        </div>
        <div className="kpi danger">
          <div className="label">High-risk patients</div>
          <div className="value">{dash.high_risk_patients}</div>
        </div>
        <div className="kpi">
          <div className="label">Open alerts</div>
          <div className="value">{dash.open_alerts}</div>
        </div>
        <div className="kpi">
          <div className="label">Model ROC-AUC (test)</div>
          <div className="value">{metrics.test_roc_auc.toFixed(3)}</div>
          <div className="label">
            Accuracy {(metrics.test_accuracy * 100).toFixed(1)}% · {metrics.rows} training rows
          </div>
        </div>
      </div>

      <h2>Patients — highest risk first</h2>
      <p className="muted">All patients are simulated demo data, not real people.</p>
      <div className="patient-grid">
        {sorted.map((p) => (
          <Link key={p.id} href={`/patients/${p.id}`} className="patient-card">
            <h2>
              {p.label} <span className="badge sim">Simulated</span>
            </h2>
            <p className="muted">
              Age {p.age} · {p.sex === 1 ? "Male" : "Female"} · avg heart rate{" "}
              {p.avg_heart_rate ? Math.round(p.avg_heart_rate) : "—"} bpm · avg
              systolic {p.avg_systolic ? Math.round(p.avg_systolic) : "—"} ·{" "}
              {p.active_days ?? 0}/7 active days
            </p>
            <div className="risk">
              <span className={`badge ${p.latest_risk_band ?? "low"}`}>
                {p.latest_risk_band ?? "—"} risk
              </span>
              <span>{pct(p.latest_probability)}</span>
            </div>
            <div className="risk-bar">
              <span
                className={p.latest_risk_band ?? "low"}
                style={{ width: `${Math.round((p.latest_probability ?? 0) * 100)}%` }}
              />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
