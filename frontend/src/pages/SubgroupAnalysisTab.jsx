import React, { useState } from 'react';
import StatusBadge from '../components/StatusBadge';
import { Search, Filter, Users, AlertTriangle } from 'lucide-react';

export default function SubgroupAnalysisTab({ analysisData }) {
  if (!analysisData || !analysisData.subgroup_analysis) return null;

  const { subgroup_analysis } = analysisData;
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredSubgroups = subgroup_analysis.filter(sg => {
    const matchesSearch = sg.label.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || sg.combination_type === typeFilter;
    const matchesStatus = statusFilter === 'all' || sg.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const highRiskCount = subgroup_analysis.filter(s => s.status === 'HIGH BIAS').length;
  const flagCount = subgroup_analysis.filter(s => s.status === 'FLAG').length;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
      {/* 1. Header & Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '16px 20px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
            Total Subgroups Audited
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--color-text-primary)', marginTop: '4px' }}>
            {subgroup_analysis.length}
          </div>
        </div>

        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '16px 20px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-block)', textTransform: 'uppercase' }}>
            High Risk Subgroups
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--color-block)', marginTop: '4px' }}>
            {highRiskCount}
          </div>
        </div>

        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '16px 20px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-flag)', textTransform: 'uppercase' }}>
            Flagged Warnings
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--color-flag)', marginTop: '4px' }}>
            {flagCount}
          </div>
        </div>

        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '16px 20px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-pass)', textTransform: 'uppercase' }}>
            Fair Compliant Subgroups
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--color-pass)', marginTop: '4px' }}>
            {subgroup_analysis.length - highRiskCount - flagCount}
          </div>
        </div>
      </div>

      {/* 2. Filter & Controls Bar */}
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: '20px 24px',
        marginBottom: '20px',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        justify: 'space-between',
        alignItems: 'center',
        gap: '16px',
        flexWrap: 'wrap'
      }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            placeholder="Search subgroup attributes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px 9px 36px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              fontSize: '13px'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)' }}>Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', fontSize: '13px', background: '#ffffff' }}
            >
              <option value="all">All Subgroups</option>
              <option value="single_attribute">Single Attribute</option>
              <option value="combined_attributes">Combined Attributes</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)' }}>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', fontSize: '13px', background: '#ffffff' }}
            >
              <option value="all">All Risk Levels</option>
              <option value="HIGH BIAS">High Bias</option>
              <option value="FLAG">Flagged</option>
              <option value="PASS">Pass</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. Subgroup Table */}
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--color-border)' }}>
              <th style={{ textAlign: 'left', padding: '12px 16px' }}>Subgroup Label</th>
              <th style={{ textAlign: 'right', padding: '12px 16px' }}>Sample Size (N)</th>
              <th style={{ textAlign: 'right', padding: '12px 16px' }}>Population %</th>
              <th style={{ textAlign: 'right', padding: '12px 16px' }}>Selection Rate</th>
              <th style={{ textAlign: 'right', padding: '12px 16px' }}>Accuracy</th>
              <th style={{ textAlign: 'right', padding: '12px 16px' }}>TPR</th>
              <th style={{ textAlign: 'right', padding: '12px 16px' }}>Disparity Ratio</th>
              <th style={{ textAlign: 'center', padding: '12px 16px' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredSubgroups.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: 'var(--color-text-muted)' }}>
                  No subgroups match the selected filters.
                </td>
              </tr>
            ) : (
              filteredSubgroups.map(sg => (
                <tr key={sg.subgroup_id} style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
                    {sg.label}
                  </td>
                  <td style={{ textAlign: 'right', padding: '12px 16px' }}>{sg.count.toLocaleString()}</td>
                  <td style={{ textAlign: 'right', padding: '12px 16px', color: 'var(--color-text-secondary)' }}>
                    {sg.percentage}%
                  </td>
                  <td style={{ textAlign: 'right', padding: '12px 16px', fontWeight: '700', color: 'var(--color-rate)' }}>
                    {(sg.selection_rate * 100).toFixed(1)}%
                  </td>
                  <td style={{ textAlign: 'right', padding: '12px 16px' }}>
                    {(sg.accuracy * 100).toFixed(1)}%
                  </td>
                  <td style={{ textAlign: 'right', padding: '12px 16px' }}>
                    {(sg.tpr * 100).toFixed(1)}%
                  </td>
                  <td style={{ textAlign: 'right', padding: '12px 16px', fontWeight: '700' }}>
                    {sg.disparity_ratio}
                  </td>
                  <td style={{ textAlign: 'center', padding: '12px 16px' }}>
                    <StatusBadge status={sg.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
