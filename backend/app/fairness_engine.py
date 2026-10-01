import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional, Tuple
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix
)
from app.data_utils import auto_bin_series

# Threshold presets per risk tier
THRESHOLD_PRESETS = {
    "strict": {
        "disparate_impact_min": 0.80,
        "disparate_impact_max": 1.25,
        "demographic_parity_max": 0.05,
        "equalized_odds_max": 0.05,
        "equal_opportunity_max": 0.05,
        "predictive_parity_max": 0.05,
    },
    "moderate": {
        "disparate_impact_min": 0.75,
        "disparate_impact_max": 1.33,
        "demographic_parity_max": 0.10,
        "equalized_odds_max": 0.10,
        "equal_opportunity_max": 0.10,
        "predictive_parity_max": 0.10,
    },
    "lenient": {
        "disparate_impact_min": 0.65,
        "disparate_impact_max": 1.50,
        "demographic_parity_max": 0.15,
        "equalized_odds_max": 0.15,
        "equal_opportunity_max": 0.15,
        "predictive_parity_max": 0.15,
    }
}

def get_thresholds(risk_tier: str, custom_thresholds: Optional[Dict[str, float]] = None) -> Dict[str, float]:
    base = THRESHOLD_PRESETS.get(risk_tier.lower(), THRESHOLD_PRESETS["moderate"]).copy()
    if custom_thresholds:
        base.update(custom_thresholds)
    return base

def compute_performance_metrics(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    y_prob: Optional[np.ndarray] = None
) -> Dict[str, Any]:
    """Calculates overall model classification metrics."""
    n_samples = len(y_true)
    if n_samples == 0:
        return {
            "accuracy": 0.0, "precision": 0.0, "recall": 0.0, "f1_score": 0.0,
            "roc_auc": 0.0, "specificity": 0.0, "tpr": 0.0, "fpr": 0.0, "fnr": 0.0,
            "total_count": 0, "positive_pred_count": 0, "positive_true_count": 0,
            "confusion_matrix": {"tp": 0, "fp": 0, "tn": 0, "fn": 0}
        }

    acc = float(accuracy_score(y_true, y_pred))
    prec = float(precision_score(y_true, y_pred, zero_division=0))
    rec = float(recall_score(y_true, y_pred, zero_division=0))
    f1 = float(f1_score(y_true, y_pred, zero_division=0))
    
    auc = 0.0
    if y_prob is not None and len(np.unique(y_true)) > 1:
        try:
            auc = float(roc_auc_score(y_true, y_prob))
        except Exception:
            auc = 0.0

    tn, fp, fn, tp = confusion_matrix(y_true, y_pred, labels=[0, 1]).ravel()
    
    tpr = float(tp / (tp + fn)) if (tp + fn) > 0 else 0.0
    fpr = float(fp / (fp + tn)) if (fp + tn) > 0 else 0.0
    fnr = float(fn / (fn + tp)) if (fn + tp) > 0 else 0.0
    spec = float(tn / (tn + fp)) if (tn + fp) > 0 else 0.0

    return {
        "accuracy": round(acc, 4),
        "precision": round(prec, 4),
        "recall": round(rec, 4),
        "f1_score": round(f1, 4),
        "roc_auc": round(auc, 4),
        "specificity": round(spec, 4),
        "tpr": round(tpr, 4),
        "fpr": round(fpr, 4),
        "fnr": round(fnr, 4),
        "total_count": int(n_samples),
        "positive_pred_count": int((y_pred == 1).sum()),
        "positive_true_count": int((y_true == 1).sum()),
        "confusion_matrix": {
            "tp": int(tp),
            "fp": int(fp),
            "tn": int(tn),
            "fn": int(fn)
        }
    }

def parse_binary_array(series: pd.Series, threshold: float = 0.5) -> np.ndarray:
    """Converts continuous, string, or boolean series into binary 0/1 array safely."""
    if pd.api.types.is_string_dtype(series) or pd.api.types.is_object_dtype(series):
        vals = series.astype(str).str.lower().str.strip()
        return np.where(vals.isin(['1', 'true', 'approved', 'good', 'yes', 'pass', 'default', '1.0']), 1, 0)
    
    try:
        arr = series.to_numpy(dtype=float, na_value=0.0)
        if not np.array_equal(arr, arr.astype(int)):
            return (arr >= threshold).astype(int)
        return arr.astype(int)
    except Exception:
        vals = series.astype(str).str.lower().str.strip()
        return np.where(vals.isin(['1', 'true', 'approved', 'good', 'yes', 'pass', 'default', '1.0']), 1, 0)

