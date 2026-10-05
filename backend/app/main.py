import os
import io
import uuid
import numpy as np
import pandas as pd
from typing import Dict, Any
from fastapi import FastAPI, UploadFile, File, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware

from app.models import FileUploadResponse, AnalysisRequest, AnalysisResponse
from app.data_utils import store_dataframe, load_benchmark_dataset, get_dataframe
from app.fairness_engine import (
    get_thresholds, compute_performance_metrics, audit_protected_attribute,
    compute_subgroup_analysis
)
from app.tradeoff_analyzer import evaluate_fairness_accuracy_tradeoff
from app.report_generator import generate_html_report, generate_pdf_report

app = FastAPI(
    title="HMDA Fairness Pipeline API",
    description="Automated Bias and Fairness Audit Pipeline for HMDA Mortgage Loan Approval Models",
    version="1.0.0"
)

# CORS configuration for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global store for completed analyses
ANALYSIS_RESULTS: Dict[str, Dict[str, Any]] = {}

@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "HMDA Fairness Pipeline Backend"}

@app.post("/api/upload", response_model=FileUploadResponse)
async def upload_file(file: UploadFile = File(...)):
    """Uploads CSV or Excel predictions dataset."""
    try:
        contents = await file.read()
        filename = file.filename or "uploaded_data.csv"
        
        if filename.endswith(".xlsx") or filename.endswith(".xls"):
            df = pd.read_excel(io.BytesIO(contents))
        else:
            try:
                df = pd.read_csv(io.BytesIO(contents))
            except UnicodeDecodeError:
                df = pd.read_csv(io.BytesIO(contents), encoding='latin1')
            except Exception:
                df = pd.read_csv(io.BytesIO(contents), sep=None, engine='python')
            
        file_id, meta = store_dataframe(df, filename)
        return meta
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process uploaded file: {str(e)}")

@app.post("/api/sample-data", response_model=FileUploadResponse)
def load_sample():
    """Loads pre-configured HMDA benchmark dataset."""
    try:
        file_id, meta = load_benchmark_dataset()
        return meta
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load sample dataset: {str(e)}")

from app.hmda_default_data import get_hmda_source_of_truth_analysis

@app.get("/api/default-hmda-analysis", response_model=AnalysisResponse)
@app.get("/api/hmda-analysis", response_model=AnalysisResponse)
@app.get("/api/default-adult-analysis", response_model=AnalysisResponse)
@app.get("/api/adult-analysis", response_model=AnalysisResponse)
def get_default_hmda_analysis(model_type: str = "baseline"):
    """
    Returns source-of-truth fairness audit and subgroup analysis for HMDA Home Loan Dataset.
    """
    try:
        data = get_hmda_source_of_truth_analysis(model_type)
        if "analysis_id" in data:
            ANALYSIS_RESULTS[data["analysis_id"]] = data
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch HMDA analysis: {str(e)}")




