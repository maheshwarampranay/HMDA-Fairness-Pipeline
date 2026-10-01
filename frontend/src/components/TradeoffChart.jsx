import React from 'react';
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';

export default function TradeoffChart({ tradeoffData, optimalThreshold }) {
  if (!tradeoffData || tradeoffData.length === 0) return null;

  return (
    <div style={{ width: '100%', height: 320 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={tradeoffData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="threshold" tick={{ fill: '#64748b', fontSize: 11 }} label={{ value: 'Decision Probability Threshold', position: 'insideBottom', offset: -5, fill: '#64748b', fontSize: 11 }} />
          <YAxis yAxisId="left" domain={[0.4, 1.0]} tick={{ fill: '#006a4e', fontSize: 11 }} label={{ value: 'Accuracy / F1', angle: -90, position: 'insideLeft', fill: '#006a4e', fontSize: 11 }} />
          <YAxis yAxisId="right" orientation="right" domain={[0, 1.4]} tick={{ fill: '#2563eb', fontSize: 11 }} label={{ value: 'Disparate Impact Ratio', angle: 90, position: 'insideRight', fill: '#2563eb', fontSize: 11 }} />
          <Tooltip
            contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1' }}
            formatter={(value, name) => [value, name]}
          />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
          {optimalThreshold && (
            <ReferenceLine yAxisId="left" x={optimalThreshold} stroke="#dc2626" strokeDasharray="4 4" label={{ value: `Optimal: ${optimalThreshold}`, fill: '#dc2626', fontSize: 10 }} />
          )}
          <Line yAxisId="left" type="monotone" dataKey="accuracy" name="Accuracy" stroke="#006a4e" strokeWidth={2.5} dot={{ r: 3 }} />
          <Line yAxisId="left" type="monotone" dataKey="f1_score" name="F1 Score" stroke="#d97706" strokeWidth={1.5} strokeDasharray="3 3" dot={false} />
          <Line yAxisId="right" type="monotone" dataKey="disparate_impact_ratio" name="Disparate Impact Ratio" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
