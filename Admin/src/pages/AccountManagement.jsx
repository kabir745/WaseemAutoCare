import React, { useEffect, useState, useCallback } from 'react';
import { UserPlus, Search, RefreshCw, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';
import { userAPI, roleAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const ROLE_BADGE_STYLES = {
  main_admin: { background: 'var(--color-secondary)', color: 'var(--color-burgundy-light)', label: 'Main Admin' },
  admin:      { background: 'var(--color-surface-secondary)', color: 'var(--color-burgundy-light)', label: 'Admin' },
  staff:      { background: '#ECFDF5', color: '#16A34A', label: 'Staff' },
  customer:   { background: 'var(--color-surface-secondary)', color: 'var(--color-accent)', label: 'Customer' },
};

const FILTER_TABS = ['All', 'customer', 'admin', 'staff'];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AccountManagement() {
  const { user: currentUser, hasPermission } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '', role_id: '' });

  const canCreateStaff = hasPermission('users.create_staff');
  const canCreateAdmin = hasPermission('users.create_admin');
  const canToggleStatus = hasPermission('users.status');
  const canCreate = canCreateStaff || canCreateAdmin;

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [usersRes, rolesRes] = await Promise.all([userAPI.getAllUsers(), roleAPI.getAllRoles()]);
      if (usersRes.data?.success) setAccounts(usersRes.data.users || []);
      if (rolesRes.data?.success) setRoles(rolesRes.data.roles || []);
    } catch {
      setError("We couldn't load accounts. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Filter roles available for creation based on permissions
  const creatableRoles = roles.filter(r => {
    if (r.name === 'main_admin' || r.name === 'customer') return false;
    if (r.name === 'admin') return canCreateAdmin;
    if (r.name === 'staff') return canCreateStaff;
    return false;
  });

  const filtered = accounts.filter(a => {
    const matchesTab = activeTab === 'All' || a.role === activeTab;
    const q = search.toLowerCase();
    const matchesSearch = !q || a.full_name?.toLowerCase().includes(q) || a.email?.toLowerCase().includes(q);
    return matchesTab && matchesSearch;
  });

  const handleToggleStatus = async (account) => {
    if (account.is_main_admin) return;
    try {
      const res = await userAPI.toggleUserStatus(account.id, account.is_active);
      if (res.data?.success) {
        setAccounts(prev => prev.map(a => a.id === account.id ? { ...a, is_active: !a.is_active } : a));
        setError('');
      } else {
        setError(res.data?.message || 'We could not update that account. Please try again.');
      }
    } catch (e) {
      setError(e.response?.data?.message || 'We could not update that account. Please try again.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    if (!form.full_name.trim()) {
      setFormError('Please enter the account holder’s full name.');
      return;
    }
    if (!form.email.trim()) {
      setFormError('Please enter an email address.');
      return;
    }
    if (!EMAIL_PATTERN.test(form.email.trim())) {
      setFormError('Enter a valid email address, such as name@example.com.');
      return;
    }
    if (!form.password || form.password.length < 6) {
      setFormError('Choose a password with at least 6 characters.');
      return;
    }
    if (!form.role_id) {
      setFormError('Please select a role for this account.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await userAPI.createUser({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        password: form.password,
        role_id: parseInt(form.role_id, 10),
      });
      if (res.data?.success) {
        setFormSuccess('Account created successfully.');
        setForm({ full_name: '', email: '', phone: '', password: '', role_id: '' });
        await loadData();
        setTimeout(() => { setShowModal(false); setFormSuccess(''); }, 1500);
      } else {
        setFormError(res.data?.message || 'Failed to create account.');
      }
    } catch (e) {
      setFormError(e.response?.data?.message || 'Failed to create account.');
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleBadge = (roleName) => {
    const style = ROLE_BADGE_STYLES[roleName] || { background: 'var(--color-surface-secondary)', color: 'var(--color-text-secondary)', label: roleName };
    return (
      <span className="badge" style={{ background: style.background, color: style.color }}>
        {style.label}
      </span>
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="fw-bold mb-1" style={{ color: 'var(--color-text-primary)', fontSize: '1.3rem' }}>Account Management</h2>
          <p className="mb-0" style={{ color: 'var(--color-text-secondary)', fontSize: '0.88rem' }}>Manage all system accounts and access roles.</p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-secondary btn-sm" onClick={loadData} title="Refresh">
            <RefreshCw size={15} /> Refresh
          </button>
          {canCreate && (
            <button className="btn btn-sm" style={{ background: 'var(--color-accent)', color: '#FFF' }} onClick={() => { setShowModal(true); setFormError(''); setFormSuccess(''); }}>
              <UserPlus size={15} /> Add Account
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert alert-danger mb-3" role="alert" aria-live="assertive">{error}</div>}

      {/* Filters */}
      <div className="card mb-0" style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottom: 'none', paddingBottom: 0 }}>
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
          {/* Tabs */}
          <div className="d-flex gap-1 flex-wrap">
            {FILTER_TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="btn btn-sm"
                style={{
                  background: activeTab === tab ? 'var(--color-accent)' : 'transparent',
                  color: activeTab === tab ? '#FFF' : 'var(--color-text-secondary)',
                  border: activeTab === tab ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  textTransform: 'capitalize',
                }}
              >
                {tab === 'All' ? 'All Accounts' : tab}
              </button>
            ))}
          </div>
          {/* Search */}
          <div className="input-group" style={{ maxWidth: 280 }}>
            <span className="input-group-text border-end-0" style={{ background: 'var(--color-surface-secondary)', borderColor: 'var(--color-border)' }}>
              <Search size={15} color="var(--color-text-secondary)" />
            </span>
            <input
              type="text"
              className="form-control border-start-0"
              placeholder="Search by name or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-secondary)', fontSize: '0.88rem' }}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0, padding: 0 }}>
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border" style={{ color: 'var(--color-accent)' }} role="status" />
            <p className="mt-3 mb-0" style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>Loading accounts...</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table" style={{ marginBottom: 0 }}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Full Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Created</th>
                  {canToggleStatus && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={canToggleStatus ? 8 : 7} className="text-center py-5" style={{ color: 'var(--color-text-secondary)' }}>
                      No accounts found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((acc, idx) => (
                    <tr key={acc.id}>
                      <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.82rem' }}>{idx + 1}</td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div
                            className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
                            style={{ width: 32, height: 32, backgroundColor: acc.is_main_admin ? 'var(--color-secondary)' : 'var(--color-accent)', color: acc.is_main_admin ? 'var(--color-text-primary)' : '#FFF', fontSize: '0.8rem', flexShrink: 0 }}
                          >
                            {acc.full_name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{acc.full_name}</div>
                            {acc.is_main_admin && <div style={{ fontSize: '0.72rem', color: 'var(--color-burgundy-light)' }}>Main Admin</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>{acc.email}</td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>{acc.phone || <span style={{ color: 'var(--color-border)' }}>—</span>}</td>
                      <td>{getRoleBadge(acc.role)}</td>
                      <td>
                        <span className="badge" style={{ background: acc.is_active ? '#DCFCE7' : '#FEE2E2', color: acc.is_active ? '#16A34A' : '#DC2626' }}>
                          {acc.is_active ? <><CheckCircle size={11} style={{ marginRight: 4 }} />Active</> : <><XCircle size={11} style={{ marginRight: 4 }} />Inactive</>}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                        {acc.created_at ? new Date(acc.created_at).toLocaleDateString('en-PK') : '—'}
                      </td>
                      {canToggleStatus && (
                        <td>
                          {acc.is_main_admin || acc.id === currentUser?.id ? (
                            <span style={{ fontSize: '0.78rem', color: 'var(--color-border)' }}>Protected</span>
                          ) : (
                            <button
                              className="btn btn-sm"
                              onClick={() => handleToggleStatus(acc)}
                              style={{
                                background: acc.is_active ? '#FEE2E2' : '#DCFCE7',
                                color: acc.is_active ? '#DC2626' : '#16A34A',
                                border: 'none',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                borderRadius: 6,
                              }}
                            >
                              {acc.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Account Modal */}
      {showModal && (
        <div className="modal d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0" style={{ borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
              <div className="modal-header border-0 pb-0" style={{ padding: '24px 28px 12px' }}>
                <h5 className="modal-title fw-bold" style={{ color: 'var(--color-text-primary)' }}>
                  <UserPlus size={18} style={{ marginRight: 8, color: 'var(--color-accent)' }} />
                  Create New Account
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)} />
              </div>
              <div className="modal-body" style={{ padding: '16px 28px 28px' }}>
                {formError && (
                  <div className="alert alert-danger py-2 px-3 mb-3" role="alert" aria-live="assertive">
                    {formError}
                  </div>
                )}
                {formSuccess && (
                  <div className="alert alert-success py-2 px-3 mb-3" role="status" aria-live="polite">
                    {formSuccess}
                  </div>
                )}
                <form onSubmit={handleSubmit} noValidate>
                  <div className="mb-3">
                    <label className="form-label fw-medium" style={{ fontSize: '0.85rem' }}>Full Name *</label>
                    <input type="text" className="form-control" style={{ borderColor: 'var(--color-border)', borderRadius: 8 }}
                      placeholder="e.g., Muhammad Ali" value={form.full_name} required
                      onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-medium" style={{ fontSize: '0.85rem' }}>Email Address *</label>
                    <input type="email" className="form-control" style={{ borderColor: 'var(--color-border)', borderRadius: 8 }}
                      placeholder="e.g., ali@waseemautocare.com" value={form.email} required
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-medium" style={{ fontSize: '0.85rem' }}>Phone (optional)</label>
                    <input type="text" className="form-control" style={{ borderColor: 'var(--color-border)', borderRadius: 8 }}
                      placeholder="e.g., 0300-1234567" value={form.phone}
                      onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-medium" style={{ fontSize: '0.85rem' }}>Password *</label>
                    <div className="input-group">
                      <input type={showPass ? 'text' : 'password'} className="form-control border-end-0"
                        style={{ borderColor: 'var(--color-border)', borderRadius: '8px 0 0 8px' }}
                        placeholder="Min. 6 characters" value={form.password} minLength={6} required
                        onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
                      <button type="button" className="input-group-text bg-transparent" style={{ borderColor: 'var(--color-border)', cursor: 'pointer', borderRadius: '0 8px 8px 0' }}
                        onClick={() => setShowPass(p => !p)}>
                        {showPass ? <EyeOff size={15} color="var(--color-text-secondary)" /> : <Eye size={15} color="var(--color-text-secondary)" />}
                      </button>
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="form-label fw-medium" style={{ fontSize: '0.85rem' }}>Role *</label>
                    <select className="form-select" style={{ borderColor: 'var(--color-border)', borderRadius: 8 }}
                      value={form.role_id} required onChange={e => setForm(f => ({ ...f, role_id: e.target.value }))}>
                      <option value="">-- Select Role --</option>
                      {creatableRoles.map(r => (
                        <option key={r.id} value={r.id}>{r.display_name || r.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="d-flex gap-2 justify-content-end">
                    <button type="button" className="btn btn-sm btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                    <button type="submit" className="btn btn-sm" disabled={submitting}
                      style={{ background: 'var(--color-accent)', color: '#FFF' }}>
                      {submitting ? <><span className="spinner-border spinner-border-sm me-2" />Creating...</> : 'Create Account'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
