import React from 'react';
import { getReportHtmlUrl, getReportPdfUrl } from '../api/client';
import StatusBadge from '../components/StatusBadge';
import { FileText, Download, ExternalLink, ShieldCheck } from 'lucide-react';

export default function ReportTab({ analysisData }) {
  if (!analysisData) return null;

  const htmlUrl = getReportHtmlUrl(analysisData.analysis_id);
  const pdfUrl = getReportPdfUrl(analysisData.analysis_id);

  const handleDownloadJson = () => {
    const jsonStr = JSON.stringify(analysisData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Fairness_Audit_Log_${analysisData.model_name.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', width: '100%' }}>
      {/* 1. Download Actions Header */}
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: '20px 24px',
        marginBottom: '24px',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        justify: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--color-brand)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={20} />
            Executive Fairness Audit Report
          </div>
          <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            Official governance artifact documenting model performance, protected attribute disparities, and threshold compliance.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleDownloadJson}
            style={{
              background: '#ffffff',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
              padding: '9px 16px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              fontWeight: '600',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Download size={15} />
            Export JSON Audit
          </button>

          <a
            href={htmlUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: '#ffffff',
              border: '1px solid var(--color-border)',
              color: 'var(--color-brand)',
              padding: '9px 16px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              fontWeight: '600',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              textDecoration: 'none'
            }}
          >
            <ExternalLink size={15} />
            Open Full HTML
          </a>

          <a
            href={pdfUrl}
            download
            style={{
              background: 'var(--color-brand)',
              color: '#ffffff',
              padding: '9px 20px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              fontWeight: '700',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              textDecoration: 'none'
            }}
          >
            <Download size={15} />
            Download PDF Report
          </a>
        </div>
      </div>

      {/* 2. Live Report Preview Iframe */}
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-md)',
        height: '750px'
      }}>
        <iframe
          src={htmlUrl}
          title="Executive Fairness Audit Report Preview"
          style={{
            width: '100%',
            height: '100%',
            border: 'none'
          }}
        />
      </div>
    </div>
  );
}
