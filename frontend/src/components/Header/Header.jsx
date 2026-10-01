import React from 'react';
import StatusBadge from '../StatusBadge';

export default function Header({ analysisData, modelType, onToggleModelType }) {
  if (!analysisData) return null;

  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-md)',
      padding: '14px 24px',
      marginBottom: '24px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      boxShadow: 'var(--shadow-sm)'
    }}>
      <div>
        <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-brand)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Audited Model
        </div>
        <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--color-text-primary)' }}>
          {analysisData.model_name}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
        {onToggleModelType && (
          <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
            <button
              onClick={() => onToggleModelType('baseline')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                background: modelType === 'baseline' ? '#005A36' : 'transparent',
                color: modelType === 'baseline' ? '#ffffff' : '#475569',
                fontWeight: '700',
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Baseline Model
            </button>
            <button
              onClick={() => onToggleModelType('mitigated')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                background: modelType === 'mitigated' ? '#005A36' : 'transparent',
                color: modelType === 'mitigated' ? '#ffffff' : '#475569',
                fontWeight: '700',
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Bias Mitigated
            </button>
          </div>
        )}

        <div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>
            Risk Tier
          </div>
          <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--color-text-secondary)', textTransform: 'capitalize' }}>
            {analysisData.risk_tier}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>
            Total Samples
          </div>
          <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--color-text-secondary)' }}>
            {analysisData.total_samples ? analysisData.total_samples.toLocaleString() : 0}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>
            Fairness Score
          </div>
          <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-brand)' }}>
            {analysisData.overall_fairness_score}%
          </div>
        </div>

        <div>
          <StatusBadge status={analysisData.overall_status} />
        </div>
      </div>
    </div>
  );
}

