import React from 'react';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip
} from 'recharts';

export default function FairCompassChart({ auditData }) {
  if (!auditData || auditData.length === 0) return null;

  // Average or first protected attribute metrics mapped to 0-100 scale
  const firstAudit = auditData[0];
  const chartData = [
    { metric: 'Disparate Impact', score: Math.min(firstAudit.disparate_impact_ratio * 100, 100), fullMark: 100 },
    { metric: 'Demographic Parity', score: Math.max(100 - firstAudit.demographic_parity_diff * 200, 0), fullMark: 100 },
    { metric: 'Equalized Odds', score: Math.max(100 - firstAudit.equalized_odds_diff * 200, 0), fullMark: 100 },
    { metric: 'Equal Opportunity', score: Math.max(100 - firstAudit.equal_opportunity_diff * 200, 0), fullMark: 100 },
    { metric: 'Predictive Parity', score: Math.max(100 - firstAudit.predictive_parity_diff * 200, 0), fullMark: 100 },
  ];

  return (
    <div style={{ width: '100%', height: 320 }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData}>
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis dataKey="metric" tick={{ fill: '#475569', fontSize: 12, fontWeight: 600 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
          <Radar
            name="Fairness Score"
            dataKey="score"
            stroke="#006a4e"
            fill="#006a4e"
            fillOpacity={0.35}
          />
          <Tooltip
            formatter={(value) => [`${value.toFixed(1)}%`, 'Score']}
            contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1' }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
