import os
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.pipeline import Pipeline
from xgboost import XGBClassifier
from fairlearn.reductions import ExponentiatedGradient, DemographicParity
from sklearn.base import clone

def generate_hmda_dataset():
    np.random.seed(42)
    n = 6000

    races = ["White", "Black or African American", "Asian", "American Indian or Alaska Native", "Native Hawaiian or Other Pacific Islander", "2 or more minority races", "Joint"]
    race_p = [0.58, 0.15, 0.12, 0.02, 0.01, 0.06, 0.06]

    sexes = ["Male", "Female", "Joint"]
    sex_p = [0.52, 0.40, 0.08]

    ethnicities = ["Not Hispanic or Latino", "Hispanic or Latino", "Joint"]
    ethnicity_p = [0.75, 0.20, 0.05]

    ages = ["35-44", "25-34", "45-54", "55-64", "65-74", "<25", ">74"]
    age_p = [0.28, 0.22, 0.22, 0.15, 0.08, 0.03, 0.02]

    states = ["CA", "FL", "TX", "NY", "IL", "PA", "OH", "GA", "NC", "MI", "AZ", "WA", "MA", "MS", "AK"]
    state_p = [0.18, 0.12, 0.12, 0.08, 0.06, 0.05, 0.05, 0.05, 0.05, 0.04, 0.05, 0.04, 0.04, 0.04, 0.03]

    dwelling_cats = ["Single Family (1-4 Units)", "Multifamily"]
    dwelling_p = [0.88, 0.12]

    loan_purposes = ["Home Purchase", "Refinancing", "Home Improvement"]
    purpose_p = [0.55, 0.35, 0.10]

    conforming_limits = ["C", "NC"]
    conforming_p = [0.82, 0.18]

    occupancies = ["Principal residence", "Second residence", "Investment property"]
    occupancy_p = [0.85, 0.08, 0.07]

    derived_race = np.random.choice(races, size=n, p=race_p)
    derived_sex = np.random.choice(sexes, size=n, p=sex_p)
    derived_ethnicity = np.random.choice(ethnicities, size=n, p=ethnicity_p)
    applicant_age = np.random.choice(ages, size=n, p=age_p)
    state_code = np.random.choice(states, size=n, p=state_p)
    derived_dwelling_category = np.random.choice(dwelling_cats, size=n, p=dwelling_p)
    loan_purpose = np.random.choice(loan_purposes, size=n, p=purpose_p)
    conforming_loan_limit = np.random.choice(conforming_limits, size=n, p=conforming_p)
    occupancy_type = np.random.choice(occupancies, size=n, p=occupancy_p)

    loan_amount = np.random.randint(80, 800, size=n) * 1000
    property_value = (loan_amount / np.random.uniform(0.60, 0.95, size=n)).astype(int)
    loan_to_value_ratio = np.round((loan_amount / property_value) * 100, 2)
    loan_term = np.random.choice([360, 180, 240], size=n, p=[0.85, 0.10, 0.05])
    income = np.random.randint(35, 350, size=n)
    debt_to_income_ratio = np.round(np.random.uniform(15.0, 55.0, size=n), 1)

    # Base financial signal
    logit = (
        0.8
        + 0.012 * income
        - 0.05 * debt_to_income_ratio
        - 0.04 * (loan_to_value_ratio - 70)
        + 0.5 * (conforming_loan_limit == "C")
        + 0.4 * (loan_purpose == "Home Purchase")
    )
    
    # Ground truth approval probabilities with realistic historical structural differences
    race_effect = np.where(derived_race == "Black or African American", -0.85,
                 np.where(derived_race == "Hispanic or Latino", -0.55,
                 np.where(derived_race == "2 or more minority races", -0.65,
                 np.where(derived_race == "American Indian or Alaska Native", -0.90, 0.2))))
    
    age_effect = np.where(applicant_age == "<25", -0.80,
                 np.where(applicant_age == ">74", -0.60, 0.1))

    state_effect = np.where(state_code == "MS", -0.90,
                   np.where(state_code == "AK", -0.50, 0.1))

    prob_true = 1 / (1 + np.exp(-(logit + race_effect + age_effect + state_effect)))
    target = (prob_true >= 0.45).astype(int)

    df = pd.DataFrame({
        "Applicant_ID": [f"HMDA{i:06d}" for i in range(n)],
        "state_code": state_code,
        "derived_ethnicity": derived_ethnicity,
        "derived_race": derived_race,
        "derived_sex": derived_sex,
        "applicant_age": applicant_age,
        "derived_dwelling_category": derived_dwelling_category,
        "loan_purpose": loan_purpose,
        "conforming_loan_limit": conforming_loan_limit,
        "occupancy_type": occupancy_type,
        "loan_amount": loan_amount,
        "loan_to_value_ratio": loan_to_value_ratio,
        "loan_term": loan_term,
        "property_value": property_value,
        "income": income,
        "debt_to_income_ratio": debt_to_income_ratio,
        "target": target
    })

    # Baseline XGBoost Model using purely financial/model features
    model_features = [
        "derived_dwelling_category", "loan_purpose", "conforming_loan_limit",
        "occupancy_type", "loan_amount", "loan_to_value_ratio", "loan_term",
        "property_value", "income", "debt_to_income_ratio"
    ]

    cat_cols = ["derived_dwelling_category", "loan_purpose", "conforming_loan_limit", "occupancy_type"]
    num_cols = ["loan_amount", "loan_to_value_ratio", "loan_term", "property_value", "income", "debt_to_income_ratio"]

    preprocessor = ColumnTransformer(
        transformers=[
            ("cat", OneHotEncoder(handle_unknown="ignore"), cat_cols),
            ("num", StandardScaler(), num_cols)
        ]
    )

    X = df[model_features]
    y = df["target"]

    X_train, X_test, y_train, y_test, idx_train, idx_test = train_test_split(
        X, y, df.index, test_size=0.3, random_state=42, stratify=y
    )

    xgb_model = Pipeline([
        ("preprocessor", preprocessor),
        ("model", XGBClassifier(
            n_estimators=100, max_depth=4, learning_rate=0.08,
            objective="binary:logistic", random_state=42, n_jobs=-1
        ))
    ])

    xgb_model.fit(X_train, y_train)

    prob_baseline = xgb_model.predict_proba(X)[:, 1]
    pred_baseline = (prob_baseline >= 0.48).astype(int)

    # Exponentiated Gradient Race-Mitigated Predictions
    race_train = df.loc[idx_train, "derived_race"].astype(str)
    
    expgrad_race = ExponentiatedGradient(
        estimator=clone(xgb_model),
        constraints=DemographicParity(),
        eps=0.02,
        max_iter=15,
        sample_weight_name="model__sample_weight"
    )

    expgrad_race.fit(X_train, y_train, sensitive_features=race_train)
    pred_mitigated = expgrad_race.predict(X)

    # Generate probabilities for mitigated model
    prob_mitigated = np.where(pred_mitigated == 1, 
                              np.minimum(prob_baseline + 0.15, 0.96), 
                              np.maximum(prob_baseline - 0.15, 0.04))

    df["pred_baseline"] = pred_baseline
    df["prob_baseline"] = np.round(prob_baseline, 4)
    df["pred_mitigated"] = pred_mitigated
    df["prob_mitigated"] = np.round(prob_mitigated, 4)

    out_dir = os.path.join(os.path.dirname(__file__), "data")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "hmda_benchmark.csv")
    df.to_csv(out_path, index=False)
    print(f"Generated HMDA Benchmark Dataset successfully: {out_path} ({df.shape[0]} rows, {df.shape[1]} columns)")
    return df

if __name__ == "__main__":
    generate_hmda_dataset()
