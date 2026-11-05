"""Train the XGBoost heart-disease model on the UCI Cleveland dataset.

Run from the backend folder:  python -m app.train

Dataset: UCI Machine Learning Repository, Heart Disease (Cleveland),
processed.cleveland.data — 303 rows, 14 columns. Target is binary:
0 = no heart disease, 1 = heart disease present (original values 1-4
collapsed to 1). Missing values ('?') in ca/thal are replaced by the
column median. The trained model, feature list and honest test metrics
are saved to backend/model/.
"""

import json
import os

import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.metrics import accuracy_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH = os.path.join(BASE_DIR, "data", "processed.cleveland.data")
MODEL_DIR = os.path.join(BASE_DIR, "model")

COLUMNS = [
    "age", "sex", "cp", "trestbps", "chol", "fbs", "restecg",
    "thalach", "exang", "oldpeak", "slope", "ca", "thal", "num",
]
FEATURES = COLUMNS[:-1]


def load_data() -> pd.DataFrame:
    df = pd.read_csv(DATA_PATH, names=COLUMNS, na_values="?")
    df["ca"] = df["ca"].fillna(df["ca"].median())
    df["thal"] = df["thal"].fillna(df["thal"].median())
    df["num"] = (df["num"] > 0).astype(int)
    return df


def train() -> dict:
    df = load_data()
    X = df[FEATURES]
    y = df["num"]
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )
    model = xgb.XGBClassifier(
        n_estimators=200, max_depth=3, learning_rate=0.05,
        subsample=0.9, colsample_bytree=0.9,
        eval_metric="logloss", random_state=42,
    )
    model.fit(X_train, y_train)

    proba_test = model.predict_proba(X_test)[:, 1]
    pred_test = (proba_test >= 0.5).astype(int)
    proba_train = model.predict_proba(X_train)[:, 1]
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = cross_val_score(model, X, y, cv=cv, scoring="roc_auc")
    importances = {
        name: round(float(v), 4)
        for name, v in zip(FEATURES, model.feature_importances_)
    }

    metrics = {
        "dataset": "UCI Cleveland heart disease (processed.cleveland.data)",
        "rows": int(len(df)),
        "features": FEATURES,
        "test_accuracy": round(float(accuracy_score(y_test, pred_test)), 4),
        "test_precision": round(float(precision_score(y_test, pred_test, zero_division=0)), 4),
        "test_recall": round(float(recall_score(y_test, pred_test, zero_division=0)), 4),
        "test_roc_auc": round(float(roc_auc_score(y_test, proba_test)), 4),
        "cv_roc_auc_mean": round(float(cv_scores.mean()), 4),
        "cv_roc_auc_std": round(float(cv_scores.std()), 4),
        "train_roc_auc": round(float(roc_auc_score(y_train, proba_train)), 4),
        "feature_importances": importances,
    }

    os.makedirs(MODEL_DIR, exist_ok=True)
    model.save_model(os.path.join(MODEL_DIR, "heart_model.json"))
    with open(os.path.join(MODEL_DIR, "feature_list.json"), "w") as f:
        json.dump(FEATURES, f, indent=2)
    with open(os.path.join(MODEL_DIR, "metrics.json"), "w") as f:
        json.dump(metrics, f, indent=2)
    return metrics


if __name__ == "__main__":
    result = train()
    print(json.dumps(result, indent=2))
