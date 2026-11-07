"use client";

import { useRef, useState } from "react";
import { api, pct, type BatchResult } from "@/lib/api";
import { FIELDS, TEMPLATE_CSV } from "@/lib/fields";

function downloadText(filename: string, text: string, mime = "text/csv") {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function csvCell(value: string | number | null): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<BatchResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function pick(f: File | undefined | null) {
    setError("");
    setResult(null);
    if (!f) return;
    if (!/\.csv$|\.xlsx$/i.test(f.name)) {
      setError("Please choose a .csv or .xlsx file.");
      setFile(null);
      return;
    }
    setFile(f);
  }

  async function submit() {
    if (!file) return;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      setResult(await api.predictBatch(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed. Is the backend running on port 8000?");
    } finally {
      setBusy(false);
    }
  }

  function downloadResults() {
    if (!result) return;
    const header = "row,risk_probability,risk_band,top_factor,error";
    const lines = result.results.map((r) =>
      [
        r.row,
        r.probability === null ? "" : r.probability.toFixed(4),
        r.risk_band ?? "",
        r.contributions[0] ?? "",
        r.error ?? "",
      ]
        .map(csvCell)
        .join(",")
    );
    downloadText(
      result.filename.replace(/\.[^.]+$/, "") + "-results.csv",
      [header, ...lines].join("\n") + "\n"
    );
  }

  return (
    <div>
      <p className="section-label">Batch scoring</p>
      <h1>Upload a file</h1>
      <p className="muted">
        Score many patients at once. Upload a .csv or .xlsx file with one
        patient per row and the trained XGBoost model returns a risk
        probability for each one. Uploaded rows are scored only — they are
        not saved as patients and never raise alerts.
      </p>

      <div className="form-panel fields-panel">
        <h2>Your file must have these 13 columns</h2>
        <p className="muted">
          These are the fields the model needs to give a proper insight. Every
          row needs all 13 values, inside the ranges shown. A row with a
          missing or out-of-range value can&apos;t be scored — it will be
          listed as failed, and the rest of the file still gets results.
        </p>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Column</th>
                <th>What it means</th>
                <th>Valid values</th>
              </tr>
            </thead>
            <tbody>
              {FIELDS.map((f) => (
                <tr key={f.key}>
                  <td>
                    <code>{f.key}</code>
                  </td>
                  <td>
                    {f.label}
                    {f.help && <span className="muted"> — {f.help}</span>}
                  </td>
                  <td>
                    {f.min} – {f.max}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="toolbar">
          <button type="button" className="secondary" onClick={() => downloadText("heartrisk-template.csv", TEMPLATE_CSV)}>
            Download template CSV
          </button>
          <span className="muted">.csv or .xlsx · up to 500 rows · max 5 MB</span>
        </div>
      </div>

      <div
        className={drag ? "dropzone drag" : "dropzone"}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          pick(e.dataTransfer.files?.[0]);
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx"
          hidden
          onChange={(e) => pick(e.target.files?.[0])}
        />
        {file ? (
          <p>
            <strong>{file.name}</strong> · {(file.size / 1024).toFixed(1)} KB
            <br />
            <span className="muted">Click to choose a different file, or drop a new one here.</span>
          </p>
        ) : (
          <p>
            <strong>Drop your .csv or .xlsx file here</strong>
            <br />
            <span className="muted">or click to browse your files.</span>
          </p>
        )}
      </div>
      <div className="toolbar">
        <button type="button" onClick={submit} disabled={!file || busy}>
          {busy ? "Scoring…" : "Score file"}
        </button>
        {file && (
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setFile(null);
              setResult(null);
              setError("");
            }}
          >
            Clear
          </button>
        )}
      </div>

      {error && <p className="error">{error}</p>}

      {result && (
        <div>
          <div className="summary-grid">
            <div className="summary-card">
              <b>{result.scored} / {result.total_rows}</b>
              <span>patients scored</span>
            </div>
            <div className="summary-card high">
              <b>{result.summary.high}</b>
              <span>high risk</span>
            </div>
            <div className="summary-card medium">
              <b>{result.summary.medium}</b>
              <span>medium risk</span>
            </div>
            <div className="summary-card low">
              <b>{result.summary.low}</b>
              <span>low risk</span>
            </div>
            <div className="summary-card failed">
              <b>{result.failed}</b>
              <span>failed rows</span>
            </div>
          </div>
          <div className="toolbar">
            <button type="button" className="secondary" onClick={downloadResults}>
              Download results CSV
            </button>
          </div>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Risk</th>
                  <th>Band</th>
                  <th>What is driving it</th>
                </tr>
              </thead>
              <tbody>
                {result.results.map((r) => (
                  <tr key={r.row}>
                    <td>{r.row}</td>
                    <td>{r.probability === null ? "—" : pct(r.probability)}</td>
                    <td>
                      {r.risk_band ? (
                        <span className={`badge ${r.risk_band}`}>{r.risk_band} risk</span>
                      ) : (
                        <span className="badge failed">failed</span>
                      )}
                    </td>
                    <td>
                      {r.error ? (
                        <span className="row-error">{r.error}</span>
                      ) : (
                        r.contributions[0] ?? "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
