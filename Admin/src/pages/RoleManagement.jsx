import React, { useEffect, useState, useCallback } from 'react';
import { ShieldCheck, Save, RefreshCw, Lock } from 'lucide-react';
import { roleAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function RoleManagement() {
  const { user } = useAuth();
  const isMainAdmin = !!user?.is_main_admin;
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [rolePermsMap, setRolePermsMap] = useState({});  // roleId -> Set of permissionId
  const [pendingMap, setPendingMap] = useState({});       // roleId -> Set of permissionId (editable)
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(null); // roleId being saved
  const [alerts, setAlerts] = useState({});   // roleId -> { type, message }

  const buildMaps = (rolesData) => {
    const rMap = {};
    const pMap = {};
    rolesData.forEach(role => {
      const ids = new Set((role.permissions || []).map(p => p.id));
      rMap[role.id] = ids;
      pMap[role.id] = new Set(ids);
    });
    setRolePermsMap(rMap);
    setPendingMap(pMap);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [rolesRes, permsRes] = await Promise.all([roleAPI.getAllRoles(), roleAPI.getAllPermissions()]);
        if (!rolesRes.data?.success || !permsRes.data?.success) {
          throw new Error('Role permissions are unavailable.');
        }
      if (rolesRes.data?.success) {
        setRoles(rolesRes.data.roles || []);
        buildMaps(rolesRes.data.roles || []);
      }
      if (permsRes.data?.success) setPermissions(permsRes.data.permissions || []);
    } catch {
      setLoadError("We couldn't load role permissions. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const togglePerm = (roleId, permId) => {
    if (!isMainAdmin) return;
    const role = roles.find(r => r.id === roleId);
    if (role?.name === 'main_admin') return;
    setPendingMap(prev => {
      const newSet = new Set(prev[roleId] || []);
      if (newSet.has(permId)) newSet.delete(permId);
      else newSet.add(permId);
      return { ...prev, [roleId]: newSet };
    });
  };

  const handleSave = async (roleId) => {
    setSaving(roleId);
    setAlerts(prev => ({ ...prev, [roleId]: null }));
    try {
      const permIds = Array.from(pendingMap[roleId] || []);
      const res = await roleAPI.updateRolePermissions(roleId, permIds);
      if (res.data?.success) {
        setRolePermsMap(prev => ({ ...prev, [roleId]: new Set(pendingMap[roleId]) }));
        setAlerts(prev => ({ ...prev, [roleId]: { type: 'success', message: 'Permissions updated successfully.' } }));
        setTimeout(() => setAlerts(prev => ({ ...prev, [roleId]: null })), 3000);
      } else {
        setAlerts(prev => ({ ...prev, [roleId]: { type: 'danger', message: res.data?.message || 'We could not save these permissions. Please try again.' } }));
      }
    } catch (e) {
      setAlerts(prev => ({ ...prev, [roleId]: { type: 'danger', message: e.response?.data?.message || 'We could not save these permissions. Please try again.' } }));
    } finally {
      setSaving(null);
    }
  };

  const hasChanges = (roleId) => {
    const orig = rolePermsMap[roleId];
    const pending = pendingMap[roleId];
    if (!orig || !pending) return false;
    if (orig.size !== pending.size) return true;
    for (const id of orig) if (!pending.has(id)) return true;
    return false;
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border" style={{ color: 'var(--color-accent)' }} role="status" />
        <p className="mt-3 mb-0" style={{ color: 'var(--color-text-secondary)' }}>Loading role permissions...</p>
      </div>
    );
  }

  // Filter roles: show all except 'customer' for this view
  const displayRoles = roles.filter(r => r.name !== 'customer');

  return (
    <div>
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="fw-bold mb-1" style={{ color: 'var(--color-text-primary)', fontSize: '1.3rem' }}>Role &amp; Permission Management</h2>
          <p className="mb-0" style={{ color: 'var(--color-text-secondary)', fontSize: '0.88rem' }}>
            {isMainAdmin
              ? 'Toggle permissions per role and save changes. The main_admin role is protected.'
              : 'View-only access. Only the Main Administrator can modify role permissions.'}
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={loadData}>
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {loadError && (
        <div className="alert alert-danger mb-4" role="alert" aria-live="assertive">
          {loadError}
          <button type="button" className="btn btn-sm btn-secondary ms-3" onClick={loadData}>Try again</button>
        </div>
      )}

      {!isMainAdmin && (
        <div className="alert d-flex align-items-center gap-2 mb-4" style={{ background: 'var(--color-secondary)', border: '1px solid #FDE68A', borderRadius: 10, color: '#92400E' }}>
          <Lock size={16} />
          <span style={{ fontSize: '0.88rem' }}>You have view-only access to this section. Contact the Main Administrator to modify role permissions.</span>
        </div>
      )}

      {/* Permission Matrix */}
      {displayRoles.map(role => {
        const isProtected = role.name === 'main_admin';
        const alert = alerts[role.id];
        const changed = hasChanges(role.id);
        const displayName = role.display_name || role.name;

        return (
          <div className="card mb-4" key={role.id} style={{ opacity: isProtected ? 0.85 : 1 }}>
            <div className="card-header">
              <div className="d-flex align-items-center gap-2">
                <ShieldCheck size={18} color={isProtected ? 'var(--color-burgundy-light)' : 'var(--color-accent)'} />
                <span className="card-title" style={{ color: isProtected ? 'var(--color-burgundy-light)' : 'var(--color-text-primary)' }}>
                  {displayName}
                  {isProtected && (
                    <span className="badge ms-2" style={{ background: 'var(--color-secondary)', color: 'var(--color-burgundy-light)', fontSize: '0.72rem' }}>
                      <Lock size={10} style={{ marginRight: 4 }} />System Protected
                    </span>
                  )}
                </span>
              </div>
              {isMainAdmin && !isProtected && (
                <button
                  className="btn btn-sm"
                  onClick={() => handleSave(role.id)}
                  disabled={!changed || saving === role.id}
                  style={{
                    background: changed ? 'var(--color-accent)' : '#E2E8F0',
                    color: changed ? '#FFF' : 'var(--color-text-secondary)',
                    borderRadius: 8,
                  }}
                >
                  {saving === role.id ? (
                    <><span className="spinner-border spinner-border-sm me-1" />Saving...</>
                  ) : (
                    <><Save size={13} style={{ marginRight: 5 }} />Save Changes</>
                  )}
                </button>
              )}
            </div>

            {alert && (
              <div className={`alert alert-${alert.type} py-2 px-3 mb-3`} role={alert.type === 'danger' ? 'alert' : 'status'} aria-live="polite">
                {alert.message}
              </div>
            )}

            <div className="row g-3">
              {permissions.map(perm => {
                const isChecked = (pendingMap[role.id] || new Set()).has(perm.id);
                const canToggleThisRole = isMainAdmin && !isProtected;
                return (
                  <div className="col-md-6 col-lg-4" key={perm.id}>
                    <label
                      className="d-flex align-items-start gap-3 p-3 rounded"
                      style={{
                        border: `1px solid ${isChecked ? 'var(--color-accent)' : 'var(--color-border)'}`,
                        background: isChecked ? 'rgba(23,59,87,0.04)' : 'var(--color-surface-secondary)',
                        borderRadius: 10,
                        cursor: canToggleThisRole ? 'pointer' : 'default',
                        transition: 'all 0.15s',
                      }}
                    >
                      <input
                        type="checkbox"
                        className="form-check-input mt-1"
                        checked={isChecked}
                        onChange={() => togglePerm(role.id, perm.id)}
                        disabled={!canToggleThisRole}
                        style={{ accentColor: 'var(--color-accent)', width: 16, height: 16 }}
                      />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-text-primary)' }}>
                          {perm.display_name || perm.name}
                        </div>
                        <code style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{perm.name}</code>
                        {perm.description && (
                          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>{perm.description}</div>
                        )}
                      </div>
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
