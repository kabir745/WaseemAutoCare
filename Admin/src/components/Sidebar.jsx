import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  User,
  LogOut,
  Database,
} from 'lucide-react';
import Logo from './Logo';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
  const { user, logout, hasPermission } = useAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
         <Logo size={22} variant="dark" showText  />
      </div>
      <nav className="sidebar-nav">
        <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </NavLink>
        {hasPermission('users.view') && (
          <NavLink to="/accounts" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Users size={18} />
            <span>Account Management</span>
          </NavLink>
        )}
        {(user?.is_main_admin || hasPermission('roles.manage')) && (
          <NavLink to="/roles" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <ShieldCheck size={18} />
            <span>Role Permissions</span>
          </NavLink>
        )}
        <NavLink to="/profile" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <User size={18} />
          <span>My Profile</span>
        </NavLink>
      </nav>
      <div className="sidebar-footer">
    
        <div className="d-flex align-items-center justify-content-between p-2 rounded" style={{ background: 'rgba(0,0,0,0.15)' }}>
          <div className="d-flex align-items-center gap-2 overflow-hidden">
            <div
              className="rounded-circle d-flex align-items-center justify-content-center fw-bold"
              style={{ width: 34, height: 34, backgroundColor: user?.is_main_admin ? 'var(--color-secondary)' : 'var(--color-accent)', color: user?.is_main_admin ? 'var(--color-text-primary)' : 'var(--color-text-on-accent)' }}
            >
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'A'}
            </div>
            <div className="overflow-hidden">
              <div className="text-truncate fw-semibold" style={{ fontSize: '0.85rem', color: 'var(--color-text-primary)' }}>
                {user?.full_name || 'Administrator'}
              </div>
              <div className="text-truncate" style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)' }}>
                {user?.is_main_admin ? 'Main Administrator' : (user?.role_display_name || user?.role)}
              </div>
            </div>
          </div>
          <button onClick={logout} className="btn btn-link p-1 text-danger border-0" title="Sign Out">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
