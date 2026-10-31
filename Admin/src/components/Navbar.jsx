import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield } from 'lucide-react';
import Logo from './Logo';

export default function Navbar({ title }) {
  const { user } = useAuth();
  return (
    <header className="top-header">
      <div className="header-brand">
     
        <h1 className="header-title">{title}</h1>
      </div>
      <div className="header-badges">
        <span className="status-pill online">
          <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: 'var(--status-success)', display: 'inline-block' }} />
          System Online
        </span>
        <div className="d-flex align-items-center gap-2">
          <div
            className="rounded-circle d-flex align-items-center justify-content-center fw-bold"
            style={{ width: 36, height: 36, backgroundColor: user?.is_main_admin ? 'var(--color-secondary)' : 'var(--color-accent)', color: user?.is_main_admin ? 'var(--color-text-primary)' : 'var(--color-text-on-accent)', fontSize: '0.85rem' }}
          >
            {user?.full_name?.charAt(0)?.toUpperCase() || 'A'}
          </div>
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{user?.full_name || 'Admin'}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
              {user?.is_main_admin ? 'Main Administrator' : (user?.role_display_name || user?.role || 'Staff')}
            </div>
          </div>
          {user?.is_main_admin && <Shield size={16} color="var(--color-accent)" />}
        </div>
      </div>
    </header>
  );
}
