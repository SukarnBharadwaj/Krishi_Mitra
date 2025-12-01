# main.py
# FastAPI model server — loads pipeline from uploaded path and exposes POST /predict
# Model file used: /mnt/data/crop_recommender_pipeline.joblib

import os
import traceback
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np
import pandas as pd

# serialization
import joblib
import cloudpickle

# ---------- CONFIG ----------
MODEL_PATH = os.environ.get("MODEL_PATH", "./crop_recommender_pipeline.joblib")
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

# ---------- APP ----------
app = FastAPI(title="Crop Recommender Model Server")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- Schemas ----------
class PredictRequest(BaseModel):
    nitrogen: float
    phosphorus: float
    potassium: float
    temperature: Optional[float] = 25.0
    humidity: Optional[float] = 50.0
    ph: Optional[float] = 6.5
    rainfall: Optional[float] = 0.0
    top_k: Optional[int] = 3

class PredictResponse(BaseModel):
    predictions: List[str]
    probabilities: Optional[List[float]] = None
    raw_output: Optional[List[float]] = None

# ---------- Sklearn shim helper ----------
def apply_sklearn_shim():
    """
    Best-effort: ensure sklearn internal names referenced by pickle are present.
    This helps avoid AttributeError on unpickling (e.g. _RemainderColsList).
    """
    try:
        import importlib
        ct = importlib.import_module("sklearn.compose._column_transformer")
    except Exception:
        return

    if hasattr(ct, "_RemainderColsList"):
        return
    # alias existing name if present
    if hasattr(ct, "_RemainderCols"):
        try:
            setattr(ct, "_RemainderColsList", getattr(ct, "_RemainderCols"))
            print("Shim: aliased _RemainderCols -> _RemainderColsList")
            return
        except Exception:
            pass
    # inject minimal placeholder class so pickle finds a type
    try:
        class _RemainderColsList(list):
            pass
        setattr(ct, "_RemainderColsList", _RemainderColsList)
        print("Shim: injected placeholder _RemainderColsList")
    except Exception:
        print("Shim: failed to inject _RemainderColsList (ignored)")

# ---------- Load model (joblib -> cloudpickle fallback) ----------
model = None

def load_model(path: str = MODEL_PATH):
    global model
    print(f"Loading model from: {path}")
    apply_sklearn_shim()

    # try joblib first
    try:
        model_candidate = joblib.load(path)
        model = model_candidate
        print("Model loaded using joblib.")
        return
    except Exception:
        print("joblib.load failed; traceback:")
        traceback.print_exc()

    # fallback cloudpickle
    try:
        with open(path, "rb") as f:
            model_candidate = cloudpickle.load(f)
            model = model_candidate
            print("Model loaded using cloudpickle.")
            return
    except Exception:
        print("cloudpickle.load failed; traceback:")
        traceback.print_exc()

    model = None
    print("Model could not be loaded. Ensure required libs (lightgbm, sklearn) installed and compatible versions used.")

# initial load
load_model()

# ---------- Helpers to build inputs and locate classifier ----------
def _build_df_from_request(req: PredictRequest) -> pd.DataFrame:
    # Use the 7-feature order that the model expects: N,P,K,temperature,humidity,ph,rainfall
    return pd.DataFrame([{
        "N": req.nitrogen,
        "P": req.phosphorus,
        "K": req.potassium,
        "temperature": req.temperature if req.temperature is not None else 0.0,
        "humidity": req.humidity if req.humidity is not None else 0.0,
        "ph": req.ph if req.ph is not None else 0.0,
        "rainfall": req.rainfall if req.rainfall is not None else 0.0,
    }])

def _locate_classifier(mdl):
    # if pipeline, try to find 'clf' step or last estimator; else use mdl itself
    try:
        if hasattr(mdl, "named_steps") and isinstance(mdl.named_steps, dict):
            ns = mdl.named_steps
            if "clf" in ns:
                return ns["clf"]
            else:
                return list(ns.values())[-1]
        return mdl
    except Exception:
        traceback.print_exc()
        return mdl

# ---------- /predict endpoint ----------
@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    if model is None:
        raise HTTPException(status_code=500, detail="Model not loaded")

    try:
        # build dataframe (fills missing extras as 0.0)
        X_df = _build_df_from_request(req)

        # If model is a pipeline that expects column names, it will transform the df correctly.
        # Otherwise, try to convert to numpy in same column order above.
        clf = _locate_classifier(model)

        # If pipeline supports predict_proba at pipeline-level, we can try model.predict_proba(X_df)
        # but most pipelines require DataFrame -> use clf directly on transformed features via pipeline
        # Preferred: try model.predict_proba(X_df) first
        if hasattr(model, "predict_proba"):
            probs = model.predict_proba(X_df)[0]
            classes = getattr(model, "classes_", None)
            # If pipeline doesn't expose classes_, try classifier
            if classes is None and hasattr(clf, "classes_"):
                classes = getattr(clf, "classes_")
            if classes is None:
                classes = [str(i) for i in range(len(probs))]
            k = min(int(req.top_k or 3), len(probs))
            idx = np.argsort(probs)[::-1][:k]
            preds = [str(classes[i]) for i in idx]
            probs_top = [float(probs[i]) for i in idx]
            return PredictResponse(predictions=preds, probabilities=probs_top, raw_output=[float(x) for x in probs.tolist()])

        # Fallback: try classifier.predict_proba on processed numeric input (convert to numpy)
        if hasattr(clf, "predict_proba"):
            # If model is pipeline, we need to transform X_df before clf predict_proba.
            try:
                # if model is pipeline, use its named_steps transformer(s) if available
                if hasattr(model, "transform") or hasattr(model, "named_steps"):
                    # use model to transform and call clf
                    probs = model.predict_proba(X_df)[0]
                else:
                    probs = clf.predict_proba(X_df.values)[0]
                classes = getattr(clf, "classes_", None)
                if classes is None:
                    classes = [str(i) for i in range(len(probs))]
                k = min(int(req.top_k or 3), len(probs))
                idx = np.argsort(probs)[::-1][:k]
                preds = [str(classes[i]) for i in idx]
                probs_top = [float(probs[i]) for i in idx]
                return PredictResponse(predictions=preds, probabilities=probs_top, raw_output=[float(x) for x in probs.tolist()])
            except Exception:
                traceback.print_exc()
                raise

        # If no predict_proba anywhere, fallback to predict
        try:
            if hasattr(model, "predict"):
                pred = model.predict(X_df)
            else:
                pred = clf.predict(X_df.values)
            first = pred[0] if isinstance(pred, (list, tuple, np.ndarray)) else pred
            return PredictResponse(predictions=[str(first)], probabilities=None, raw_output=None)
        except Exception:
            traceback.print_exc()
            raise

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Inference error: {e}")

# ---------- small admin endpoints ----------
@app.get("/")
def health():
    return {"status": "ok", "model_loaded": model is not None, "model_path": MODEL_PATH}

@app.post("/reload-model")
def reload_model():
    try:
        load_model(MODEL_PATH)
        if model is None:
            raise RuntimeError("Reload failed")
        return {"status": "ok", "model_loaded": True}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Reload failed: {e}")
