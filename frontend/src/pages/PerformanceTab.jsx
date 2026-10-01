import React from 'react';
import StatCard from '../components/StatCard';
import TradeoffChart from '../components/TradeoffChart';
import { Target, CheckCircle2, AlertTriangle, Activity, BarChart2, Shield } from 'lucide-react';

export default function PerformanceTab({ analysisData }) {
  if (!analysisData) return null;

  const { performance, tradeoff_analysis, optimal_threshold } = analysisData;
  const cm = performance.confusion_matrix;
  const total = performance.total_count || 1;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
      {/* 1. Overall Performance Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '14px', marginBottom: '24px' }}>
        <StatCard label="Accuracy" value={`${(performance.accuracy * 100).toFixed(1)}%`} icon={Target} color="#006a4e" />
        <StatCard label="Precision" value={`${(performance.precision * 100).toFixed(1)}%`} icon={CheckCircle2} color="#2563eb" />
        <StatCard label="Recall (TPR)" value={`${(performance.recall * 100).toFixed(1)}%`} icon={Activity} color="#d97706" />
        <StatCard label="F1 Score" value={`${(performance.f1_score * 100).toFixed(1)}%`} icon={BarChart2} color="#7c3aed" />
        <StatCard label="ROC-AUC" value={`${(performance.roc_auc * 100).toFixed(1)}%`} icon={Shield} color="#059669" />
        <StatCard label="Specificity" value={`${(performance.specificity * 100).toFixed(1)}%`} icon={AlertTriangle} color="#64748b" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', marginBottom: '24px' }}>
        {/* 2. Confusion Matrix */}
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: '24px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <h2 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--color-brand)', marginBottom: '16px' }}>
            Confusion Matrix Breakdown
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '16px',
            textAlign: 'center'
          }}>
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '16px', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: '700', textTransform: 'uppercase' }}>
                True Positives (TP)
              </div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#16a34a', marginTop: '4px' }}>
                {cm.tp.toLocaleString()}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                {((cm.tp / total) * 100).toFixed(1)}% of total
              </div>
            </div>

            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '16px', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', color: '#dc2626', fontWeight: '700', textTransform: 'uppercase' }}>
                False Positives (FP)
              </div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#dc2626', marginTop: '4px' }}>
                {cm.fp.toLocaleString()}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                {((cm.fp / total) * 100).toFixed(1)}% of total
              </div>
            </div>

            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '16px', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', color: '#d97706', fontWeight: '700', textTransform: 'uppercase' }}>
                False Negatives (FN)
              </div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#d97706', marginTop: '4px' }}>
                {cm.fn.toLocaleString()}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                {((cm.fn / total) * 100).toFixed(1)}% of total
              </div>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '16px', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', color: '#475569', fontWeight: '700', textTransform: 'uppercase' }}>
                True Negatives (TN)
              </div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#334155', marginTop: '4px' }}>
                {cm.tn.toLocaleString()}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                {((cm.tn / total) * 100).toFixed(1)}% of total
              </div>
            </div>
          </div>
        </div>

        {/* 3. Fairness vs Accuracy Trade-off Evaluator (Temporarily hidden from UI display) */}
        {/*
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: '24px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--color-brand)' }}>
                Fairness vs. Accuracy Trade-Off Evaluation
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                Analyzes model accuracy and disparate impact ratio across decision probability thresholds.
              </p>
            </div>
            <div style={{ background: 'var(--color-brand-light)', color: 'var(--color-brand)', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700' }}>
              Recommended Threshold: {optimal_threshold}
            </div>
          </div>

          <TradeoffChart tradeoffData={tradeoff_analysis} optimalThreshold={optimal_threshold} />
        </div>
        */}
      </div>
    </div>
  );
}
