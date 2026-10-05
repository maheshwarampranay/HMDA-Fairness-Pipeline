import React, { useState } from 'react';
import styles from '../../pages/PredictionTab.module.css';
import { AlertTriangle, CheckCircle, ShieldAlert, FileText, Send } from 'lucide-react';
import { submitHumanValidation } from '../../api/client';

export default function HumanReviewSection({
  recordId,
  baselinePred,
  raceThresholdPred,
  onValidationSubmitted,
  isNewPrediction = false,
  existingValidation = null
}) {
  const [decision, setDecision] = useState(existingValidation?.human_decision || 'Approve');
  const [reason, setReason] = useState(existingValidation?.human_reason || '');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [submitted, setSubmitted] = useState(!!existingValidation);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setErrorMsg('Validation reason is mandatory before submitting.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg('');
      const payload = {
        record_id: recordId || `NEW-${Date.now()}`,
        baseline_prediction: baselinePred,
        race_threshold_prediction: raceThresholdPred,
        human_decision: decision,
        human_reason: reason.trim(),
        is_new_prediction: isNewPrediction
      };
      
      const res = await submitHumanValidation(payload);
      setSubmitted(true);
      if (onValidationSubmitted) {
        onValidationSubmitted(res);
      }
    } catch (err) {
      console.error('Failed to submit validation:', err);
      setErrorMsg('Failed to record human validation decision. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.card} style={{ border: '2px solid #f59e0b', background: '#fffbeb' }}>
      <div className={styles.cardHeader}>
        <h3 className={styles.cardTitle} style={{ color: '#b45309', fontSize: '18px' }}>
          <AlertTriangle size={22} color="#d97706" />
          HUMAN REVIEW REQUIRED
        </h3>
        <span className={styles.badgeReview}>DISCREPANCY AUDIT</span>
      </div>

      <p style={{ fontSize: '13px', color: '#475569', marginTop: '-8px', marginBottom: '16px' }}>
        The Baseline XGBoost model and Race Demographic-Parity ThresholdOptimizer produced opposing credit decisions for this applicant. A human credit officer must review model explanations and submit a final validated decision with documented rationale.
      </p>

      {/* Model Decisions Side-by-Side */}
      <div className={styles.decisionsRow}>
        <div className={styles.decisionBox} style={{ background: '#ffffff' }}>
          <div className={styles.decisionModelName}>Baseline XGBoost Decision</div>
          <div className={styles.decisionStatus} style={{ color: baselinePred === 'APPROVED' ? '#16a34a' : '#dc2626' }}>
            {baselinePred}
          </div>
        </div>

        <div className={styles.decisionBox} style={{ background: '#ffffff' }}>
          <div className={styles.decisionModelName}>Race ThresholdOptimizer Decision</div>
          <div className={styles.decisionStatus} style={{ color: raceThresholdPred === 'APPROVED' ? '#16a34a' : '#dc2626' }}>
            {raceThresholdPred}
          </div>
        </div>
      </div>

      {submitted ? (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '16px 20px', marginTop: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#15803d', fontWeight: '800', fontSize: '15px' }}>
            <CheckCircle size={20} />
            Human Validation Decision Submitted
          </div>
          <div style={{ fontSize: '13px', color: '#334155', marginTop: '8px' }}>
            <strong>Final Decision:</strong> <span style={{ fontWeight: 700, color: decision === 'Approve' ? '#16a34a' : decision === 'Deny' ? '#dc2626' : '#d97706' }}>{decision}</span>
          </div>
          <div style={{ fontSize: '13px', color: '#334155', marginTop: '4px' }}>
            <strong>Validation Reason:</strong> {reason}
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ marginTop: '16px', background: '#ffffff', padding: '20px', borderRadius: '10px', border: '1px solid #fde68a' }}>
          <div className={styles.field} style={{ marginBottom: '16px' }}>
            <label className={styles.label}>Final Human Decision *</label>
            <div className={styles.radioGroup}>
              <label className={styles.radioOption}>
                <input
                  type="radio"
                  name="humanDecision"
                  value="Approve"
                  checked={decision === 'Approve'}
                  onChange={(e) => setDecision(e.target.value)}
                />
                Approve Loan
              </label>
              <label className={styles.radioOption}>
                <input
                  type="radio"
                  name="humanDecision"
                  value="Deny"
                  checked={decision === 'Deny'}
                  onChange={(e) => setDecision(e.target.value)}
                />
                Deny Loan
              </label>
              <label className={styles.radioOption}>
                <input
                  type="radio"
                  name="humanDecision"
                  value="Refer for Further Investigation"
                  checked={decision === 'Refer for Further Investigation'}
                  onChange={(e) => setDecision(e.target.value)}
                />
                Refer for Further Investigation
              </label>
            </div>
          </div>

          <div className={styles.field} style={{ marginBottom: '16px' }}>
            <label className={styles.label}>Validation Reason (Mandatory rationale for audit log) *</label>
            <textarea
              className={styles.textarea}
              rows={3}
              placeholder="Provide specific credit underwriting justification for resolving model decision discrepancy..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </div>

          {errorMsg && (
            <div style={{ color: '#dc2626', fontSize: '12px', fontWeight: 600, marginBottom: '12px' }}>
              ⚠️ {errorMsg}
            </div>
          )}

          <button
            type="submit"
            className={styles.btnPrimary}
            disabled={submitting}
          >
            <Send size={15} />
            {submitting ? 'Submitting Validation...' : 'Submit Validation'}
          </button>
        </form>
      )}
    </div>
  );
}
