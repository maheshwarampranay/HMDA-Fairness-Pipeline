import React from 'react';

export default function StatusBadge({ status }) {
  let badgeStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '0.3px',
    textTransform: 'uppercase',
  };

  if (status === 'PASS') {
    badgeStyle = {
      ...badgeStyle,
      backgroundColor: 'var(--color-pass-bg)',
      color: 'var(--color-pass)',
      border: '1px solid var(--color-pass-border)',
    };
  } else if (status === 'FLAG' || status === 'WARNING') {
    badgeStyle = {
      ...badgeStyle,
      backgroundColor: 'var(--color-flag-bg)',
      color: 'var(--color-flag)',
      border: '1px solid var(--color-flag-border)',
    };
  } else {
    badgeStyle = {
      ...badgeStyle,
      backgroundColor: 'var(--color-block-bg)',
      color: 'var(--color-block)',
      border: '1px solid var(--color-block-border)',
    };
  }

  return <span style={badgeStyle}>{status}</span>;
}
