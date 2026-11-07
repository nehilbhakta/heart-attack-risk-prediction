export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type RiskBand = "low" | "medium" | "high";

export type Patient = {
  id: number;
  label: string;
  age: number;
  sex: number;
  simulated: boolean;
  latest_probability: number | null;
  latest_risk_band: RiskBand | null;
  avg_heart_rate: number | null;
  avg_systolic: number | null;
  avg_sleep: number | null;
  active_days: number | null;
};

export type Vital = {
  day: number;
  heart_rate: number;
  systolic: number;
  diastolic: number;
  sleep_hours: number;
  active: boolean;
};

export type PatientDetail = Patient & {
  cp: number;
  trestbps: number;
  chol: number;
  fbs: number;
  restecg: number;
  thalach: number;
  exang: number;
  oldpeak: number;
  slope: number;
  ca: number;
  thal: number;
  vitals: Vital[];
  contributions: string[];
};

export type AlertItem = {
  id: number;
  patient_id: number;
  patient_label: string;
  message: string;
  probability: number;
  resolved: boolean;
  created_at: string | null;
};

export type Metrics = {
  dataset: string;
  rows: number;
  features: string[];
  test_accuracy: number;
  test_precision: number;
  test_recall: number;
  test_roc_auc: number;
  cv_roc_auc_mean: number;
  cv_roc_auc_std: number;
  train_roc_auc: number;
  feature_importances: Record<string, number>;
};

export type Dashboard = {
  total_patients: number;
  high_risk_patients: number;
  high_risk_predictions: number;
  open_alerts: number;
  model_roc_auc: number | null;
  model_accuracy: number | null;
};

export type Prediction = {
  probability: number;
  risk_band: RiskBand;
  contributions: string[];
  patient_id: number | null;
};

export type BatchRowResult = {
  row: number;
  probability: number | null;
  risk_band: RiskBand | null;
  contributions: string[];
  error: string | null;
};

export type BatchResult = {
  filename: string;
  total_rows: number;
  scored: number;
  failed: number;
  summary: { high: number; medium: number; low: number };
  results: BatchRowResult[];
};

export type PatientFeatures = {
  age: number;
  sex: number;
  cp: number;
  trestbps: number;
  chol: number;
  fbs: number;
  restecg: number;
  thalach: number;
  exang: number;
  oldpeak: number;
  slope: number;
  ca: number;
  thal: number;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status} ${res.statusText}`);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  dashboard: () => request<Dashboard>("/api/dashboard"),
  metrics: () => request<Metrics>("/api/metrics"),
  listPatients: () => request<Patient[]>("/api/patients"),
  getPatient: (id: number) => request<PatientDetail>(`/api/patients/${id}`),
  simulate: (id: number) =>
    request<PatientDetail>(`/api/patients/${id}/simulate`, { method: "POST" }),
  predict: (features: PatientFeatures, patientId?: number) =>
    request<Prediction>("/api/predict", {
      method: "POST",
      body: JSON.stringify({ ...features, patient_id: patientId ?? null }),
    }),
  /** Score many patients from an uploaded .csv/.xlsx file. Uses FormData,
   * so it must not go through the JSON `request()` helper. */
  predictBatch: async (file: File): Promise<BatchResult> => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${API_URL}/api/predict-batch`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) {
      let detail = `Upload failed (${res.status}).`;
      try {
        const data = await res.json();
        if (data?.detail) detail = data.detail;
      } catch {
        /* keep the fallback message */
      }
      throw new Error(detail);
    }
    return res.json() as Promise<BatchResult>;
  },
  listAlerts: () => request<AlertItem[]>("/api/alerts"),
  resolveAlert: (id: number) =>
    request<AlertItem>(`/api/alerts/${id}/resolve`, { method: "PATCH" }),
};

export function pct(value: number | null): string {
  if (value === null || value === undefined) return "—";
  return `${Math.round(value * 100)}%`;
}
