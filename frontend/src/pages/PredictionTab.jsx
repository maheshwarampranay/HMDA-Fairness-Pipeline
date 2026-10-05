import React, { useState } from 'react';
import styles from './PredictionTab.module.css';
import { Target, CheckSquare, PlusCircle, ShieldAlert } from 'lucide-react';
import TestDataValidation from '../components/Prediction/TestDataValidation';
import NewPredictionMode from '../components/Prediction/NewPredictionMode';

export default function PredictionTab({ isDefaultHmda = true, onResetToDefault }) {
  const [mode, setMode] = useState('test'); // 'test' | 'new'

  if (!isDefaultHmda) {
    return (
      <div className={styles.container}>
        <div className={styles.card} style={{ padding: '48px 32px', textAlign: 'center', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'inline-flex', padding: '16px', background: '#f1f5f9', borderRadius: '50%', marginBottom: '16px' }}>
            <ShieldAlert size={36} color="#64748b" />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 8px 0' }}>
            Prediction Audit Unavailable for Custom Uploaded Dataset
          </h3>
          <p style={{ fontSize: '13px', color: '#475569', maxWidth: '580px', margin: '0 auto 24px auto', lineHeight: '1.6' }}>
            The Prediction & Human Validation Audit module is trained and configured specifically for the benchmark <strong>HMDA Baseline XGBoost</strong> and <strong>Race Demographic-Parity ThresholdOptimizer</strong> model suite.
            <br /><br />
            Custom uploaded datasets perform statistical bias auditing across protected attributes in the <strong>Fairness Metrics</strong> and <strong>Report</strong> tabs.
          </p>
          {onResetToDefault && (
            <button
              className={styles.btnPrimary}
              onClick={onResetToDefault}
            >
              Switch to Default HMDA Model Suite
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <div>
            <h2 className={styles.title}>
              <Target size={24} color="#005A36" />
              Prediction & Human Validation Audit
            </h2>
            <p className={styles.subtitle}>
              Validate test dataset decision discrepancies between Baseline XGBoost and Race Demographic-Parity ThresholdOptimizer, or evaluate new credit applications.
            </p>
          </div>
        </div>

        {/* Sub-Tab / Mode Toggle */}
        <div className={styles.modeToggle}>
          <button
            className={`${styles.modeBtn} ${mode === 'test' ? styles.modeBtnActive : ''}`}
            onClick={() => setMode('test')}
          >
            <CheckSquare size={16} />
            Test Data Validation
          </button>
          <button
            className={`${styles.modeBtn} ${mode === 'new' ? styles.modeBtnActive : ''}`}
            onClick={() => setMode('new')}
          >
            <PlusCircle size={16} />
            New Prediction
          </button>
        </div>
      </div>

      {/* Render selected mode */}
      {mode === 'test' ? <TestDataValidation /> : <NewPredictionMode />}
    </div>
  );
}