def audit_protected_attribute(
    df: pd.DataFrame,
    attribute_col: str,
    target_col: str,
    pred_col: str,
    reference_group: Optional[str] = None,
    thresholds: Optional[Dict[str, float]] = None
) -> Dict[str, Any]:
    """
    Audits a single protected attribute across all group values.
    Computes Selection Rate, DIR, DPD, TPR, FPR, EOD relative to reference group.
    """
    if thresholds is None:
        thresholds = THRESHOLD_PRESETS["moderate"]

    # Bin numeric attribute if necessary
    series = df[attribute_col]
    binned_series, auto_ref = auto_bin_series(series, attribute_col)
    
    groups = binned_series.values
    unique_groups = sorted(list(set(groups)))
    
    if reference_group is None or reference_group not in unique_groups:
        reference_group = auto_ref if auto_ref in unique_groups else unique_groups[0]

    y_true = parse_binary_array(df[target_col])
    y_pred = parse_binary_array(df[pred_col])

    # Compute single group stats
    group_stats = {}
    for g in unique_groups:
        mask = (groups == g)
        y_t_g, y_p_g = y_true[mask], y_pred[mask]
        n_g = len(y_t_g)
        
        if n_g == 0:
            group_stats[g] = {
                "count": 0, "selection_rate": 0.0, "approval_count": 0,
                "accuracy": 0.0, "precision": 0.0, "recall": 0.0, "tpr": 0.0, "fpr": 0.0
            }
            continue

        sel_rate = float((y_p_g == 1).mean())
        app_count = int((y_p_g == 1).sum())
        acc = float(accuracy_score(y_t_g, y_p_g))
        prec = float(precision_score(y_t_g, y_p_g, zero_division=0))
        rec = float(recall_score(y_t_g, y_p_g, zero_division=0))
        
        tn, fp, fn, tp = confusion_matrix(y_t_g, y_p_g, labels=[0, 1]).ravel()
        tpr = float(tp / (tp + fn)) if (tp + fn) > 0 else 0.0
        fpr = float(fp / (fp + tn)) if (fp + tn) > 0 else 0.0

        group_stats[g] = {
            "count": int(n_g),
            "selection_rate": round(sel_rate, 4),
            "approval_count": app_count,
            "accuracy": round(acc, 4),
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "tpr": round(tpr, 4),
            "fpr": round(fpr, 4)
        }

    ref_stats = group_stats[reference_group]
    ref_sel_rate = ref_stats["selection_rate"]
    ref_tpr = ref_stats["tpr"]
    ref_fpr = ref_stats["fpr"]
    ref_prec = ref_stats["precision"]

    # Compute disparities
    max_dir_dev = 0.0
    max_dpd = 0.0
    max_eod = 0.0
    max_eopp = 0.0
    max_ppd = 0.0

    group_metrics_list = []
    attr_status = "PASS"

    for g in unique_groups:
        stats = group_stats[g]
        is_ref = (g == reference_group)
        
        dir_val = round(stats["selection_rate"] / ref_sel_rate, 4) if ref_sel_rate > 0 else 1.0
        dpd_val = round(abs(ref_sel_rate - stats["selection_rate"]), 4)
        eopp_val = round(abs(ref_tpr - stats["tpr"]), 4)
        fpr_diff = abs(ref_fpr - stats["fpr"])
        eod_val = round((eopp_val + fpr_diff) / 2.0, 4)
        ppd_val = round(abs(ref_prec - stats["precision"]), 4)

        # Status determination per group
        g_status = "PASS"
        dir_min = thresholds["disparate_impact_min"]
        dpd_max = thresholds["demographic_parity_max"]
        eod_max = thresholds["equalized_odds_max"]

        if dir_val < (dir_min - 0.15) or dpd_val > (dpd_max + 0.10) or eod_val > (eod_max + 0.10):
            g_status = "HIGH BIAS"
        elif dir_val < dir_min or dpd_val > dpd_max or eod_val > eod_max:
            g_status = "FLAG"

        if g_status == "HIGH BIAS":
            attr_status = "HIGH BIAS"
        elif g_status == "FLAG" and attr_status != "HIGH BIAS":
            attr_status = "FLAG"

        if not is_ref:
            max_dpd = max(max_dpd, dpd_val)
            max_eod = max(max_eod, eod_val)
            max_eopp = max(max_eopp, eopp_val)
            max_ppd = max(max_ppd, ppd_val)
            
            # Dev from 1.0 for DIR
            if dir_val < 1.0:
                max_dir_dev = max(max_dir_dev, 1.0 - dir_val)

        group_metrics_list.append({
            "group_name": str(g),
            "attribute": attribute_col,
            "count": stats["count"],
            "selection_rate": stats["selection_rate"],
            "approval_count": stats["approval_count"],
            "accuracy": stats["accuracy"],
            "precision": stats["precision"],
            "recall": stats["recall"],
            "tpr": stats["tpr"],
            "fpr": stats["fpr"],
            "disparate_impact_ratio": dir_val,
            "demographic_parity_diff": dpd_val,
            "equalized_odds_diff": eod_val,
            "is_reference": is_ref,
            "status": g_status
        })

    disparate_impact_overall = round(1.0 - max_dir_dev, 4)

    message = (
        f"Protected attribute '{attribute_col}' audited against reference group '{reference_group}'. "
        f"Status: {attr_status}."
    )

    return {
        "attribute": attribute_col,
        "reference_group": reference_group,
        "disparate_impact_ratio": disparate_impact_overall,
        "demographic_parity_diff": round(max_dpd, 4),
        "equal_opportunity_diff": round(max_eopp, 4),
        "equalized_odds_diff": round(max_eod, 4),
        "predictive_parity_diff": round(max_ppd, 4),
        "groups": group_metrics_list,
        "status": attr_status,
        "message": message
    }

