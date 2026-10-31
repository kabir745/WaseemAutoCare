import React, { useState } from 'react';
import { User, Mail, Phone, Shield, Edit3, Save, X, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState(null);

  const handleEdit = () => {
    setFullName(user?.full_name || '');
    setPhone(user?.phone || '');
    setAlert(null);
    setEditing(true);
  };

  const handleCancel = () => {
    setEditing(false);
    setAlert(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setAlert({ type: 'danger', message: 'Full name cannot be empty.' });
      return;
    }
    setSubmitting(true);
    setAlert(null);
    const result = await updateProfile({ full_name: fullName.trim(), phone: phone.trim() });
    setSubmitting(false);
    if (result.success) {
      setAlert({ type: 'success', message: 'Profile updated successfully.' });
      setEditing(false);
    } else {
      setAlert({ type: 'danger', message: result.message });
    }
  };

  const roleName = user?.is_main_admin ? 'Main Administrator' : (user?.role_display_name || user?.role || 'Staff');
  const roleColor = user?.is_main_admin ? 'var(--color-burgundy-light)' : 'var(--color-burgundy-light)';
  const roleBg = user?.is_main_admin ? 'var(--color-secondary)' : 'var(--color-surface-secondary)';

  return (
    <div >
      {/* Profile Card */}
      <div className="card mb-6">
        {/* Header */}
        <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
          <div className="d-flex align-items-center gap-3">
            <div
              className="rounded-circle d-flex align-items-center justify-content-center fw-bold"
              style={{ width: 64, height: 64, backgroundColor: user?.is_main_admin ? 'var(--color-secondary)' : 'var(--color-accent)', color: user?.is_main_admin ? 'var(--color-text-primary)' : '#FFF', fontSize: '1.5rem', flexShrink: 0 }}
            >
              {user?.full_name?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            <div>
              <h4 className="fw-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>{user?.full_name}</h4>
              <span className="badge" style={{ background: roleBg, color: roleColor, fontSize: '0.78rem', padding: '4px 10px' }}>
                {user?.is_main_admin && <Shield size={11} style={{ marginRight: 4 }} />}
                {roleName}
              </span>
            </div>
          </div>
          {!editing && (
            <button className="btn btn-sm btn-secondary" onClick={handleEdit}>
              <Edit3 size={14} /> Edit Profile
            </button>
          )}
        </div>

        {/* Alerts */}
        {alert && (
            <div className={`alert alert-${alert.type} py-2 px-3 mb-3`} role={alert.type === 'danger' ? 'alert' : 'status'} aria-live="polite">
            {alert.message}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSave}>
          {/* Full Name */}
          <div className="mb-3">
            <label className="form-label fw-medium d-flex align-items-center gap-2" style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
              <User size={14} /> Full Name
            </label>
            {editing ? (
              <input
                type="text"
                className="form-control"
                style={{ borderColor: 'var(--color-border)', borderRadius: 8 }}
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Your full name"
              />
            ) : (
              <div className="p-3 rounded" style={{ background: 'var(--color-surface-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', fontSize: '0.9rem', fontWeight: 500 }}>
                {user?.full_name || '—'}
              </div>
            )}
          </div>

          {/* Email — always read-only */}
          <div className="mb-3">
            <label className="form-label fw-medium d-flex align-items-center gap-2" style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
              <Mail size={14} /> Email Address
              <span className="badge" style={{ background: 'var(--color-surface-secondary)', color: 'var(--color-text-secondary)', fontSize: '0.7rem', fontWeight: 500 }}>
                <Lock size={9} style={{ marginRight: 3 }} />Read-only
              </span>
            </label>
            <div className="p-3 rounded" style={{ background: 'var(--color-surface-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
              {user?.email}
            </div>
          </div>

          {/* Phone */}
          <div className="mb-4">
            <label className="form-label fw-medium d-flex align-items-center gap-2" style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
              <Phone size={14} /> Phone Number
            </label>
            {editing ? (
              <input
                type="text"
                className="form-control"
                style={{ borderColor: 'var(--color-border)', borderRadius: 8 }}
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="e.g., 0300-1234567"
              />
            ) : (
              <div className="p-3 rounded" style={{ background: 'var(--color-surface-secondary)', border: '1px solid var(--color-border)', color: user?.phone ? 'var(--color-text-primary)' : 'var(--color-border)', fontSize: '0.9rem', fontWeight: user?.phone ? 500 : 400 }}>
                {user?.phone || 'Not provided'}
              </div>
            )}
          </div>

          {/* Edit action buttons */}
          {editing && (
            <div className="d-flex gap-2">
              <button type="submit" className="btn btn-sm" disabled={submitting}
                style={{ background: 'var(--color-accent)', color: '#FFF', borderRadius: 8 }}>
                {submitting ? <><span className="spinner-border spinner-border-sm me-2" />Saving...</> : <><Save size={14} style={{ marginRight: 6 }} />Save Changes</>}
              </button>
              <button type="button" className="btn btn-sm btn-secondary" onClick={handleCancel}>
                <X size={14} style={{ marginRight: 4 }} />Cancel
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Info card */}
      <div className="card" style={{ background: 'var(--color-surface-secondary)', border: '1px solid var(--color-border)' }}>
        <p className="mb-0" style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
          <strong style={{ color: 'var(--color-text-primary)' }}>Security note:</strong> Your email address, role, account status, and password can only be changed by the Main Administrator through the backend. Profile editing is limited to name and phone number only.
        </p>
      </div>
    </div>
  );
}
