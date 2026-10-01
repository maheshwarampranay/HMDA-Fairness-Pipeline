import os
import uuid
import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Any, Optional

# In-memory session data storage
DATA_SETS: Dict[str, pd.DataFrame] = {}

BENCHMARK_DATA_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "data", "hmda_benchmark.csv")
)

def store_dataframe(df: pd.DataFrame, filename: str) -> Tuple[str, Dict[str, Any]]:
    """
    Stores DataFrame in session store and extracts metadata with column suggestions.
    """
    file_id = str(uuid.uuid4())
    
    # Ensure missing values handled safely
    df = df.ffill().bfill()
    DATA_SETS[file_id] = df

    columns = list(df.columns)
    num_rows, num_cols = df.shape
    
    # Heuristics for suggesting columns
    suggested_target = None
    suggested_pred = None
    suggested_prob = None
    suggested_protected = []

    for col in columns:
        col_lower = col.lower()
        if col in ['target', 'action_taken', 'Approval_Decision', 'Default_12M'] or 'ground' in col_lower or 'actual' in col_lower or 'true' in col_lower:
            if not suggested_target:
                suggested_target = col
        elif col in ['prob_baseline', 'xgb_prob'] or 'prob' in col_lower or ('score' in col_lower and pd.api.types.is_numeric_dtype(df[col])):
            if not suggested_prob:
                suggested_prob = col
        elif col in ['pred_baseline', 'xgb_pred', 'Approval_Decision'] or 'decision' in col_lower or 'pred' in col_lower or 'approval' in col_lower:
            if not suggested_pred and df[col].nunique() == 2:
                suggested_pred = col
        
        if col in ['derived_race', 'derived_sex', 'derived_ethnicity', 'applicant_age', 'state_code', 'race', 'sex', 'ethnicity', 'age_group']:
            suggested_protected.append(col)

    # Fallbacks if not auto-detected
    if not suggested_target:
        for col in columns:
            if df[col].nunique() == 2:
                suggested_target = col
                break
    if not suggested_pred:
        for col in columns:
            if df[col].nunique() == 2 and col != suggested_target:
                suggested_pred = col
                break

    sample_data = df.head(5).to_dict(orient='records')
    
    # Clean NaNs in sample_data for JSON safety
    for row in sample_data:
        for k, v in row.items():
            if pd.isna(v):
                row[k] = ""

    return file_id, {
        "file_id": file_id,
        "filename": filename,
        "num_rows": num_rows,
        "num_cols": num_cols,
        "columns": columns,
        "sample_data": sample_data,
        "suggested_target": suggested_target or (columns[0] if len(columns) > 0 else ""),
        "suggested_pred": suggested_pred or (columns[1] if len(columns) > 1 else ""),
        "suggested_prob": suggested_prob,
        "suggested_protected": suggested_protected
    }

def load_benchmark_dataset() -> Tuple[str, Dict[str, Any]]:
    """Loads default benchmark HMDA dataset."""
    if os.path.exists(BENCHMARK_DATA_PATH):
        df = pd.read_csv(BENCHMARK_DATA_PATH)
    else:
        # Fallback: import generate_hmda_benchmark generator
        try:
            from generate_hmda_benchmark import generate_hmda_dataset
            df = generate_hmda_dataset()
        except Exception:
            raise RuntimeError(f"HMDA benchmark dataset file not found at {BENCHMARK_DATA_PATH}")
    return store_dataframe(df, "hmda_benchmark.csv")

def get_dataframe(file_id: str) -> pd.DataFrame:
    """Retrieves dataframe by session ID."""
    if file_id not in DATA_SETS:
        raise KeyError(f"File ID {file_id} not found in session memory.")
    return DATA_SETS[file_id]

def auto_bin_series(series: pd.Series, col_name: str) -> Tuple[pd.Series, str]:
    """
    Bins numeric series into discrete categorical labels if continuous.
    Returns (binned_series, reference_group).
    """
    # Preferred reference groups for HMDA protected attributes
    if col_name == 'derived_race' and 'White' in series.values:
        return series.astype(str), 'White'
    if col_name == 'derived_sex' and 'Male' in series.values:
        return series.astype(str), 'Male'
    if col_name == 'derived_ethnicity' and 'Not Hispanic or Latino' in series.values:
        return series.astype(str), 'Not Hispanic or Latino'
    if col_name == 'applicant_age' and '35-44' in series.values:
        return series.astype(str), '35-44'
    if col_name == 'state_code' and 'CA' in series.values:
        return series.astype(str), 'CA'

    if not pd.api.types.is_numeric_dtype(series) or series.nunique() <= 8:
        counts = series.value_counts()
        ref = str(counts.index[0]) if len(counts) > 0 else str(series.iloc[0])
        return series.astype(str), ref

    vals = series.dropna()
    if 'age' in col_name.lower():
        bins = [-np.inf, 25, 35, 45, 55, 65, np.inf]
        labels = ['<25', '25-34', '35-44', '45-54', '55-64', '65+']
        binned = pd.cut(series, bins=bins, labels=labels)
        return binned.astype(str), '35-44'
    
    # Quantile tertiles for continuous metrics
    try:
        q1, q2 = vals.quantile(0.33), vals.quantile(0.67)
        bins = [-np.inf, q1, q2, np.inf]
        labels = [f'Low (<={round(q1, 1)})', f'Med ({round(q1, 1)}-{round(q2, 1)})', f'High (>{round(q2, 1)})']
        binned = pd.cut(series, bins=bins, labels=labels)
        return binned.astype(str), labels[1]
    except Exception:
        bins = [-np.inf, vals.median(), np.inf]
        labels = ['Low', 'High']
        binned = pd.cut(series, bins=bins, labels=labels)
        return binned.astype(str), 'High'

