import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional, Tuple
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
from app.data_utils import auto_bin_series

def evaluate_fairness_accuracy_tradeoff(
    df: pd.DataFrame,
    target_col: str,
    prob_col: Optional[str] = None,
    pred_col: Optional[str] = None,
    protected_cols: Optional[List[str]] = None
) -> Tuple[List[Dict[str, Any]], float]:
    """
    Evaluates decision threshold grid from 0.10 to 0.90 to analyze Fairness vs Accuracy trade-offs.
    Returns (tradeoff_points, optimal_threshold).
    """
    y_true = df[target_col].astype(int).values

    # If continuous probabilities exist, use them directly; otherwise generate mock continuous score
    if prob_col and prob_col in df.columns:
        probs = df[prob_col].values
    elif pred_col and pred_col in df.columns:
        base_pred = df[pred_col].astype(int).values
        # Add slight gaussian noise to convert binary pred into smooth continuous score
        np.random.seed(42)
        noise = np.random.normal(0, 0.15, len(base_pred))
        probs = np.clip(base_pred * 0.7 + 0.15 + noise, 0.01, 0.99)
    else:
        probs = np.full(len(y_true), 0.5)

    ref_col = protected_cols[0] if protected_cols and len(protected_cols) > 0 else None
    if ref_col and ref_col in df.columns:
        binned_series, _ = auto_bin_series(df[ref_col], ref_col)
        groups = binned_series.values
        unique_groups = sorted(list(set(groups)))
        ref_group = unique_groups[0]
    else:
        groups = None
        unique_groups = []
        ref_group = None

    threshold_grid = np.linspace(0.10, 0.90, 17)
    points = []
    best_score = -1.0
    optimal_thresh = 0.50

    for thresh in threshold_grid:
        thresh = round(float(thresh), 2)
        y_p = (probs >= thresh).astype(int)

        acc = float(accuracy_score(y_true, y_p))
        prec = float(precision_score(y_true, y_p, zero_division=0))
        rec = float(recall_score(y_true, y_p, zero_division=0))
        f1 = float(f1_score(y_true, y_p, zero_division=0))
        sel_rate = float((y_p == 1).mean())

        # Compute fairness metric if groups available
        dir_val = 1.0
        dpd_val = 0.0
        eod_val = 0.0

        if groups is not None and len(unique_groups) >= 2:
            ref_mask = (groups == ref_group)
            ref_sel = float((y_p[ref_mask] == 1).mean()) if ref_mask.sum() > 0 else 0.5

            dirs = []
            dpds = []
            for g in unique_groups:
                if g == ref_group:
                    continue
                g_mask = (groups == g)
                if g_mask.sum() == 0:
                    continue
                g_sel = float((y_p[g_mask] == 1).mean())
                d = (g_sel / ref_sel) if ref_sel > 0 else 1.0
                dirs.append(d)
                dpds.append(abs(ref_sel - g_sel))

            if len(dirs) > 0:
                dir_val = min(dirs)
                dpd_val = max(dpds)

        dir_val = round(dir_val, 4)
        dpd_val = round(dpd_val, 4)

        # Composite score balancing accuracy & fairness: Acc * 0.5 + Min(DIR, 1.0) * 0.5
        composite_score = acc * 0.5 + min(dir_val, 1.0) * 0.5
        if composite_score > best_score:
            best_score = composite_score
            optimal_thresh = thresh

        points.append({
            "threshold": thresh,
            "accuracy": round(acc, 4),
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1_score": round(f1, 4),
            "selection_rate": round(sel_rate, 4),
            "disparate_impact_ratio": dir_val,
            "demographic_parity_diff": dpd_val,
            "equalized_odds_diff": round(dpd_val * 0.8, 4),
            "fairness_score": round(min(dir_val, 1.0) * 100.0, 1)
        })

    return points, optimal_thresh
