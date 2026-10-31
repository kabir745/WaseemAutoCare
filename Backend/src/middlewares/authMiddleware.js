const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

/**
 * Authentication Middleware:
 * Verifies the JWT, checks that the user still exists in the DB,
 * ensures the account is active, and loads live role & permission set.
 */
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No authentication token provided.',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'wac_jwt_super_secret_key_2026_xyz123');

    // Live Database Check
    const [userRows] = await pool.query(`
      SELECT u.id, u.role_id, u.full_name, u.email, u.phone, u.is_active, u.is_main_admin,
             r.name AS role_name, r.display_name AS role_display_name, r.is_system_role
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = ?
    `, [decoded.id]);

    if (userRows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User account no longer exists.',
      });
    }

    const user = userRows[0];

    // Inactive account check
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Access denied.',
      });
    }

    // Live permissions lookup from database
    const [permRows] = await pool.query(`
      SELECT p.name
      FROM role_permissions rp
      JOIN permissions p ON rp.permission_id = p.id
      WHERE rp.role_id = ?
    `, [user.role_id]);

    const permissions = permRows.map((row) => row.name);

    req.user = {
      id: user.id,
      role_id: user.role_id,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      is_active: Boolean(user.is_active),
      is_main_admin: Boolean(user.is_main_admin),
      role: user.role_name,
      role_display_name: user.role_display_name,
      permissions,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token.',
    });
  }
};

/**
 * Authorize by Permission Key:
 * Verifies that the authenticated user currently holds the required permission in the DB.
 */
const authorizePermission = (permissionName) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized.',
      });
    }

    if (!req.user.permissions.includes(permissionName)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Missing required permission '${permissionName}'.`,
      });
    }

    next();
  };
};

/**
 * Require Main Admin Guard:
 * Strict safeguard requiring is_main_admin = TRUE.
 */
const requireMainAdmin = (req, res, next) => {
  if (!req.user || !req.user.is_main_admin) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Main Admin authority required.',
    });
  }
  next();
};

module.exports = {
  authenticate,
  authorizePermission,
  requireMainAdmin,
};
