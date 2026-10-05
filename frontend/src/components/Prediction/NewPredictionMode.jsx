import React, { useState } from 'react';
import styles from '../../pages/PredictionTab.module.css';
import { Play, CheckCircle2, AlertTriangle, UserCheck, ShieldCheck } from 'lucide-react';
import { predictNewApplicant } from '../../api/client';
import ShapExplanations from './ShapExplanations';
import HumanReviewSection from './HumanReviewSection';

export default function NewPredictionMode() {
  const [formData, setFormData] = useState({
    derived_dwelling_category: 'Single Family (1-4 Units)',
    loan_purpose: 'Home Purchase',
    conforming_loan_limit: 'C',
    occupancy_type: 'Principal residence',
    loan_amount: 300000,
    loan_to_value_ratio: 80.0,
    loan_term: 360,
    property_value: 375000,
    income: 95000,
    debt_to_income_ratio: 32.0,
    derived_race: 'White',
    derived_ethnicity: 'Not Hispanic or Latino',
    derived_sex: 'Male',
    applicant_age: '35-44'
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleChange = (field, val) => {
    setFormData(prev => ({ ...prev, [field]: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      const res = await predictNewApplicant(formData);
      setResult(res);
    } catch (err) {
      console.error('Failed to execute new prediction:', err);
      const detail = err.response?.data?.detail || err.message || 'Failed to compute model predictions.';
      setError(`Server Error: ${detail}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Input Form Card */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>
            <UserCheck size={18} color="#005A36" />
            Credit Applicant Input Form
          </h3>
          <span className={styles.badgeApproved}>INTERACTIVE PREDICTION</span>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Categorical Features */}
          <div className={styles.featureGroupTitle}>Categorical Loan & Property Attributes</div>
          <div className={styles.formGrid} style={{ marginBottom: '20px' }}>
            <div className={styles.field}>
              <label className={styles.label}>Derived Dwelling Category</label>
              <select
                className={styles.select}
                value={formData.derived_dwelling_category}
                onChange={(e) => handleChange('derived_dwelling_category', e.target.value)}
              >
                <option value="Single Family (1-4 Units)">Single Family (1-4 Units)</option>
                <option value="Multifamily">Multifamily</option>
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Loan Purpose</label>
              <select
                className={styles.select}
                value={formData.loan_purpose}
                onChange={(e) => handleChange('loan_purpose', e.target.value)}
              >
                <option value="Home Purchase">Home Purchase</option>
                <option value="Refinancing">Refinancing</option>
                <option value="Home Improvement">Home Improvement</option>
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Conforming Loan Limit</label>
              <select
                className={styles.select}
                value={formData.conforming_loan_limit}
                onChange={(e) => handleChange('conforming_loan_limit', e.target.value)}
              >
                <option value="C">C (Conforming)</option>
                <option value="NC">NC (Non-Conforming)</option>
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Occupancy Type</label>
              <select
                className={styles.select}
                value={formData.occupancy_type}
                onChange={(e) => handleChange('occupancy_type', e.target.value)}
              >
                <option value="Principal residence">Principal residence</option>
                <option value="Investment property">Investment property</option>
                <option value="Second residence">Second residence</option>
              </select>
            </div>
          </div>

          {/* Numerical Features */}
          <div className={styles.featureGroupTitle}>Numerical Financial Metrics</div>
          <div className={styles.formGrid} style={{ marginBottom: '20px' }}>
            <div className={styles.field}>
              <label className={styles.label}>Loan Amount ($)</label>
              <input
                type="number"
                min="1000"
                step="1000"
                className={styles.input}
                value={formData.loan_amount}
                onChange={(e) => handleChange('loan_amount', Math.max(0, parseFloat(e.target.value) || 0))}
                required
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Loan-to-Value Ratio (%)</label>
              <input
                type="number"
                min="0"
                max="200"
                step="0.1"
                className={styles.input}
                value={formData.loan_to_value_ratio}
                onChange={(e) => handleChange('loan_to_value_ratio', Math.max(0, parseFloat(e.target.value) || 0))}
                required
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Loan Term (Months)</label>
              <input
                type="number"
                min="12"
                max="480"
                className={styles.input}
                value={formData.loan_term}
                onChange={(e) => handleChange('loan_term', Math.max(0, parseInt(e.target.value) || 0))}
                required
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Property Value ($)</label>
              <input
                type="number"
                min="1000"
                step="1000"
                className={styles.input}
                value={formData.property_value}
                onChange={(e) => handleChange('property_value', Math.max(0, parseFloat(e.target.value) || 0))}
                required
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Applicant Income ($)</label>
              <input
                type="number"
                min="0"
                step="1000"
                className={styles.input}
                value={formData.income}
                onChange={(e) => handleChange('income', Math.max(0, parseFloat(e.target.value) || 0))}
                required
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Debt-to-Income Ratio (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                className={styles.input}
                value={formData.debt_to_income_ratio}
                onChange={(e) => handleChange('debt_to_income_ratio', Math.max(0, parseFloat(e.target.value) || 0))}
                required
              />
            </div>
          </div>

          {/* Protected Attributes (Audit & Threshold Context) */}
          <div className={styles.featureGroupTitle}>Protected Attributes (For Threshold Optimization Audit)</div>
          <div className={styles.formGrid} style={{ marginBottom: '24px' }}>
            <div className={styles.field}>
              <label className={styles.label}>Derived Race</label>
              <select
                className={styles.select}
                value={formData.derived_race}
                onChange={(e) => handleChange('derived_race', e.target.value)}
              >
                <option value="White">White (Reference Group)</option>
                <option value="Black or African American">Black or African American</option>
                <option value="Asian">Asian</option>
                <option value="American Indian or Alaska Native">American Indian or Alaska Native</option>
                <option value="Native Hawaiian or Other Pacific Islander">Native Hawaiian or Other Pacific Islander</option>
                <option value="2 or more minority races">2 or more minority races</option>
                <option value="Race Not Available">Race Not Available</option>
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Applicant Age</label>
              <select
                className={styles.select}
                value={formData.applicant_age}
                onChange={(e) => handleChange('applicant_age', e.target.value)}
              >
                <option value="35-44">35-44 (Reference Group)</option>
                <option value="25-34">25-34</option>
                <option value="45-54">45-54</option>
                <option value="55-64">55-64</option>
                <option value="65-74">65-74</option>
                <option value="<25">&lt;25</option>
                <option value=">74">&gt;74</option>
              </select>
            </div>
          </div>

          {error && (
            <div style={{ color: '#dc2626', fontSize: '13px', fontWeight: 600, marginBottom: '16px' }}>
              ⚠️ {error}
            </div>
          )}

          <button type="submit" className={styles.btnPrimary} disabled={loading}>
            <Play size={16} />
            {loading ? 'Evaluating Credit Models...' : 'Predict'}
          </button>
        </form>
      </div>

      {/* Prediction Results */}
      {result && (
        <div>
          {/* Status Banner */}
          {result.discrepancy ? (
            <div className={styles.discrepancyBanner}>
              <AlertTriangle size={26} color="#d97706" />
              <div>
                <h4 className={styles.bannerTitle} style={{ color: '#b45309', fontSize: '15px' }}>
                  ⚠️ DECISION DISCREPANCY
                </h4>
                <div className={styles.bannerDesc}>
                  Baseline XGBoost: <strong>{result.baseline_prediction}</strong> | Race ThresholdOptimizer: <strong>{result.race_threshold_prediction}</strong>. Human review is required.
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.agreementBanner}>
              <CheckCircle2 size={26} color="#16a34a" />
              <div>
                <h4 className={styles.bannerTitle} style={{ color: '#15803d', fontSize: '15px' }}>
                  ✓ MODELS AGREE
                </h4>
                <div className={styles.bannerDesc}>
                  Both models predict: <strong>{result.baseline_prediction}</strong>
                </div>
              </div>
            </div>
          )}

          {/* Model Decisions Side-by-Side */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>
                <ShieldCheck size={18} color="#005A36" />
                Model Credit Decisions
              </h3>
            </div>

            <div className={styles.decisionsRow}>
              <div className={styles.decisionBoxBaseline}>
                <div className={styles.decisionModelName}>Baseline XGBoost</div>
                <div className={styles.decisionStatus} style={{ color: result.baseline_prediction === 'APPROVED' ? '#16a34a' : '#dc2626' }}>
                  {result.baseline_prediction}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                  Probability: {(result.baseline_prob * 100).toFixed(1)}%
                </div>
              </div>

              <div className={styles.decisionBoxMitigated}>
                <div className={styles.decisionModelName}>Race ThresholdOptimizer — Demographic Parity</div>
                <div className={styles.decisionStatus} style={{ color: result.race_threshold_prediction === 'APPROVED' ? '#16a34a' : '#dc2626' }}>
                  {result.race_threshold_prediction}
                </div>
                <div style={{ fontSize: '12px', color: '#166534', marginTop: '4px' }}>
                  Group-Aware Threshold Post-Processing
                </div>
              </div>
            </div>
          </div>

          {/* SHAP Explanations for Baseline & Mitigated Models */}
          <ShapExplanations explanations={result.explanations} />

          {/* Human Review Section (Shown automatically when models disagree) */}
          {result.discrepancy && (
            <HumanReviewSection
              recordId={`NEW-${Date.now()}`}
              baselinePred={result.baseline_prediction}
              raceThresholdPred={result.race_threshold_prediction}
              isNewPrediction={true}
            />
          )}
        </div>
      )}
    </div>
  );
}
