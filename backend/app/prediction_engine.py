import os
import time
import datetime
import numpy as np
import pandas as pd
import shap
from typing import Dict, List, Any, Optional
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.compose import ColumnTransformer
from xgboost import XGBClassifier
from fairlearn.postprocessing import ThresholdOptimizer

CATEGORICAL_FEATURES = [
    "derived_dwelling_category",
    "loan_purpose",
    "conforming_loan_limit",
    "occupancy_type"
]

NUMERICAL_FEATURES = [
    "loan_amount",
    "loan_to_value_ratio",
    "loan_term",
    "property_value",
    "income",
    "debt_to_income_ratio"
]

MODEL_FEATURES = CATEGORICAL_FEATURES + NUMERICAL_FEATURES

PROTECTED_ATTRIBUTES = [
    "derived_race",
    "derived_ethnicity",
    "derived_sex",
    "applicant_age"
]

# Global cache for trained pipeline and test dataset
_ENGINE_CACHE = {}

# In-memory store for human audit validations
HUMAN_VALIDATIONS: Dict[str, Dict[str, Any]] = {}

def find_dataset_path():
    candidates = [
        os.path.join(os.path.dirname(__file__), "data", "preprocessed-hmda.csv"),
        os.path.join(os.path.dirname(__file__), "..", "data", "preprocessed-hmda.csv"),
        os.path.join(os.path.dirname(__file__), "..", "..", "data", "preprocessed-hmda.csv"),
        os.path.join(os.getcwd(), "backend", "app", "data", "preprocessed-hmda.csv"),
        os.path.join(os.getcwd(), "app", "data", "preprocessed-hmda.csv"),
        os.path.join(os.getcwd(), "data", "preprocessed-hmda.csv"),
        "/opt/render/project/src/backend/app/data/preprocessed-hmda.csv",
        "/opt/render/project/src/data/preprocessed-hmda.csv",
    ]
    for p in candidates:
        abs_p = os.path.abspath(p)
        if os.path.exists(abs_p):
            print(f"[Prediction Engine] Found dataset at: {abs_p}")
            return abs_p
    raise FileNotFoundError(f"HMDA preprocessed dataset not found in any candidate path.")

def safe_predict_threshold_optimizer(threshold_opt, X_trans, sensitive_features):
    """Safely executes ThresholdOptimizer predictions preventing pandas 2.2+ float32 assignment exceptions."""
    try:
        sens_s = pd.Series(sensitive_features, dtype=str).reset_index(drop=True)
        preds = threshold_opt.predict(X_trans, sensitive_features=sens_s)
        return np.array(preds, dtype=int)
    except Exception as err:
        print(f"[Prediction Engine] Standard predict fallback triggered: {err}")
        
    try:
        probs = threshold_opt.estimator.predict_proba(X_trans)[:, 1].astype(np.float64)
        it = getattr(threshold_opt, "interpolated_thresholder_", threshold_opt)
        interp_dict = getattr(it, "interpolation_dict", {})
        
        sens_list = list(sensitive_features)
        preds = []
        for i in range(len(probs)):
            prob = float(probs[i])
            race = str(sens_list[i]) if i < len(sens_list) else "White"
            group_cfg = interp_dict.get(race) or interp_dict.get("White")
            if not group_cfg:
                preds.append(1 if prob >= 0.5 else 0)
                continue
            p0 = float(group_cfg.get("p0", 0.5))
            op0_raw = str(group_cfg.get("operation0", [">0.5"])[0]).replace(">", "")
            op1_raw = str(group_cfg.get("operation1", [">0.5"])[0]).replace(">", "")
            t0 = float(op0_raw) if op0_raw != "-inf" else -999.0
            t1 = float(op1_raw) if op1_raw != "-inf" else -999.0
            pred0 = 1 if prob >= t0 else 0
            pred1 = 1 if prob >= t1 else 0
            exp_pred = p0 * pred0 + (1.0 - p0) * pred1
            preds.append(1 if exp_pred >= 0.5 else 0)
        return np.array(preds, dtype=int)
    except Exception as fallback_err:
        print(f"[Prediction Engine] Fallback threshold error: {fallback_err}")
        probs = threshold_opt.estimator.predict_proba(X_trans)[:, 1]
        return (probs >= 0.5).astype(int)

