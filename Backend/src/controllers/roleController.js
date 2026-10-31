const { pool } = require('../config/db');

// GET /api/roles (Get all roles with their assigned permissions)
const getAllRoles = async (req, res) => {
  try {
    const [roles] = await pool.query(`
      SELECT id, name, display_name, description, is_system_role
      FROM roles
      ORDER BY id ASC
    `);

    const [rolePerms] = await pool.query(`
      SELECT rp.role_id, p.id AS permission_id, p.name AS permission_name, p.module, p.description
      FROM role_permissions rp
      JOIN permissions p ON rp.permission_id = p.id
    `);

    // Group permissions by role
    const permMap = {};
    rolePerms.forEach((rp) => {
      if (!permMap[rp.role_id]) permMap[rp.role_id] = [];
      permMap[rp.role_id].push({
        id: rp.permission_id,
        name: rp.permission_name,
        module: rp.module,
        description: rp.description,
      });
    });

    const result = roles.map((r) => ({
      ...r,
      is_system_role: Boolean(r.is_system_role),
      permissions: permMap[r.id] || [],
    }));

    return res.json({
      success: true,
      roles: result,
    });
  } catch (error) {
    console.error('[getAllRoles Error]', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch roles.' });
  }
};

// GET /api/roles/permissions (Get all available permissions)
const getAllPermissions = async (req, res) => {
  try {
    const [permissions] = await pool.query(`
      SELECT id, name, module, description
      FROM permissions
      ORDER BY module ASC, id ASC
    `);

    return res.json({
      success: true,
      permissions,
    });
  } catch (error) {
    console.error('[getAllPermissions Error]', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch permissions.' });
  }
};

// PUT /api/roles/:id/permissions (Update role-permission assignments - Main Admin only)
const updateRolePermissions = async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    const { permission_ids } = req.body;

    if (!Array.isArray(permission_ids)) {
      return res.status(400).json({
        success: false,
        message: 'permission_ids must be an array of permission IDs.',
      });
    }

    const [roleRows] = await pool.query('SELECT id, name, is_system_role FROM roles WHERE id = ?', [id]);
    if (roleRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Role not found.' });
    }

    const role = roleRows[0];

    // Safeguard: Cannot alter permissions of main_admin
    if (role.name === 'main_admin') {
      return res.status(403).json({
        success: false,
        message: 'Security Violation: System permissions for Main Admin cannot be modified.',
      });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Remove existing assignments
    await connection.query('DELETE FROM role_permissions WHERE role_id = ?', [id]);

    // Insert new assignments
    if (permission_ids.length > 0) {
      const values = permission_ids.map((pid) => [id, pid]);
      await connection.query(
        'INSERT INTO role_permissions (role_id, permission_id) VALUES ?',
        [values]
      );
    }

    await connection.commit();

    return res.json({
      success: true,
      message: `Permissions updated successfully for role '${role.name}'.`,
      role_id: Number(id),
      permission_ids,
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('[updateRolePermissions Error]', error);
    return res.status(500).json({ success: false, message: 'Failed to update role permissions.' });
  } finally {
    if (connection) connection.release();
  }
};

module.exports = {
  getAllRoles,
  getAllPermissions,
  updateRolePermissions,
};
