import React from 'react';
import styles from './Sidebar.module.css';
import {
  UploadCloud,
  LayoutDashboard,
  ShieldCheck,
  Users,
  FileText,
  ChevronRight,
  Activity,
  Target
} from 'lucide-react';

const navItems = [
  { id: 'setup',     label: 'Setup & Upload',     icon: UploadCloud },
  { id: 'dashboard', label: 'Dashboard',          icon: LayoutDashboard },
  { id: 'metrics',   label: 'Fairness Metrics',   icon: ShieldCheck },
  { id: 'prediction', label: 'Prediction',        icon: Target },
  { id: 'reports',   label: 'Report',             icon: FileText },
];

export default function Sidebar({ activeView, onNavigate, isAnalyzed }) {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <div className={styles.brandIcon}>
          <ShieldCheck size={20} />
        </div>
        <div className={styles.brandText}>
          <span className={styles.brandName}>LLOYDS</span>
          <span className={styles.brandSub}>HMDA Fairness &amp; Bias Pipeline</span>
        </div>
      </div>

      <nav className={styles.nav}>
        <p className={styles.navSection}>Navigation</p>
        {navItems.map(({ id, label, icon: Icon }) => {
          const isDisabled = !isAnalyzed && id !== 'setup';
          return (
            <button
              key={id}
              className={`${styles.navItem} ${activeView === id ? styles.active : ''}`}
              onClick={() => !isDisabled && onNavigate(id)}
              disabled={isDisabled}
              style={{ opacity: isDisabled ? 0.45 : 1, cursor: isDisabled ? 'not-allowed' : 'pointer' }}
            >
              <Icon size={17} className={styles.navIcon} />
              <span className={styles.navLabel}>{label}</span>
              {activeView === id && <ChevronRight size={14} className={styles.chevron} />}
            </button>
          );
        })}
      </nav>

      <div className={styles.footer}>
        <div className={styles.footerBadge}>
          <span className={styles.dot} />
          Engine Active
        </div>
        <p className={styles.footerVersion}>v1.0.0 Production</p>
      </div>
    </aside>
  );
}