def get_prediction_engine():
    """Returns singleton cached prediction engine with trained models and test data queue."""
    if _ENGINE_CACHE:
        return _ENGINE_CACHE

    print("[Prediction Engine] Initializing HMDA XGBoost and ThresholdOptimizer pipeline...")
    t0 = time.time()
    
    csv_path = find_dataset_path()
    df = pd.read_csv(csv_path)
    
    X = df[MODEL_FEATURES].copy()
    y = df["target"].astype(int).copy()
    protected_df = df[PROTECTED_ATTRIBUTES].copy()
    
    # Stratified Train/Test split (80,000 train / 20,000 test)
    X_train, X_test, y_train, y_test, p_train, p_test = train_test_split(
        X, y, protected_df, test_size=0.20, random_state=42, stratify=y
    )
    
    preprocessor = ColumnTransformer([
        ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), CATEGORICAL_FEATURES),
        ("num", StandardScaler(), NUMERICAL_FEATURES)
    ])
    
    X_train_trans = preprocessor.fit_transform(X_train)
    X_test_trans = preprocessor.transform(X_test)
    
    xgb_model = XGBClassifier(
        n_estimators=100,
        max_depth=6,
        learning_rate=0.1,
        random_state=42,
        eval_metric="logloss",
        tree_method="hist",
        n_jobs=-1
    )
    xgb_model.fit(X_train_trans, y_train)
    
    threshold_opt = ThresholdOptimizer(
        estimator=xgb_model,
        constraints="demographic_parity",
        objective="accuracy_score",
        grid_size=1000,
        flip=False,
        prefit=True,
        predict_method="predict_proba"
    )
    threshold_opt.fit(X_train_trans, y_train, sensitive_features=p_train["derived_race"])
    
    shap_explainer = shap.TreeExplainer(xgb_model)
    
    # Compute test predictions
    baseline_probs = xgb_model.predict_proba(X_test_trans)[:, 1]
    baseline_preds = (baseline_probs >= 0.5).astype(int)
    race_to_preds = safe_predict_threshold_optimizer(threshold_opt, X_test_trans, p_test["derived_race"])
    
    # Map index to record IDs
    test_records = []
    test_indices = X_test.index.tolist()
    
    discrepancy_indices = []
    for idx_pos in range(len(test_indices)):
        orig_idx = test_indices[idx_pos]
        b_pred = int(baseline_preds[idx_pos])
        r_pred = int(race_to_preds[idx_pos])
        is_disc = (b_pred != r_pred)
        if is_disc:
            discrepancy_indices.append(idx_pos)
            
        test_records.append({
            "record_id": f"REC-{orig_idx:06d}",
            "test_pos": idx_pos,
            "orig_idx": orig_idx,
            "baseline_prediction": "APPROVED" if b_pred == 1 else "DENIED",
            "race_threshold_prediction": "APPROVED" if r_pred == 1 else "DENIED",
            "baseline_prob": float(baseline_probs[idx_pos]),
            "discrepancy": is_disc,
            "derived_race": str(p_test.iloc[idx_pos]["derived_race"]),
            "applicant_age": str(p_test.iloc[idx_pos]["applicant_age"])
        })
        
    print(f"[Prediction Engine] Pipeline ready in {time.time() - t0:.2f}s! Total test: {len(test_records)}, Discrepancies: {len(discrepancy_indices)}")
    
    _ENGINE_CACHE["preprocessor"] = preprocessor
    _ENGINE_CACHE["xgb_model"] = xgb_model
    _ENGINE_CACHE["threshold_opt"] = threshold_opt
    _ENGINE_CACHE["shap_explainer"] = shap_explainer
    _ENGINE_CACHE["X_test"] = X_test
    _ENGINE_CACHE["y_test"] = y_test
    _ENGINE_CACHE["p_test"] = p_test
    _ENGINE_CACHE["X_test_trans"] = X_test_trans
    _ENGINE_CACHE["test_records"] = test_records
    _ENGINE_CACHE["discrepancy_indices"] = discrepancy_indices
    _ENGINE_CACHE["feature_names_out"] = preprocessor.get_feature_names_out()
    
    return _ENGINE_CACHE

