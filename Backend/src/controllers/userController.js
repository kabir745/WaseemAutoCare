const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');

// GET /api/users/me (View own profile)
const getMyProfile = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT u.id, u.role_id, u.full_name, u.email, u.phone, u.is_active, u.is_main_admin, u.created_at,
             r.name AS role, r.display_name AS role_display_name
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = ?
    `, [req.user.id]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User profile not found.' });
    }

    const user = rows[0];
    return res.json({
      success: true,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        role_display_name: user.role_display_name,
        is_active: Boolean(user.is_active),
        is_main_admin: Boolean(user.is_main_admin),
        created_at: user.created_at,
      },
    });
  } catch (error) {
    console.error('[getMyProfile Error]', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch user profile.' });
  }
};

// PUT /api/users/me (Update own profile - full_name & phone only)
const updateMyProfile = async (req, res) => {
  try {
    const { full_name, phone } = req.body;

    if (!full_name || full_name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Full name cannot be empty.',
      });
    }

    // Security Guard: email, role_id, is_active, is_main_admin, and password_hash are completely excluded
    await pool.query(`
      UPDATE users
      SET full_name = ?, phone = ?
      WHERE id = ?
    `, [full_name.trim(), phone ? phone.trim() : null, req.user.id]);

    // Fetch refreshed profile
    const [rows] = await pool.query(`
      SELECT u.id, u.role_id, u.full_name, u.email, u.phone, u.is_active, u.is_main_admin, u.created_at,
             r.name AS role, r.display_name AS role_display_name
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = ?
    `, [req.user.id]);

    const updatedUser = rows[0];

    return res.json({
      success: true,
      message: 'Profile updated successfully.',
      user: {
        id: updatedUser.id,
        full_name: updatedUser.full_name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
        role_display_name: updatedUser.role_display_name,
        is_active: Boolean(updatedUser.is_active),
        is_main_admin: Boolean(updatedUser.is_main_admin),
        created_at: updatedUser.created_at,
      },
    });
  } catch (error) {
    console.error('[updateMyProfile Error]', error);
    return res.status(500).json({ success: false, message: 'Failed to update user profile.' });
  }
};

// GET /api/users (List accounts with filtering)
const getAllUsers = async (req, res) => {
  try {
    const { role, search } = req.query;

    let query = `
      SELECT u.id, u.role_id, u.full_name, u.email, u.phone, u.is_active, u.is_main_admin, u.created_at,
             r.name AS role, r.display_name AS role_display_name
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE 1=1
    `;
    const params = [];

    if (role && role !== 'all') {
      query += ' AND r.name = ?';
      params.push(role);
    }

    if (search && search.trim()) {
      query += ' AND (u.full_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    query += ' ORDER BY u.created_at DESC';

    const [rows] = await pool.query(query, params);

    const users = rows.map((u) => ({
      id: u.id,
      full_name: u.full_name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      role_display_name: u.role_display_name,
      is_active: Boolean(u.is_active),
      is_main_admin: Boolean(u.is_main_admin),
      created_at: u.created_at,
    }));

    return res.json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    console.error('[getAllUsers Error]', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch accounts.' });
  }
};

// POST /api/users (Create Admin or Staff Account)
const createUser = async (req, res) => {
  try {
    const { full_name, email, password, phone, role_id } = req.body;

    if (!full_name || !email || !password || !role_id) {
      return res.status(400).json({
        success: false,
        message: 'Full name, email, password, and role are required.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters.',
      });
    }

    // Verify role exists
    const [roleRows] = await pool.query('SELECT id, name, display_name FROM roles WHERE id = ?', [role_id]);
    if (roleRows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid role selected.' });
    }

    const targetRole = roleRows[0];

    // Main Admin Safeguard: Cannot create another main_admin account via API
    if (targetRole.name === 'main_admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot create additional Main Admin accounts via API.',
      });
    }

    // Role Creation Permission Checks:
    // Only Main Admin can create Admin accounts
    if (targetRole.name === 'admin' && !req.user.permissions.includes('users.create_admin')) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only the Main Admin is authorized to create Administrator accounts.',
      });
    }

    // Ordinary Admins can only create Staff accounts
    if (targetRole.name === 'staff' && !req.user.permissions.includes('users.create_staff')) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Missing permission to create staff accounts.',
      });
    }

    // Check email uniqueness
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.',
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [result] = await pool.query(`
      INSERT INTO users (role_id, full_name, email, phone, password_hash, is_active, is_main_admin)
      VALUES (?, ?, ?, ?, ?, TRUE, FALSE)
    `, [targetRole.id, full_name.trim(), email.toLowerCase().trim(), phone ? phone.trim() : null, passwordHash]);

    return res.status(201).json({
      success: true,
      message: `${targetRole.display_name} account created successfully.`,
      user: {
        id: result.insertId,
        full_name: full_name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone ? phone.trim() : null,
        role: targetRole.name,
        role_display_name: targetRole.display_name,
        is_active: true,
        is_main_admin: false,
      },
    });
  } catch (error) {
    console.error('[createUser Error]', error);
    return res.status(500).json({ success: false, message: 'Failed to create user account.' });
  }
};

// PATCH /api/users/:id/status (Toggle Account Active Status)
const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    if (typeof is_active !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'is_active boolean field (true/false) is required.',
      });
    }

    const [targetRows] = await pool.query('SELECT id, full_name, is_main_admin FROM users WHERE id = ?', [id]);
    if (targetRows.length === 0) {
      return res.status(404).json({ success: false, message: 'User account not found.' });
    }

    const targetUser = targetRows[0];

    // Safeguard 1: Main Admin cannot be deactivated
    if (targetUser.is_main_admin) {
      return res.status(403).json({
        success: false,
        message: 'Security Violation: The Main Admin account can never be deactivated.',
      });
    }

    // Safeguard 2: Cannot deactivate own account
    if (targetUser.id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own account.',
      });
    }

    await pool.query('UPDATE users SET is_active = ? WHERE id = ?', [is_active, id]);

    return res.json({
      success: true,
      message: `Account for ${targetUser.full_name} has been ${is_active ? 'activated' : 'deactivated'}.`,
      is_active,
    });
  } catch (error) {
    console.error('[toggleUserStatus Error]', error);
    return res.status(500).json({ success: false, message: 'Failed to update account status.' });
  }
};

// GET /api/users/dashboard-stats (Calculated from real DB counts)
const getDashboardStats = async (req, res) => {
  try {
    const [customerCount] = await pool.query(`
      SELECT COUNT(*) AS count FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE r.name = 'customer'
    `);

    const [staffCount] = await pool.query(`
      SELECT COUNT(*) AS count FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE r.name = 'staff'
    `);

    const [adminCount] = await pool.query(`
      SELECT COUNT(*) AS count FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE r.name IN ('admin', 'main_admin')
    `);

    const [activeCount] = await pool.query(`
      SELECT COUNT(*) AS count FROM users WHERE is_active = TRUE
    `);

    return res.json({
      success: true,
      stats: {
        total_customers: customerCount[0].count,
        total_staff: staffCount[0].count,
        total_admins: adminCount[0].count,
        active_accounts: activeCount[0].count,
        totalCustomers: customerCount[0].count,
        totalStaff: staffCount[0].count,
        totalAdmins: adminCount[0].count,
        activeAccounts: activeCount[0].count,
      },
    });
  } catch (error) {
    console.error('[getDashboardStats Error]', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch dashboard statistics.' });
  }
};

module.exports = {
  getMyProfile,
  updateMyProfile,
  getAllUsers,
  createUser,
  toggleUserStatus,
  getDashboardStats,
};
