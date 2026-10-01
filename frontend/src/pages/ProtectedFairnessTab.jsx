import React, { useState } from 'react';
import FairCompassChart from '../components/FairCompassChart';
import StatusBadge from '../components/StatusBadge';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { ShieldCheck, Info } from 'lucide-react';

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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', marginBottom: '24px' }}>
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

        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: '24px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <h2 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--color-brand)', marginBottom: '8px' }}>
            Fair-Compass Multi-Metric Radar Audit
          </h2>
          <FairCompassChart auditData={protected_audits} />
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

        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '24px' }}>
          {/* Group Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--color-border)' }}>
                <th style={{ textAlign: 'left', padding: '10px 12px' }}>Group Name</th>
                <th style={{ textAlign: 'right', padding: '10px 12px' }}>Sample Count</th>
                <th style={{ textAlign: 'right', padding: '10px 12px' }}>Selection Rate</th>
                <th style={{ textAlign: 'right', padding: '10px 12px' }}>Disparate Impact</th>
                <th style={{ textAlign: 'right', padding: '10px 12px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {activeAudit.groups.map(g => (
                <tr key={g.group_name} style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                  <td style={{ padding: '10px 12px', fontWeight: '600' }}>
                    {g.group_name} {g.is_reference && <span style={{ fontSize: '10px', color: 'var(--color-brand)', marginLeft: '4px' }}>(Reference)</span>}
                  </td>
                  <td style={{ textAlign: 'right', padding: '10px 12px' }}>{g.count.toLocaleString()}</td>
                  <td style={{ textAlign: 'right', padding: '10px 12px', fontWeight: '700', color: 'var(--color-rate)' }}>
                    {(g.selection_rate * 100).toFixed(1)}%
                  </td>
                  <td style={{ textAlign: 'right', padding: '10px 12px', fontWeight: '700' }}>
                    {g.disparate_impact_ratio}
                  </td>
                  <td style={{ textAlign: 'right', padding: '10px 12px' }}>
                    <StatusBadge status={g.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

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