def generate_shap_explanations(
    input_df: pd.DataFrame,
    transformed_arr: np.ndarray,
    baseline_pred_str: str,
    race_to_pred_str: str,
    race_val: str = "White"
):
    """Generates structured SHAP explanations for BOTH Baseline XGBoost and Race ThresholdOptimizer models."""
    engine = get_prediction_engine()
    explainer = engine["shap_explainer"]
    feature_names = engine["feature_names_out"]
    
    try:
        exp_val = getattr(explainer, "expected_value", 0.0)
        if isinstance(exp_val, (list, np.ndarray)):
            base_val = float(exp_val[-1])
        else:
            base_val = float(exp_val)
    except Exception:
        base_val = 0.0

    try:
        shap_out = explainer.shap_values(transformed_arr)
        if isinstance(shap_out, list):
            shap_vals = np.array(shap_out[-1])
        else:
            shap_vals = np.array(shap_out)
        if shap_vals.ndim > 1:
            shap_vals = shap_vals[0]
    except Exception as e:
        print(f"[Prediction Engine] SHAP explanation warning: {e}")
        shap_vals = np.zeros(len(feature_names))
    
    # Map transformed SHAP values back to original feature names
    feature_shap_map = {feat: 0.0 for feat in MODEL_FEATURES}
    for feat_name, val in zip(feature_names, shap_vals):
        val_float = float(val)
        if feat_name.startswith("cat__"):
            clean = feat_name.replace("cat__", "")
            for f in CATEGORICAL_FEATURES:
                if clean.startswith(f):
                    feature_shap_map[f] += val_float
                    break
        elif feat_name.startswith("num__"):
            clean = feat_name.replace("num__", "")
            if clean in feature_shap_map:
                feature_shap_map[clean] = val_float
                
    # 1. Baseline XGBoost SHAP Table
    baseline_shap_table = []
    for feat in MODEL_FEATURES:
        contrib = feature_shap_map[feat]
        effect = "Approval" if contrib >= 0 else "Denial"
        baseline_shap_table.append({
            "feature": feat.replace("_", " ").title(),
            "feature_key": feat,
            "contribution": round(contrib, 4),
            "effect": effect,
            "raw_value": str(input_df.iloc[0][feat])
        })
    baseline_shap_table.sort(key=lambda x: abs(x["contribution"]), reverse=True)
    
    # 2. Race ThresholdOptimizer SHAP Table
    mitigated_shap_table = []
    is_mitigated_approve = (race_to_pred_str == "APPROVED")
    for feat in MODEL_FEATURES:
        contrib = feature_shap_map[feat]
        effect = "Approval" if contrib >= 0 else "Denial"
        mitigated_shap_table.append({
            "feature": feat.replace("_", " ").title(),
            "feature_key": feat,
            "contribution": round(contrib, 4),
            "effect": effect,
            "raw_value": str(input_df.iloc[0][feat])
        })
    mitigated_shap_table.sort(key=lambda x: abs(x["contribution"]), reverse=True)
    
    return {
        "baseline_shap": {
            "model_name": "Baseline XGBoost",
            "decision": baseline_pred_str,
            "base_value": round(base_val, 4),
            "top_features": baseline_shap_table
        },
        "mitigated_shap": {
            "model_name": "Race ThresholdOptimizer — Demographic Parity",
            "decision": race_to_pred_str,
            "sensitive_group": race_val,
            "base_value": round(base_val, 4),
            "top_features": mitigated_shap_table,
            "threshold_note": f"Decision evaluated under Demographic Parity post-processing for group '{race_val}'."
        }
    }

