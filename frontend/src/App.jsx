import React, { useState, useEffect } from 'react';
import styles from './App.module.css';

import Sidebar from './components/Sidebar/Sidebar';
import Header from './components/Header/Header';

import ModelSetupPage from './pages/ModelSetupPage';
import PerformanceTab from './pages/PerformanceTab';
import ProtectedFairnessTab from './pages/ProtectedFairnessTab';
import SubgroupAnalysisTab from './pages/SubgroupAnalysisTab';
import ReportTab from './pages/ReportTab';
import { fetchDefaultHmdaAnalysis } from './api/client';

export default function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modelType, setModelType] = useState('baseline');

  useEffect(() => {
    loadHmdaAnalysis(modelType);
  }, [modelType]);

  const loadHmdaAnalysis = async (type) => {
    try {
      setLoading(true);
      const data = await fetchDefaultHmdaAnalysis(type);
      setAnalysisData(data);
    } catch (err) {
      console.error('Failed to auto-load HMDA dataset analysis:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalysisComplete = (data) => {
    setAnalysisData(data);
    setActiveView('dashboard');
  };

  const renderView = () => {
    if (loading && activeView !== 'setup') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--color-text-secondary)' }}>
          <div style={{
            width: 44,
            height: 44,
            border: '4px solid #e2e8f0',
            borderTop: '4px solid #005A36',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: 16
          }} />
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          <h3 style={{ margin: 0, fontWeight: '700', color: '#1e293b' }}>Loading HMDA Mortgage Fairness Audit...</h3>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: 6 }}>Auditing demographic parity, equal opportunity ratios, and subgroup metrics for HMDA Home Loan Approval</p>
        </div>
      );
    }

    switch (activeView) {
      case 'setup':
        return <ModelSetupPage onAnalysisComplete={handleAnalysisComplete} />;
      case 'dashboard':
        return <PerformanceTab analysisData={analysisData} />;
      case 'metrics':
        return <ProtectedFairnessTab analysisData={analysisData} />;
      case 'subgroups':
        return <SubgroupAnalysisTab analysisData={analysisData} />;
      case 'reports':
        return <ReportTab analysisData={analysisData} />;
      default:
        return <PerformanceTab analysisData={analysisData} />;
    }
  };

  return (
    <div className={styles.shell}>
      <Sidebar
        activeView={activeView}
        onNavigate={setActiveView}
        isAnalyzed={!!analysisData}
      />
      <main className={styles.main}>
        {activeView !== 'setup' && (
          <Header
            analysisData={analysisData}
            modelType={modelType}
            onToggleModelType={setModelType}
          />
        )}
        {renderView()}
      </main>
    </div>
  );
}

