import React, { useEffect, useState } from 'react';
import { Users, UserCheck, ShieldCheck, Activity } from 'lucide-react';
import { userAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const METRICS = [
  { key: 'total_customers', label: 'Total Customers', icon: Users, iconBg: 'var(--color-surface-secondary)', iconColor: 'var(--color-accent)' },
  { key: 'total_admins', label: 'Total Admins', icon: ShieldCheck, iconBg: 'var(--color-secondary)', iconColor: 'var(--color-accent)' },
  { key: 'total_staff', label: 'Total Staff', icon: UserCheck, iconBg: 'var(--color-sage-light)', iconColor: 'var(--color-burgundy-dark)' },
  { key: 'active_accounts', label: 'Active Accounts', icon: Activity, iconBg: 'var(--color-text-on-accent)', iconColor: 'var(--color-burgundy-light)' },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    userAPI.getDashboardStats()
      .then(res => {
        if (res.data?.success) setStats(res.data.stats);
        else setError('Failed to load dashboard data.');
      })
      .catch(() => setError('Could not connect to the server.'))
      .finally(() => setLoading(false));
  }, []);

  const greeting = user?.is_main_admin ? 'Main Administrator' : (user?.role_display_name || user?.role || 'Administrator');

  return (
    <div>
      <div className="card dashboard-welcome mb-4" style={{ border: 'none' }}>
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
          <div>
            <h2 className="fw-bold text-white mb-1" style={{ fontSize: '1.4rem' }}>
              Welcome back, {user?.full_name?.split(' ')[0] || 'Admin'}
            </h2>
            <p style={{ color: 'rgba(245, 235, 221, 0.78)', marginBottom: 0, fontSize: '0.9rem' }}>
              Signed in as <strong style={{ color: 'var(--color-secondary)' }}>{greeting}</strong> · Waseem AutoCare Management Portal
            </p>
          </div>
          <div style={{ background: 'rgba(232, 210, 181, 0.14)', borderRadius: 8, padding: '10px 20px', textAlign: 'center' }}>
            <div style={{ color: 'var(--color-secondary)', fontWeight: 700, fontSize: '1.1rem' }}>
              {new Date().toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
            <div style={{ color: 'rgba(245, 235, 221, 0.72)', fontSize: '0.78rem' }}>Today's Date</div>
          </div>
        </div>
      </div>
        {error && <div className="alert alert-danger mb-4" role="alert" aria-live="assertive">{error}</div>}
      <div className="metrics-grid">
        {METRICS.map(({ key, label, icon: Icon, iconBg, iconColor }) => (
          <div className="metric-card" key={key}>
            <div>
              <div className="metric-label">{label}</div>
              <div className="metric-value">
                {loading ? <span className="placeholder-glow"><span className="placeholder col-4" style={{ borderRadius: 6 }} /></span> : (stats?.[key] ?? '—')}
              </div>
              <div className="metric-sub">Live from database</div>
            </div>
            <div className="metric-icon-box" style={{ background: iconBg }}>
              <Icon size={22} color={iconColor} />
            </div>
          </div>
        ))}
      </div>
      <div className="card">
        <div className="card-header"><span className="card-title">System Overview</span></div>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: 0 }}>
          Waseem AutoCare Management Portal — FYP-I Midterm Demo. Use the sidebar to navigate to Account Management or Role &amp; Permission settings. All metrics above are calculated live from the <code>wac_db</code> database.
        </p>
      </div>
    </div>
  );
}
