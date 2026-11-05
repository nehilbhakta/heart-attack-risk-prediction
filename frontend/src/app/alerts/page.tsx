"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, pct, type AlertItem } from "@/lib/api";

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [error, setError] = useState("");

  async function load() {
    try {
      setAlerts(await api.listAlerts());
    } catch {
      setError("Could not load alerts. Is the backend running on port 8000?");
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function resolve(id: number) {
    await api.resolveAlert(id);
    load();
  }

  const open = alerts.filter((a) => !a.resolved);
  const done = alerts.filter((a) => a.resolved);

  return (
    <div>
      <p className="section-label">Monitoring</p>
      <h1>Alerts</h1>
      <p className="muted">
        High-risk predictions raise an alert here — the local equivalent of the
        original AWS Lambda + SNS email alert. {open.length} open, {done.length} resolved.
      </p>
      {error && <p className="error">{error}</p>}
      {!alerts.length && !error && <p className="empty">No alerts yet.</p>}
      {open.map((a) => (
        <div key={a.id} className="alert-card">
          <p>
            <strong>{a.patient_label}</strong>{" "}
            <span className="badge high">high risk · {pct(a.probability)}</span>
          </p>
          <p>{a.message}</p>
          <p className="muted">{a.created_at ? new Date(a.created_at).toLocaleString() : ""}</p>
          <div className="row">
            <Link href={`/patients/${a.patient_id}`}>
              <button type="button" className="secondary">
                View patient
              </button>
            </Link>
            <button type="button" onClick={() => resolve(a.id)}>
              Mark resolved
            </button>
          </div>
        </div>
      ))}
      {done.length > 0 && (
        <>
          <h2>Resolved</h2>
          {done.map((a) => (
            <div key={a.id} className="alert-card resolved">
              <p>
                <strong>{a.patient_label}</strong> · {pct(a.probability)}
              </p>
              <p>{a.message}</p>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
