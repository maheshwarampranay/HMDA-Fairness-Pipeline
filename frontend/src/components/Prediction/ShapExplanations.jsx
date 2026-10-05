import React from 'react';
import styles from '../../pages/PredictionTab.module.css';
import { BarChart2, ShieldCheck } from 'lucide-react';

export default function ShapExplanations({ explanations }) {
  if (!explanations) return null;

  const { baseline_shap, mitigated_shap } = explanations;

  const renderShapBlock = (shapData, isMitigated = false) => {
    if (!shapData) return null;
    const { model_name, decision, sensitive_group, top_features = [], threshold_note } = shapData;
    const maxAbsContrib = Math.max(...top_features.map(f => Math.abs(f.contribution)), 0.1);

    return (
      <div className={styles.card} style={{ marginBottom: '20px' }}>
        <div className={styles.cardHeader}>
          <h4 className={styles.cardTitle}>
            {isMitigated ? (
              <ShieldCheck size={18} color="#005A36" />
            ) : (
              <BarChart2 size={18} color="#005A36" />
            )}
            {model_name} — SHAP Feature Impact
          </h4>
          <span className={decision === 'APPROVED' ? styles.badgeApproved : styles.badgeDenied}>
            {decision}
          </span>
        </div>

        <p style={{ fontSize: '13px', color: '#475569', marginTop: '-8px', marginBottom: '14px' }}>
          {isMitigated ? (
            <span>Why did <strong>Race ThresholdOptimizer</strong> make this decision? Explaining feature contributions under Demographic Parity constraints for group <strong>"{sensitive_group}"</strong>.</span>
          ) : (
            <span>Why did <strong>Baseline XGBoost</strong> make this decision? Explaining feature contributions towards credit approval (+) or denial (-).</span>
          )}
        </p>

        {threshold_note && (
          <div style={{ fontSize: '12px', color: '#166534', background: '#f0fdf4', padding: '8px 12px', borderRadius: '6px', marginBottom: '14px', border: '1px solid #bbf7d0' }}>
            💡 {threshold_note}
          </div>
        )}

        {/* Visual SHAP Bars */}
        <div style={{ marginBottom: '16px', padding: '16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '12px' }}>
            Feature Impact Breakdown ({model_name})
          </div>
          {top_features.slice(0, 6).map((item, idx) => {
            const isPos = item.contribution >= 0;
            const pct = Math.min((Math.abs(item.contribution) / maxAbsContrib) * 100, 100);
            return (
              <div key={idx} className={styles.shapBarRow}>
                <div className={styles.shapBarLabel} title={`${item.feature}: ${item.raw_value}`}>
                  {item.feature} ({item.raw_value})
                </div>
                <div className={styles.shapBarTrack}>
                  <div
                    className={styles.shapBarFill}
                    style={{
                      width: `${pct}%`,
                      background: isPos ? '#16a34a' : '#dc2626',
                      marginLeft: isPos ? '0' : 'auto'
                    }}
                  />
                </div>
                <div
                  className={styles.shapBarValue}
                  style={{ color: isPos ? '#16a34a' : '#dc2626' }}
                >
                  {isPos ? `+${item.contribution}` : item.contribution}
                </div>
              </div>
            );
          })}
        </div>

        {/* SHAP Feature Contribution Table */}
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Feature</th>
                <th>Observed Value</th>
                <th>SHAP Contribution</th>
                <th>Directional Effect</th>
              </tr>
            </thead>
            <tbody>
              {top_features.map((row, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{row.feature}</td>
                  <td>{row.raw_value}</td>
                  <td style={{ fontWeight: 700, color: row.contribution >= 0 ? '#16a34a' : '#dc2626' }}>
                    {row.contribution >= 0 ? `+${row.contribution}` : row.contribution}
                  </td>
                  <td>
                    <span className={row.contribution >= 0 ? styles.badgeApproved : styles.badgeDenied}>
                      {row.effect}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div style={{ marginTop: '20px' }}>
      {renderShapBlock(baseline_shap, false)}
      {renderShapBlock(mitigated_shap, true)}
    </div>
  );
}
