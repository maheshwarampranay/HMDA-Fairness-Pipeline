import React, { useState, useEffect } from 'react';
import styles from '../../pages/PredictionTab.module.css';
import {
  ListChecks,
  AlertTriangle,
  CheckCircle2,
  Lock,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Search,
  Eye
} from 'lucide-react';
import { fetchTestSummary, fetchTestQueue, fetchTestRecordDetail } from '../../api/client';
import ShapExplanations from './ShapExplanations';
import HumanReviewSection from './HumanReviewSection';

export default function TestDataValidation() {
  const [summary, setSummary] = useState(null);
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRecordId, setSelectedRecordId] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [loadingRecord, setLoadingRecord] = useState(false);
  const [recordError, setRecordError] = useState(null);
  const [showFairnessAudit, setShowFairnessAudit] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [sumData, queueData] = await Promise.all([
        fetchTestSummary(),
        fetchTestQueue('discrepancies')
      ]);
      setSummary(sumData);
      const safeQueue = Array.isArray(queueData) ? queueData : [];
      setQueue(safeQueue);

      if (safeQueue.length > 0) {
        handleSelectRecord(safeQueue[0].record_id);
      }
    } catch (err) {
      console.error('Failed to load test data validation queue:', err);
      setError('Unable to load review queue records from backend server.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRecord = async (recordId) => {
    try {
      setSelectedRecordId(recordId);
      setLoadingRecord(true);
      setRecordError(null);
      const detail = await fetchTestRecordDetail(recordId);
      setSelectedRecord(detail);
    } catch (err) {
      console.error(`Failed to load record ${recordId}:`, err);
      setRecordError(`Failed to load details for record ${recordId}.`);
    } finally {
      setLoadingRecord(false);
    }
  };

  const handleValidationSubmitted = () => {
    // Refresh queue & summary to update resolved status
    loadData();
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
        <div style={{
          width: 36,
          height: 36,
          border: '3px solid #e2e8f0',
          borderTop: '3px solid #005A36',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 12px auto'
        }} />
        <p style={{ fontWeight: 600 }}>Loading Test Data Validation Queue & Model Predictions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.card} style={{ padding: '40px', textAlign: 'center' }}>
        <AlertTriangle size={36} color="#dc2626" style={{ margin: '0 auto 12px auto' }} />
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#991b1b', margin: '0 0 8px 0' }}>
          Unable to Load Test Data Validation Queue
        </h3>
        <p style={{ color: '#475569', fontSize: '13px', margin: '0 0 20px 0' }}>
          {error}
        </p>
        <button className={styles.btnPrimary} onClick={() => loadData()}>
          Retry Loading Queue
        </button>
      </div>
    );
  }

  const { total_records = 20000, agreements = 19468, discrepancies = 532, discrepancy_rate = 0.0266, resolved_count = 0 } = summary || {};

  return (
    <div>
      {/* Top Metrics Cards */}
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Total Test Records</div>
          <div className={styles.metricValue}>{total_records.toLocaleString()}</div>
          <div className={styles.metricSubtext}>Held-Out Test Dataset</div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Model Agreements</div>
          <div className={styles.metricValue} style={{ color: '#16a34a' }}>
            {agreements.toLocaleString()}
          </div>
          <div className={styles.metricSubtext}>{((agreements / total_records) * 100).toFixed(1)}% Agreement Rate</div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Decision Discrepancies</div>
          <div className={styles.metricValue} style={{ color: '#d97706' }}>
            {discrepancies.toLocaleString()}
          </div>
          <div className={styles.metricSubtext}>Baseline != Race TO</div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Discrepancy Rate</div>
          <div className={styles.metricValue} style={{ color: '#005A36' }}>
            {(discrepancy_rate * 100).toFixed(2)}%
          </div>
          <div className={styles.metricSubtext}>{resolved_count} Validations Recorded</div>
        </div>
      </div>

      {/* Review Queue Table */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>
            <ListChecks size={18} color="#005A36" />
            Decision Discrepancy Review Queue ({queue.length} Records)
          </h3>
          <span className={styles.badgeReview}>HUMAN AUDIT REQUIRED</span>
        </div>

        <div className={styles.tableWrapper} style={{ maxHeight: '260px', overflowY: 'auto' }}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Record ID</th>
                <th>Baseline XGBoost</th>
                <th>Race ThresholdOptimizer</th>
                <th>Discrepancy Type</th>
                <th>Audit Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {queue.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                    <p style={{ margin: '0 0 12px 0', fontWeight: 600 }}>No decision discrepancy records loaded.</p>
                    <button className={styles.btnSecondary} onClick={() => loadData()}>
                      Refresh Review Queue
                    </button>
                  </td>
                </tr>
              ) : (
                queue.map((row) => {
                  const isSelected = row.record_id === selectedRecordId;
                  const isApproveVsDeny = row.baseline_prediction === 'APPROVED';
                  return (
                    <tr
                      key={row.record_id}
                      className={`${styles.tableTrHover} ${isSelected ? styles.tableTrSelected : ''}`}
                      onClick={() => handleSelectRecord(row.record_id)}
                    >
                      <td style={{ fontWeight: 700, color: '#0f172a' }}>{row.record_id}</td>
                      <td>
                        <span className={row.baseline_prediction === 'APPROVED' ? styles.badgeApproved : styles.badgeDenied}>
                          {row.baseline_prediction}
                        </span>
                      </td>
                      <td>
                        <span className={row.race_threshold_prediction === 'APPROVED' ? styles.badgeApproved : styles.badgeDenied}>
                          {row.race_threshold_prediction}
                        </span>
                      </td>
                      <td style={{ fontSize: '12px', color: '#475569' }}>
                        {isApproveVsDeny ? 'Baseline Approve → TO Deny' : 'Baseline Deny → TO Approve'}
                      </td>
                      <td>
                        <span className={row.status === 'RESOLVED' ? styles.badgeResolved : styles.badgeReview}>
                          {row.status}
                        </span>
                      </td>
                      <td>
                        <button
                          className={styles.btnSecondary}
                          style={{ padding: '4px 10px', fontSize: '11px' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectRecord(row.record_id);
                          }}
                        >
                          <Eye size={12} style={{ marginRight: '4px' }} />
                          Review Record
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Test Record Detailed View */}
      {loadingRecord ? (
        <div className={styles.card} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
          <p>Loading details for record {selectedRecordId}...</p>
        </div>
      ) : recordError ? (
        <div className={styles.card} style={{ padding: '24px', textAlign: 'center', color: '#dc2626' }}>
          <p style={{ margin: '0 0 12px 0', fontWeight: 600 }}>{recordError}</p>
          {selectedRecordId && (
            <button className={styles.btnSecondary} onClick={() => handleSelectRecord(selectedRecordId)}>
              Retry Loading Record
            </button>
          )}
        </div>
      ) : selectedRecord ? (
        <div>
          {/* Decisions Banner */}
          {selectedRecord.discrepancy ? (
            <div className={styles.discrepancyBanner}>
              <AlertTriangle size={24} color="#d97706" />
              <div>
                <h4 className={styles.bannerTitle} style={{ color: '#b45309' }}>
                  ⚠️ DECISION DISCREPANCY DETECTED
                </h4>
                <div className={styles.bannerDesc}>
                  Baseline XGBoost: <strong>{selectedRecord.baseline_prediction}</strong> | Race ThresholdOptimizer: <strong>{selectedRecord.race_threshold_prediction}</strong>. Human credit audit review is required.
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.agreementBanner}>
              <CheckCircle2 size={24} color="#16a34a" />
              <div>
                <h4 className={styles.bannerTitle} style={{ color: '#15803d' }}>
                  ✓ MODELS AGREE
                </h4>
                <div className={styles.bannerDesc}>
                  Both baseline and mitigated models predict: <strong>{selectedRecord.baseline_prediction}</strong>.
                </div>
              </div>
            </div>
          )}

          {/* Applicant Information Section (Two-Column Layout) */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>
                <UserCheck size={18} color="#005A36" />
                Applicant Credit Profile (Record {selectedRecord.record_id})
              </h3>
            </div>

            <div className={styles.gridTwo}>
              {/* Categorical Features */}
              <div>
                <div className={styles.featureGroupTitle}>Categorical Model Features</div>
                {Object.entries(selectedRecord.applicant_info.categorical).map(([k, v]) => (
                  <div key={k} className={styles.featureItem}>
                    <span className={styles.featureName}>{k.replace(/_/g, ' ').toUpperCase()}</span>
                    <span className={styles.featureVal}>{v}</span>
                  </div>
                ))}
              </div>

              {/* Numerical Features */}
              <div>
                <div className={styles.featureGroupTitle}>Numerical Financial Features</div>
                {Object.entries(selectedRecord.applicant_info.numerical).map(([k, v]) => {
                  let formattedVal = v;
                  if (k === 'loan_amount' || k === 'property_value' || k === 'income') {
                    formattedVal = `$${v.toLocaleString()}`;
                  } else if (k === 'debt_to_income_ratio' || k === 'loan_to_value_ratio') {
                    formattedVal = `${v}%`;
                  } else if (k === 'loan_term') {
                    formattedVal = `${v} months`;
                  }
                  return (
                    <div key={k} className={styles.featureItem}>
                      <span className={styles.featureName}>{k.replace(/_/g, ' ').toUpperCase()}</span>
                      <span className={styles.featureVal}>{formattedVal}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Model Decisions Side by Side */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>Model Decisions Comparison</h3>
            </div>
            <div className={styles.decisionsRow}>
              <div className={styles.decisionBoxBaseline}>
                <div className={styles.decisionModelName}>Baseline XGBoost</div>
                <div className={styles.decisionStatus} style={{ color: selectedRecord.baseline_prediction === 'APPROVED' ? '#16a34a' : '#dc2626' }}>
                  {selectedRecord.baseline_prediction}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                  Probability: {(selectedRecord.baseline_prob * 100).toFixed(1)}%
                </div>
              </div>

              <div className={styles.decisionBoxMitigated}>
                <div className={styles.decisionModelName}>Race ThresholdOptimizer — Demographic Parity</div>
                <div className={styles.decisionStatus} style={{ color: selectedRecord.race_threshold_prediction === 'APPROVED' ? '#16a34a' : '#dc2626' }}>
                  {selectedRecord.race_threshold_prediction}
                </div>
                <div style={{ fontSize: '11px', color: '#166534', marginTop: '4px' }}>
                  Group-Aware Threshold Post-Processing
                </div>
              </div>
            </div>
          </div>

          {/* SHAP Explanations for Baseline & Mitigated Models */}
          <ShapExplanations explanations={selectedRecord.explanations} />

          {/* Collapsible Fairness Audit Section */}
          <div className={styles.accordion} style={{ marginTop: '16px' }}>
            <button
              className={styles.accordionHeader}
              onClick={() => setShowFairnessAudit(!showFairnessAudit)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Lock size={16} color="#005A36" />
                <span>Fairness / Protected Attributes (Compliance & Audit Inspection Only)</span>
              </div>
              {showFairnessAudit ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showFairnessAudit && (
              <div className={styles.accordionContent}>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px', fontStyle: 'italic' }}>
                  🔒 Governance Note: Protected attributes are excluded from baseline model inference features and are audited strictly for demographic parity compliance.
                </div>
                <div className={styles.gridTwo}>
                  {Object.entries(selectedRecord.protected_info).map(([k, v]) => (
                    <div key={k} className={styles.featureItem} style={{ background: '#f1f5f9' }}>
                      <span className={styles.featureName}>{k.replace(/_/g, ' ').toUpperCase()}</span>
                      <span className={styles.featureVal} style={{ color: '#005A36' }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Human Review Section (Shown when models disagree) */}
          {selectedRecord.discrepancy && (
            <HumanReviewSection
              recordId={selectedRecord.record_id}
              baselinePred={selectedRecord.baseline_prediction}
              raceThresholdPred={selectedRecord.race_threshold_prediction}
              existingValidation={selectedRecord.existing_validation}
              onValidationSubmitted={handleValidationSubmitted}
            />
          )}
        </div>
      ) : null}
    </div>
  );
}
