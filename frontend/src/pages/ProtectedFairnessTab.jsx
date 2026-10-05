import React, { useState } from 'react';
import StatusBadge from '../components/StatusBadge';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { ShieldCheck, Info, BookOpen } from 'lucide-react';

export default function ProtectedFairnessTab({ analysisData }) {
  if (!analysisData || !analysisData.protected_audits) return null;

  const { protected_audits, overall_fairness_score, overall_status } = analysisData;
  const [selectedAttributeIndex, setSelectedAttributeIndex] = useState(0);

  const activeAudit = protected_audits[selectedAttributeIndex] || protected_audits[0];

  const groupChartData = activeAudit.groups.map(g => ({
    name: g.group_name,
    selection_rate: (g.selection_rate * 100).toFixed(1),
    tpr: (g.tpr * 100).toFixed(1),
    is_ref: g.is_reference
  }));

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
      {/* 1. Fair Compass & Summary Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2.4fr', gap: '24px', marginBottom: '24px' }}>
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: '24px',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-brand)', textTransform: 'uppercase' }}>
              Overall Compass Assessment
            </div>
            <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--color-brand)', marginTop: '4px' }}>
              {overall_fairness_score}%
            </div>
            <div style={{ marginTop: '8px' }}>
              <StatusBadge status={overall_status} />
            </div>
            <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '14px', lineHeight: '1.5' }}>
              Multi-metric fairness score evaluated across Disparate Impact Ratio (80% rule), Demographic Parity, Equalized Odds, and Predictive Parity.
            </p>
          </div>

          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--color-text-primary)' }}>
              Protected Attributes Audited ({protected_audits.length})
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
              {protected_audits.map((audit, idx) => (
                <button
                  key={audit.attribute}
                  onClick={() => setSelectedAttributeIndex(idx)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '12px',
                    fontWeight: '600',
                    border: selectedAttributeIndex === idx ? '2px solid var(--color-brand)' : '1px solid var(--color-border)',
                    background: selectedAttributeIndex === idx ? 'var(--color-brand-light)' : '#ffffff',
                    color: selectedAttributeIndex === idx ? 'var(--color-brand)' : 'var(--color-text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  {audit.attribute}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Overall Fairness Score Formula Calculation */}
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: '24px',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          justify: 'space-between'
        }}>
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--color-brand)', margin: '0 0 4px 0' }}>
              Overall Fairness Score Calculation
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: '0 0 16px 0', lineHeight: '1.5' }}>
              Calculated as the arithmetic mean of the Disparate Impact Ratios evaluated across all audited protected attributes.
            </p>

            {/* Formula Block */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px'
            }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>
                Mathematical Model Formula
              </div>
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', fontFamily: 'monospace' }}>
                Overall Score = min&#40;100%, &nbsp;&frac11;; &Sigma; DIR<sub>k</sub> &times; 100%&#41;
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
                Where DIR<sub>k</sub> is the Disparate Impact Ratio for protected attribute <em>k</em> &isin; &#123;Race, Ethnicity, Sex, Age&#125;.
              </div>
            </div>

            {/* Metric Breakdown Note */}
            <div style={{ fontSize: '12px', color: '#334155', lineHeight: '1.5' }}>
              <strong>Audit Evaluation Rule:</strong> A group passes when Disparate Impact Ratio (DIR) &ge; 0.80 and Demographic Parity Difference (DPD) &le; 5.0%. When DPD &gt; 10.0%, the group triggers a <strong>HIGH BIAS</strong> classification.
            </div>
          </div>
        </div>
      </div>

      {/* 2. Single Feature Protected Attribute Detail Table & Rates Chart */}
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--color-brand)' }}>
              Single Feature Protected Bias: {activeAudit.attribute}
            </h2>
            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
              Reference Group: <strong>{activeAudit.reference_group}</strong>
            </span>
          </div>
          <StatusBadge status={activeAudit.status} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '3.2fr 2fr', gap: '24px' }}>
          {/* Group Table */}
          <div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--color-border)' }}>
                  <th style={{ textAlign: 'left', padding: '10px 10px' }}>Group Name</th>
                  <th style={{ textAlign: 'right', padding: '10px 10px' }}>Sample Count</th>
                  <th style={{ textAlign: 'right', padding: '10px 10px' }}>Selection Rate</th>
                  <th style={{ textAlign: 'right', padding: '10px 10px' }}>Disparate Impact</th>
                  <th style={{ textAlign: 'right', padding: '10px 10px' }}>Demographic Parity Diff</th>
                  <th style={{ textAlign: 'right', padding: '10px 10px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {activeAudit.groups.map(g => (
                  <tr key={g.group_name} style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                    <td style={{ padding: '10px 10px', fontWeight: '600' }}>
                      {g.group_name} {g.is_reference && <span style={{ fontSize: '10px', color: 'var(--color-brand)', marginLeft: '4px' }}>(Reference)</span>}
                    </td>
                    <td style={{ textAlign: 'right', padding: '10px 10px' }}>{g.count.toLocaleString()}</td>
                    <td style={{ textAlign: 'right', padding: '10px 10px', fontWeight: '700', color: 'var(--color-rate)' }}>
                      {(g.selection_rate * 100).toFixed(1)}%
                    </td>
                    <td style={{ textAlign: 'right', padding: '10px 10px', fontWeight: '700' }}>
                      {g.disparate_impact_ratio}
                    </td>
                    <td style={{ textAlign: 'right', padding: '10px 10px', fontWeight: '700', color: g.demographic_parity_diff > 0.10 ? '#dc2626' : (g.demographic_parity_diff > 0.05 ? '#d97706' : '#16a34a') }}>
                      {(g.demographic_parity_diff * 100).toFixed(1)}%
                    </td>
                    <td style={{ textAlign: 'right', padding: '10px 10px' }}>
                      <StatusBadge status={g.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', fontSize: '11px', color: '#475569', background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <Info size={15} color="#0284c7" style={{ flexShrink: 0 }} />
              <span>
                <strong>Compliance Note:</strong> Status evaluates both <strong>Disparate Impact Ratio</strong> (DIR &ge; 0.80) and <strong>Demographic Parity Difference</strong> (DPD &le; 5.0% strict threshold; DPD &gt; 10.0% triggers <strong>HIGH BIAS</strong>).
              </span>
            </div>
          </div>

          {/* Group Bar Chart */}
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={groupChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 11 }} />
                <YAxis unit="%" domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip formatter={(value) => [`${value}%`, 'Rate']} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="selection_rate" name="Selection Rate (%)" fill="#006a4e" radius={[4, 4, 0, 0]}>
                  {groupChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.is_ref ? '#006a4e' : '#2563eb'} />
                  ))}
                </Bar>
                <Bar dataKey="tpr" name="True Positive Rate (%)" fill="#d97706" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