def compute_subgroup_analysis(
    df: pd.DataFrame,
    protected_cols: List[str],
    target_col: str,
    pred_col: str,
    overall_selection_rate: float
) -> List[Dict[str, Any]]:
    """
    Computes subgroup analysis across single attributes (1-way) and pairwise combinations (2-way).
    """
    subgroup_results = []
    y_true = parse_binary_array(df[target_col])
    y_pred = parse_binary_array(df[pred_col])
    total_n = len(df)

    # Prepare binned series for protected attributes
    binned_df = pd.DataFrame()
    for col in protected_cols:
        binned_df[col], _ = auto_bin_series(df[col], col)

    # 1. Single Attribute Subgroups
    for col in protected_cols:
        for val in sorted(binned_df[col].unique()):
            mask = (binned_df[col] == val)
            n_sg = int(mask.sum())
            if n_sg == 0:
                continue

            y_t_sg, y_p_sg = y_true[mask], y_pred[mask]
            sel_rate = float((y_p_sg == 1).mean())
            app_count = int((y_p_sg == 1).sum())
            acc = float(accuracy_score(y_t_sg, y_p_sg))

            tn, fp, fn, tp = confusion_matrix(y_t_sg, y_p_sg, labels=[0, 1]).ravel()
            tpr = float(tp / (tp + fn)) if (tp + fn) > 0 else 0.0
            fpr = float(fp / (fp + tn)) if (fp + tn) > 0 else 0.0

            disparity_ratio = round(sel_rate / overall_selection_rate, 4) if overall_selection_rate > 0 else 1.0

            status = "PASS"
            if disparity_ratio < 0.65 or abs(sel_rate - overall_selection_rate) > 0.20:
                status = "HIGH BIAS"
            elif disparity_ratio < 0.80 or abs(sel_rate - overall_selection_rate) > 0.10:
                status = "FLAG"

            subgroup_results.append({
                "subgroup_id": f"{col}::{val}",
                "label": f"{col}: {val}",
                "combination_type": "single_attribute",
                "count": n_sg,
                "percentage": round(n_sg / total_n * 100, 2),
                "selection_rate": round(sel_rate, 4),
                "approval_count": app_count,
                "accuracy": round(acc, 4),
                "tpr": round(tpr, 4),
                "fpr": round(fpr, 4),
                "disparity_ratio": disparity_ratio,
                "status": status
            })

    # 2. Combined Attributes Subgroups (Pairwise 2-way)
    if len(protected_cols) >= 2:
        for i in range(len(protected_cols)):
            for j in range(i + 1, len(protected_cols)):
                col1, col2 = protected_cols[i], protected_cols[j]
                grouped = binned_df.groupby([col1, col2])
                
                for (v1, v2), group_indices in grouped.groups.items():
                    mask = binned_df.index.isin(group_indices)
                    n_sg = int(mask.sum())
                    if n_sg < 10: # filter very small subgroups for statistical stability
                        continue

                    y_t_sg, y_p_sg = y_true[mask], y_pred[mask]
                    sel_rate = float((y_p_sg == 1).mean())
                    app_count = int((y_p_sg == 1).sum())
                    acc = float(accuracy_score(y_t_sg, y_p_sg))

                    tn, fp, fn, tp = confusion_matrix(y_t_sg, y_p_sg, labels=[0, 1]).ravel()
                    tpr = float(tp / (tp + fn)) if (tp + fn) > 0 else 0.0
                    fpr = float(fp / (fp + tn)) if (fp + tn) > 0 else 0.0

                    disparity_ratio = round(sel_rate / overall_selection_rate, 4) if overall_selection_rate > 0 else 1.0

                    status = "PASS"
                    if disparity_ratio < 0.65 or abs(sel_rate - overall_selection_rate) > 0.20:
                        status = "HIGH BIAS"
                    elif disparity_ratio < 0.80 or abs(sel_rate - overall_selection_rate) > 0.10:
                        status = "FLAG"

                    subgroup_results.append({
                        "subgroup_id": f"{col1}:{v1} & {col2}:{v2}",
                        "label": f"{col1}: {v1} & {col2}: {v2}",
                        "combination_type": "combined_attributes",
                        "count": n_sg,
                        "percentage": round(n_sg / total_n * 100, 2),
                        "selection_rate": round(sel_rate, 4),
                        "approval_count": app_count,
                        "accuracy": round(acc, 4),
                        "tpr": round(tpr, 4),
                        "fpr": round(fpr, 4),
                        "disparity_ratio": disparity_ratio,
                        "status": status
                    })

    return subgroup_results