def get_test_summary():
    """Returns summary statistics for test set validation queue."""
    engine = get_prediction_engine()
    test_records = engine["test_records"]
    disc_count = len(engine["discrepancy_indices"])
    total_records = len(test_records)
    agreements = total_records - disc_count
    
    resolved_count = len([v for v in HUMAN_VALIDATIONS.values() if not v.get("is_new_prediction")])
    
    return {
        "total_records": total_records,
        "agreements": agreements,
        "discrepancies": disc_count,
        "discrepancy_rate": round(disc_count / total_records, 4),
        "resolved_count": resolved_count
    }

def get_test_queue(filter_type: str = "discrepancies"):
    """Returns test records for review queue."""
    engine = get_prediction_engine()
    test_records = engine["test_records"]
    
    queue = []
    for rec in test_records:
        if filter_type == "discrepancies" and not rec["discrepancy"]:
            continue
            
        rec_id = rec["record_id"]
        status = "RESOLVED" if rec_id in HUMAN_VALIDATIONS else "REVIEW"
        
        queue.append({
            "record_id": rec_id,
            "baseline_prediction": rec["baseline_prediction"],
            "race_threshold_prediction": rec["race_threshold_prediction"],
            "status": status,
            "derived_race": rec["derived_race"],
            "applicant_age": rec["applicant_age"],
            "discrepancy": rec["discrepancy"]
        })
        
    return queue

def get_test_record_detail(record_id: str):
    """Returns complete test record features, side-by-side decisions, SHAP for both models, and audit data."""
    engine = get_prediction_engine()
    test_records = engine["test_records"]
    X_test = engine["X_test"]
    p_test = engine["p_test"]
    X_test_trans = engine["X_test_trans"]
    
    target_rec = None
    for rec in test_records:
        if rec["record_id"] == record_id:
            target_rec = rec
            break
            
    if not target_rec:
        raise ValueError(f"Test record ID {record_id} not found")
        
    pos = target_rec["test_pos"]
    row_df = X_test.iloc[[pos]]
    p_df = p_test.iloc[[pos]]
    trans_arr = X_test_trans[pos:pos+1]
    
    applicant_info = {
        "categorical": {
            "derived_dwelling_category": str(row_df.iloc[0]["derived_dwelling_category"]),
            "loan_purpose": str(row_df.iloc[0]["loan_purpose"]),
            "conforming_loan_limit": str(row_df.iloc[0]["conforming_loan_limit"]),
            "occupancy_type": str(row_df.iloc[0]["occupancy_type"])
        },
        "numerical": {
            "loan_amount": float(row_df.iloc[0]["loan_amount"]),
            "loan_to_value_ratio": float(row_df.iloc[0]["loan_to_value_ratio"]),
            "loan_term": float(row_df.iloc[0]["loan_term"]),
            "property_value": float(row_df.iloc[0]["property_value"]),
            "income": float(row_df.iloc[0]["income"]),
            "debt_to_income_ratio": float(row_df.iloc[0]["debt_to_income_ratio"])
        }
    }
    
    race_val = str(p_df.iloc[0]["derived_race"])
    protected_info = {
        "derived_race": race_val,
        "derived_ethnicity": str(p_df.iloc[0]["derived_ethnicity"]),
        "derived_sex": str(p_df.iloc[0]["derived_sex"]),
        "applicant_age": str(p_df.iloc[0]["applicant_age"])
    }
    
    explanations = generate_shap_explanations(
        row_df,
        trans_arr,
        target_rec["baseline_prediction"],
        target_rec["race_threshold_prediction"],
        race_val
    )
    existing_validation = HUMAN_VALIDATIONS.get(record_id)
    
    return {
        "record_id": record_id,
        "applicant_info": applicant_info,
        "protected_info": protected_info,
        "baseline_prediction": target_rec["baseline_prediction"],
        "race_threshold_prediction": target_rec["race_threshold_prediction"],
        "baseline_prob": target_rec["baseline_prob"],
        "discrepancy": target_rec["discrepancy"],
        "explanations": explanations,
        "existing_validation": existing_validation
    }

