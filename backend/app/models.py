from typing import Dict, List, Any, Optional
from pydantic import BaseModel, Field

class FileUploadResponse(BaseModel):
    file_id: str
    filename: str
    num_rows: int
    num_cols: int
    columns: List[str]
    sample_data: List[Dict[str, Any]]
    suggested_target: Optional[str] = None
    suggested_pred: Optional[str] = None
    suggested_prob: Optional[str] = None
    suggested_protected: List[str] = []

class AnalysisRequest(BaseModel):
    file_id: str
    model_name: str = "Credit Risk Decision Model"
    target_col: str
    pred_col: str
    prob_col: Optional[str] = None
    protected_cols: List[str]
    reference_groups: Dict[str, str] = Field(default_factory=dict)
    risk_tier: str = "moderate" # strict, moderate, lenient
    custom_thresholds: Optional[Dict[str, float]] = None

class MetricSummary(BaseModel):
    accuracy: float
    precision: float
    recall: float
    f1_score: float
    roc_auc: float
    specificity: float
    tpr: float
    fpr: float
    fnr: float
    total_count: int
    positive_pred_count: int
    positive_true_count: int
    confusion_matrix: Dict[str, int]

class SingleGroupMetric(BaseModel):
    group_name: str
    attribute: str
    count: int
    selection_rate: float
    approval_count: int
    accuracy: float
    precision: float
    recall: float
    tpr: float
    fpr: float
    disparate_impact_ratio: float
    demographic_parity_diff: float
    equalized_odds_diff: float
    is_reference: bool
    status: str # PASS, FLAG, HIGH BIAS

class ProtectedAttributeAudit(BaseModel):
    attribute: str
    reference_group: str
    disparate_impact_ratio: float
    demographic_parity_diff: float
    equal_opportunity_diff: float
    equalized_odds_diff: float
    predictive_parity_diff: float
    groups: List[SingleGroupMetric]
    status: str # PASS, FLAG, HIGH BIAS
    message: str

class SubgroupMetric(BaseModel):
    subgroup_id: str
    label: str
    combination_type: str # single_attribute, combined_attributes
    count: int
    percentage: float
    selection_rate: float
    approval_count: int
    accuracy: float
    tpr: float
    fpr: float
    disparity_ratio: float
    status: str # PASS, FLAG, HIGH BIAS

class TradeoffPoint(BaseModel):
    threshold: float
    accuracy: float
    precision: float
    recall: float
    f1_score: float
    selection_rate: float
    disparate_impact_ratio: float
    demographic_parity_diff: float
    equalized_odds_diff: float
    fairness_score: float

class AnalysisResponse(BaseModel):
    analysis_id: str
    model_name: str
    risk_tier: str
    total_samples: int
    performance: MetricSummary
    protected_audits: List[ProtectedAttributeAudit]
    overall_fairness_score: float
    overall_status: str # PASS, FLAG, HIGH BIAS
    subgroup_analysis: List[SubgroupMetric]
    tradeoff_analysis: List[TradeoffPoint]
    optimal_threshold: float

class NewPredictionRequest(BaseModel):
    derived_dwelling_category: str = "Single Family (1-4 Units)"
    loan_purpose: str = "Home Purchase"
    conforming_loan_limit: str = "C"
    occupancy_type: str = "Principal residence"
    loan_amount: float = 300000.0
    loan_to_value_ratio: float = 80.0
    loan_term: float = 360.0
    property_value: float = 375000.0
    income: float = 95000.0
    debt_to_income_ratio: float = 32.0
    derived_race: Optional[str] = "White"
    derived_ethnicity: Optional[str] = "Not Hispanic or Latino"
    derived_sex: Optional[str] = "Male"
    applicant_age: Optional[str] = "35-44"

class HumanValidationRequest(BaseModel):
    record_id: str
    baseline_prediction: str
    race_threshold_prediction: str
    human_decision: str # Approve, Deny, Refer for Further Investigation
    human_reason: str
    is_new_prediction: bool = False

