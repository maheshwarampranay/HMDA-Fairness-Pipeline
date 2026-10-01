import React from 'react';

export default function StatCard({ label, value, subtext, icon: Icon, color = '#006a4e' }) {
  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-md)',
      padding: '16px 20px',
      boxShadow: 'var(--shadow-sm)',
      display: 'flex',
      flexDirection: 'column',
      justify: 'space-between'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
          {label}
        </span>
        {Icon && (
          <div style={{
            background: 'var(--color-brand-light)',
            padding: '8px',
            borderRadius: 'var(--radius-sm)',
            color: color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Icon size={18} />
          </div>
        )}
      </div>
      <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--color-text-primary)', marginTop: '8px' }}>
        {value}
      </div>
      {subtext && (
        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
          {subtext}
        </div>
      )}
    </div>
  );
}