@app.post("/api/analyze", response_model=AnalysisResponse)
def run_analysis(req: AnalysisRequest):
    """Runs complete fairness and bias analysis pipeline."""
    try:
        df = get_dataframe(req.file_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Session expired or File ID not found.")

    if req.target_col not in df.columns or req.pred_col not in df.columns:
        raise HTTPException(status_code=400, detail="Specified target or prediction column not found in dataset.")

    y_true = df[req.target_col].astype(int).values
    y_pred = df[req.pred_col].astype(int).values
    y_prob = df[req.prob_col].values if req.prob_col and req.prob_col in df.columns else None

    thresholds = get_thresholds(req.risk_tier, req.custom_thresholds)

    # 1. Performance Metrics
    performance = compute_performance_metrics(y_true, y_pred, y_prob)

    # 2. Single Feature Protected Attributes Audit
    protected_audits = []
    overall_status = "PASS"
    overall_dir_scores = []

    for attr in req.protected_cols:
        if attr not in df.columns:
            continue
        ref_g = req.reference_groups.get(attr)
        audit = audit_protected_attribute(
            df, attr, req.target_col, req.pred_col, ref_g, thresholds
        )
        protected_audits.append(audit)
        overall_dir_scores.append(audit["disparate_impact_ratio"])

        if audit["status"] == "HIGH BIAS":
            overall_status = "HIGH BIAS"
        elif audit["status"] == "FLAG" and overall_status != "HIGH BIAS":
            overall_status = "FLAG"

    overall_fairness = round(np.mean(overall_dir_scores) * 100.0, 1) if overall_dir_scores else 100.0
    overall_fairness = min(overall_fairness, 100.0)

    # 3. Subgroup Analysis
    overall_sel_rate = performance["positive_pred_count"] / max(performance["total_count"], 1)
    subgroups = compute_subgroup_analysis(
        df, req.protected_cols, req.target_col, req.pred_col, overall_sel_rate
    )

    # 4. Fairness vs Accuracy Tradeoff Evaluation
    tradeoff_points, optimal_thresh = evaluate_fairness_accuracy_tradeoff(
        df, req.target_col, req.prob_col, req.pred_col, req.protected_cols
    )

    analysis_id = str(uuid.uuid4())
    result_payload = {
        "analysis_id": analysis_id,
        "model_name": req.model_name,
        "risk_tier": req.risk_tier,
        "total_samples": performance["total_count"],
        "performance": performance,
        "protected_audits": protected_audits,
        "overall_fairness_score": overall_fairness,
        "overall_status": overall_status,
        "subgroup_analysis": subgroups,
        "tradeoff_analysis": tradeoff_points,
        "optimal_threshold": optimal_thresh
    }

    ANALYSIS_RESULTS[analysis_id] = result_payload
    return result_payload

@app.get("/api/report/html/{analysis_id}")
def get_html_report(analysis_id: str):
    """Downloads HTML report."""
    if analysis_id not in ANALYSIS_RESULTS:
        if analysis_id == "hmda-notebook-audit-2025-001":
            ANALYSIS_RESULTS[analysis_id] = get_hmda_source_of_truth_analysis("baseline")
        elif analysis_id == "hmda-notebook-audit-2025-002":
            ANALYSIS_RESULTS[analysis_id] = get_hmda_source_of_truth_analysis("mitigated")
        else:
            raise HTTPException(status_code=404, detail="Analysis ID not found.")
    html_content = generate_html_report(ANALYSIS_RESULTS[analysis_id])
    return Response(content=html_content, media_type="text/html")

@app.get("/api/report/pdf/{analysis_id}")
def get_pdf_report(analysis_id: str):
    """Downloads PDF report."""
    if analysis_id not in ANALYSIS_RESULTS:
        if analysis_id == "hmda-notebook-audit-2025-001":
            ANALYSIS_RESULTS[analysis_id] = get_hmda_source_of_truth_analysis("baseline")
        elif analysis_id == "hmda-notebook-audit-2025-002":
            ANALYSIS_RESULTS[analysis_id] = get_hmda_source_of_truth_analysis("mitigated")
        else:
            raise HTTPException(status_code=404, detail="Analysis ID not found.")
    pdf_bytes = generate_pdf_report(ANALYSIS_RESULTS[analysis_id])
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=Fairness_Audit_Report_{analysis_id[:8]}.pdf"}
    )

# ==========================================
# PREDICTION & HUMAN VALIDATION API ROUTES
# ==========================================
from app.models import NewPredictionRequest, HumanValidationRequest
from app.prediction_engine import (
    get_test_summary,
    get_test_queue,
    get_test_record_detail,
    predict_new_applicant,
    save_human_validation
)

@app.get("/api/prediction/test-summary")
def api_get_test_summary():
    """Returns total test records, agreements, discrepancies, and discrepancy rate."""
    try:
        return get_test_summary()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch test summary: {str(e)}")

@app.get("/api/prediction/test-queue")
def api_get_test_queue(filter_type: str = "discrepancies"):
    """Returns review queue of test dataset records with discrepancies."""
    try:
        return get_test_queue(filter_type=filter_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch test queue: {str(e)}")

@app.get("/api/prediction/test-record/{record_id}")
def api_get_test_record_detail(record_id: str):
    """Returns detailed features, side-by-side decisions, SHAP and LIME for a test record."""
    try:
        return get_test_record_detail(record_id)
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch test record detail: {str(e)}")

@app.post("/api/prediction/predict-new")
def api_predict_new(req: NewPredictionRequest):
    """Predicts credit decision for a new manual applicant using Baseline XGBoost & Race ThresholdOptimizer."""
    try:
        return predict_new_applicant(req.dict())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate new prediction: {str(e)}")

@app.post("/api/prediction/submit-validation")
def api_submit_validation(req: HumanValidationRequest):
    """Saves human review validation decision and mandatory reason into audit log."""
    try:
        return save_human_validation(req.dict())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to submit validation: {str(e)}")

