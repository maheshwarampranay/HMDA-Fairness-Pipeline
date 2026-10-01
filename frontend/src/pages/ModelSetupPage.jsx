import React, { useState } from 'react';
import { uploadDataset, loadBenchmarkData, runFairnessAnalysis } from '../api/client';
import { UploadCloud, CheckCircle2, Play, Database, FileSpreadsheet, ShieldAlert } from 'lucide-react';

export default function ModelSetupPage({ onAnalysisComplete }) {
  const [modelName, setModelName] = useState('HMDA Mortgage XGBoost Model');
  const [fileMeta, setFileMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);

  // Mappings state
  const [targetCol, setTargetCol] = useState('');
  const [predCol, setPredCol] = useState('');
  const [probCol, setProbCol] = useState('');
  const [protectedCols, setProtectedCols] = useState([]);
  const [referenceGroups, setReferenceGroups] = useState({});
  const [riskTier, setRiskTier] = useState('strict');

  const handleFileUpload = async (e) => {
    const file = e.target ? e.target.files[0] : (e.files ? e.files[0] : e);
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const meta = await uploadDataset(file);
      populateMeta(meta);
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to upload dataset';
      if (err.message === 'Network Error') {
        setError('Network Error: Please make sure the backend server is running (python run_app.py or uvicorn on port 8000).');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLoadBenchmark = async () => {
    setLoading(true);
    setError(null);
    try {
      const meta = await loadBenchmarkData();
      populateMeta(meta);
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to load benchmark dataset';
      if (err.message === 'Network Error') {
        setError('Network Error: Please make sure the backend server is running (python run_app.py or uvicorn on port 8000).');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const populateMeta = (meta) => {
    setFileMeta(meta);
    setTargetCol(meta.suggested_target || meta.columns[0]);
    setPredCol(meta.suggested_pred || meta.columns[1] || meta.columns[0]);
    setProbCol(meta.suggested_prob || '');
    setProtectedCols(meta.suggested_protected || []);
  };

  const toggleProtectedCol = (col) => {
    if (protectedCols.includes(col)) {
      setProtectedCols(protectedCols.filter(c => c !== col));
    } else {
      setProtectedCols([...protectedCols, col]);
    }
  };

  const handleRunAnalysis = async () => {
    if (!fileMeta) return;
    if (!targetCol || !predCol) {
      setError('Please select both Ground Truth and Prediction columns.');
      return;
    }
    if (protectedCols.length === 0) {
      setError('Please select at least one protected attribute for fairness audit.');
      return;
    }

    setAnalyzing(true);
    setError(null);
    try {
      const payload = {
        file_id: fileMeta.file_id,
        model_name: modelName,
        target_col: targetCol,
        pred_col: predCol,
        prob_col: probCol || null,
        protected_cols: protectedCols,
        reference_groups: referenceGroups,
        risk_tier: riskTier
      };
      const result = await runFairnessAnalysis(payload);
      onAnalysisComplete(result);
    } catch (err) {
      setError(err.response?.data?.detail || 'Fairness analysis failed.');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--color-text-primary)' }}>
          HMDA Fairness Pipeline Setup &amp; Ingestion
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
          Configure your HMDA mortgage model parameters, upload predictions data, and select protected attributes for automated fairness evaluation.
        </p>
      </div>

      {error && (
        <div style={{
          background: 'var(--color-block-bg)',
          border: '1px solid var(--color-block-border)',
          color: 'var(--color-block)',
          padding: '12px 16px',
          borderRadius: 'var(--radius-md)',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '13px',
          fontWeight: '600'
        }}>
          <ShieldAlert size={18} />
          {error}
        </div>
      )}

      {/* 1. Model Details & Data Upload */}
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <h2 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--color-brand)', marginBottom: '16px' }}>
          1. Model Metadata &amp; Dataset Upload
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
              Model Name / Identifier
            </label>
            <input
              type="text"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                fontSize: '13px'
              }}
              placeholder="e.g. HMDA Mortgage XGBoost v1.0"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
              Decision Risk Tier Preset
            </label>
            <select
              value={riskTier}
              onChange={(e) => setRiskTier(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                fontSize: '13px',
                background: '#ffffff'
              }}
            >
              <option value="strict">Strict (Regulatory Compliance - 80% DIR, 5% DPD)</option>
              <option value="moderate">Moderate (Standard Banking - 75% DIR, 10% DPD)</option>
              <option value="lenient">Lenient (Exploratory Analysis - 65% DIR, 15% DPD)</option>
            </select>
          </div>
        </div>

        {/* Upload Buttons & Drag and Drop Dropzone */}
        <div
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
              const file = e.dataTransfer.files[0];
              handleFileUpload({ target: { files: [file] } });
            }
          }}
          style={{
            border: '2px dashed var(--color-brand)',
            borderRadius: 'var(--radius-md)',
            padding: '30px',
            textAlign: 'center',
            background: '#fafafa',
            cursor: 'pointer'
          }}
        >
          <UploadCloud size={40} style={{ color: 'var(--color-brand)', marginBottom: '10px' }} />
          <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
            Drag &amp; Drop HMDA Model Predictions Dataset (CSV / Excel)
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px', marginBottom: '16px' }}>
            Or click below to browse files from your computer
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <label style={{
              background: 'var(--color-brand)',
              color: '#ffffff',
              padding: '10px 20px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <FileSpreadsheet size={16} />
              Browse Files...
              <input type="file" accept=".csv,.xlsx,.xls" onChange={(e) => { handleFileUpload(e); e.target.value = null; }} style={{ display: 'none' }} />
            </label>

            <button
              onClick={handleLoadBenchmark}
              disabled={loading}
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
                padding: '10px 20px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '13px',
                fontWeight: '600',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Database size={16} />
              {loading ? 'Loading...' : 'Load Benchmark HMDA Data'}
            </button>
          </div>

          {fileMeta && (
            <div style={{
              marginTop: '16px',
              padding: '10px 16px',
              background: 'var(--color-pass-bg)',
              border: '1px solid var(--color-pass-border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--color-pass)',
              fontSize: '12px',
              fontWeight: '600',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <CheckCircle2 size={16} />
              Dataset Loaded: <strong>{fileMeta.filename}</strong> ({fileMeta.num_rows.toLocaleString()} rows, {fileMeta.num_cols} columns)
            </div>
          )}
        </div>
      </div>

      {/* 2. Column Selectors & Protected Attributes */}
      {fileMeta && (
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <h2 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--color-brand)', marginBottom: '16px' }}>
            2. Column Mapping &amp; Protected Attributes Selection
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                Ground Truth Column (y_true)
              </label>
              <select
                value={targetCol}
                onChange={(e) => setTargetCol(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', fontSize: '13px' }}
              >
                {fileMeta.columns.map(col => <option key={col} value={col}>{col}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                Prediction Decision Column (y_pred)
              </label>
              <select
                value={predCol}
                onChange={(e) => setPredCol(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', fontSize: '13px' }}
              >
                {fileMeta.columns.map(col => <option key={col} value={col}>{col}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                Prediction Probability Column (y_prob, optional)
              </label>
              <select
                value={probCol}
                onChange={(e) => setProbCol(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', fontSize: '13px' }}
              >
                <option value="">-- None / Discrete binary --</option>
                {fileMeta.columns.map(col => <option key={col} value={col}>{col}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--color-text-primary)', marginBottom: '10px' }}>
              Select Protected Attributes for Audit:
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {fileMeta.columns.map(col => {
                if (col === targetCol || col === predCol || col === probCol) return null;
                const isSelected = protectedCols.includes(col);
                return (
                  <button
                    key={col}
                    onClick={() => toggleProtectedCol(col)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '600',
                      border: isSelected ? '1px solid var(--color-brand)' : '1px solid var(--color-border)',
                      background: isSelected ? 'var(--color-brand-light)' : '#ffffff',
                      color: isSelected ? 'var(--color-brand)' : 'var(--color-text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <input type="checkbox" checked={isSelected} onChange={() => {}} style={{ pointerEvents: 'none' }} />
                    {col}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ textAlign: 'right', marginTop: '24px' }}>
            <button
              onClick={handleRunAnalysis}
              disabled={analyzing}
              style={{
                background: 'var(--color-brand)',
                color: '#ffffff',
                border: 'none',
                padding: '12px 28px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '14px',
                fontWeight: '700',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                boxShadow: 'var(--shadow-md)'
              }}
            >
              <Play size={18} />
              {analyzing ? 'Executing Fairness Analysis...' : 'Run Fairness Analysis'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
