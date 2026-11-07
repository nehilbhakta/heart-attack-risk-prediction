import type { PatientFeatures } from "./api";

/** The 13 clinical values the XGBoost model needs — the same fields as the
 * single-patient "Check risk" form, and the same columns a batch-upload CSV
 * or Excel file must have. `help` explains the coding in plain words. */
export const FIELDS: {
  key: keyof PatientFeatures;
  label: string;
  min: number;
  max: number;
  step: number;
  help: string;
}[] = [
  { key: "age", label: "Age (years)", min: 20, max: 100, step: 1, help: "" },
  { key: "sex", label: "Sex (1 = male, 0 = female)", min: 0, max: 1, step: 1, help: "" },
  { key: "cp", label: "Chest pain type (1–4)", min: 1, max: 4, step: 1, help: "1 typical angina, 2 atypical, 3 non-anginal, 4 asymptomatic" },
  { key: "trestbps", label: "Resting blood pressure (mm Hg)", min: 80, max: 220, step: 1, help: "" },
  { key: "chol", label: "Cholesterol (mg/dl)", min: 100, max: 600, step: 1, help: "" },
  { key: "fbs", label: "Fasting blood sugar > 120 (1 = yes, 0 = no)", min: 0, max: 1, step: 1, help: "" },
  { key: "restecg", label: "Resting ECG (0–2)", min: 0, max: 2, step: 1, help: "0 normal, 1 ST-T abnormality, 2 left ventricular hypertrophy" },
  { key: "thalach", label: "Max heart rate achieved", min: 60, max: 220, step: 1, help: "" },
  { key: "exang", label: "Exercise-induced angina (1 = yes, 0 = no)", min: 0, max: 1, step: 1, help: "" },
  { key: "oldpeak", label: "ST depression after exercise", min: 0, max: 7, step: 0.1, help: "" },
  { key: "slope", label: "ST slope (0–2)", min: 0, max: 2, step: 1, help: "0 upsloping, 1 flat, 2 downsloping" },
  { key: "ca", label: "Major vessels (0–3)", min: 0, max: 3, step: 1, help: "Number of major vessels coloured by fluoroscopy" },
  { key: "thal", label: "Thal (3 normal, 6 fixed defect, 7 reversible)", min: 3, max: 7, step: 1, help: "" },
];

/** Column names a batch-upload file must have, in the model's order. */
export const REQUIRED_COLUMNS = FIELDS.map((f) => f.key);

/** One example patient, used for the downloadable template CSV. Values are
 * illustrative only — a typical row in the valid ranges, not a real patient. */
export const TEMPLATE_ROW: PatientFeatures = {
  age: 63, sex: 1, cp: 3, trestbps: 145, chol: 233, fbs: 1, restecg: 0,
  thalach: 150, exang: 0, oldpeak: 2.3, slope: 0, ca: 0, thal: 3,
};

export const TEMPLATE_CSV =
  REQUIRED_COLUMNS.join(",") +
  "\n" +
  REQUIRED_COLUMNS.map((c) => String(TEMPLATE_ROW[c])).join(",") +
  "\n";