def predict_new_applicant(input_data: Dict[str, Any]):
    """Accepts manual applicant inputs, transforms, predicts with both models, and generates SHAP for both models."""
    engine = get_prediction_engine()
    preprocessor = engine["preprocessor"]
    xgb_model = engine["xgb_model"]
    threshold_opt = engine["threshold_opt"]
    
    row_dict = {
        "derived_dwelling_category": [str(input_data.get("derived_dwelling_category", "Single Family (1-4 Units)"))],
        "loan_purpose": [str(input_data.get("loan_purpose", "Home Purchase"))],
        "conforming_loan_limit": [str(input_data.get("conforming_loan_limit", "C"))],
        "occupancy_type": [str(input_data.get("occupancy_type", "Principal residence"))],
        "loan_amount": [float(input_data.get("loan_amount", 300000))],
        "loan_to_value_ratio": [float(input_data.get("loan_to_value_ratio", 80.0))],
        "loan_term": [float(input_data.get("loan_term", 360))],
        "property_value": [float(input_data.get("property_value", 375000))],
        "income": [float(input_data.get("income", 95000))],
        "debt_to_income_ratio": [float(input_data.get("debt_to_income_ratio", 32.0))]
    }
    
    row_df = pd.DataFrame(row_dict)
    trans_arr = preprocessor.transform(row_df)
    
    b_prob = float(xgb_model.predict_proba(trans_arr)[0, 1])
    b_pred = "APPROVED" if b_prob >= 0.5 else "DENIED"
    
    race_val = str(input_data.get("derived_race", "White"))
    race_series = pd.Series([race_val])
    
    r_pred_val = int(safe_predict_threshold_optimizer(threshold_opt, trans_arr, race_series)[0])
    r_pred = "APPROVED" if r_pred_val == 1 else "DENIED"
    
    is_disc = (b_pred != r_pred)
    
    explanations = generate_shap_explanations(
        row_df,
        trans_arr,
        b_pred,
        r_pred,
        race_val
    )
    
    protected_info = {
        "derived_race": race_val,
        "derived_ethnicity": str(input_data.get("derived_ethnicity", "Not Hispanic or Latino")),
        "derived_sex": str(input_data.get("derived_sex", "Male")),
        "applicant_age": str(input_data.get("applicant_age", "35-44"))
    }
    
    return {
        "applicant_info": {
            "categorical": {k: row_dict[k][0] for k in CATEGORICAL_FEATURES},
            "numerical": {k: row_dict[k][0] for k in NUMERICAL_FEATURES}
        },
        "protected_info": protected_info,
        "baseline_prediction": b_pred,
        "race_threshold_prediction": r_pred,
        "baseline_prob": round(b_prob, 4),
        "discrepancy": is_disc,
        "explanations": explanations
    }

def save_human_validation(payload: Dict[str, Any]):
    """Saves audit record for human validation decision."""
    record_id = payload.get("record_id") or f"NEW-{int(time.time())}"
    
    audit_record = {
        "record_id": record_id,
        "timestamp": datetime.datetime.now().isoformat(),
        "baseline_prediction": payload.get("baseline_prediction"),
        "race_threshold_prediction": payload.get("race_threshold_prediction"),
        "human_decision": payload.get("human_decision"),
        "human_reason": payload.get("human_reason"),
        "is_new_prediction": payload.get("is_new_prediction", False)
    }
    
    HUMAN_VALIDATIONS[record_id] = audit_record
    return audit_record
