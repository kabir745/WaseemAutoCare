const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendOTPEmail } = require('../services/emailService');

// Helper to generate a 6-digit numeric OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      is_main_admin: Boolean(user.is_main_admin),
    },
    process.env.JWT_SECRET || 'wac_jwt_super_secret_key_2026_xyz123',
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};

// ==========================================
// 1. LOGIN (Step 1: Credentials -> Email 2FA OTP)
// ==========================================
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
    }

    const [rows] = await pool.query(`
      SELECT u.id, u.role_id, u.full_name, u.email, u.phone, u.password_hash, u.is_active, u.is_main_admin,
             r.name AS role_name, r.display_name AS role_display_name
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.email = ?
    `, [email.toLowerCase().trim()]);

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const user = rows[0];

    // Check account status
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact the administrator.',
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Main Admin: Direct login bypass (no 2FA requirement for Main Admin)
    if (user.is_main_admin || user.role_name === 'main_admin') {
      const [permRows] = await pool.query(`
        SELECT p.name
        FROM role_permissions rp
        JOIN permissions p ON rp.permission_id = p.id
        WHERE rp.role_id = ?
      `, [user.role_id]);

      const permissions = permRows.map((p) => p.name);

      const userPayload = {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        role: user.role_name,
        role_display_name: user.role_display_name,
        is_main_admin: true,
        permissions,
      };

      const token = generateToken(userPayload);

      return res.json({
        success: true,
        message: 'Login successful.',
        token,
        user: userPayload,
      });
    }

    // 2FA Flow (for staff and users requiring two-step verification)
    await pool.query(
      `UPDATE otps SET is_used = TRUE WHERE email = ? AND purpose = 'LOGIN' AND is_used = FALSE`,
      [user.email]
    );

    // Generate new 6-digit OTP
    const otpCode = generateOTP();

    // Store OTP in database with 10-minute expiry
    await pool.query(`
      INSERT INTO otps (user_id, email, otp_code, purpose, expires_at)
      VALUES (?, ?, ?, 'LOGIN', DATE_ADD(NOW(), INTERVAL 10 MINUTE))
    `, [user.id, user.email, otpCode]);

    // Send OTP via Email
    await sendOTPEmail({
      to: user.email,
      otp: otpCode,
      purpose: 'LOGIN',
      userName: user.full_name,
    });

    return res.json({
      success: true,
      require_2fa: true,
      message: 'A verification code has been sent to your email.',
      email: user.email,
      role: user.role_name,
      debug_otp: process.env.DEBUG_OTP === 'true' ? otpCode : undefined,
    });
  } catch (error) {
    console.error('[Login Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during login.',
    });
  }
};

// ==========================================
// 2. VERIFY LOGIN 2FA OTP (Step 2: OTP -> JWT)
// ==========================================
const verifyLoginOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and 6-digit verification code are required.',
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanOTP = otp.toString().trim();

    // Find latest unused OTP for LOGIN
    const [otpRows] = await pool.query(`
      SELECT id, user_id, otp_code, expires_at, is_used
      FROM otps
      WHERE email = ? AND purpose = 'LOGIN' AND is_used = FALSE
      ORDER BY id DESC LIMIT 1
    `, [cleanEmail]);

    if (otpRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No active verification code found for this email. Please request a new code.',
      });
    }

    const otpRecord = otpRows[0];

    // Check expiration
    if (new Date() > new Date(otpRecord.expires_at)) {
      await pool.query('UPDATE otps SET is_used = TRUE WHERE id = ?', [otpRecord.id]);
      return res.status(400).json({
        success: false,
        message: 'Verification code has expired. Please request a new code.',
      });
    }

    // Check code match
    if (otpRecord.otp_code !== cleanOTP) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code. Please check your email and try again.',
      });
    }

    // Mark OTP as used
    await pool.query('UPDATE otps SET is_used = TRUE, used_at = NOW() WHERE id = ?', [otpRecord.id]);

    // Fetch user details & live permissions
    const [userRows] = await pool.query(`
      SELECT u.id, u.role_id, u.full_name, u.email, u.phone, u.is_active, u.is_main_admin,
             r.name AS role_name, r.display_name AS role_display_name
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = ?
    `, [otpRecord.user_id]);

    if (userRows.length === 0 || !userRows[0].is_active) {
      return res.status(403).json({
        success: false,
        message: 'Account is inactive or not found.',
      });
    }

    const user = userRows[0];

    // Live permissions lookup
    const [permRows] = await pool.query(`
      SELECT p.name
      FROM role_permissions rp
      JOIN permissions p ON rp.permission_id = p.id
      WHERE rp.role_id = ?
    `, [user.role_id]);

    const permissions = permRows.map((p) => p.name);

    const userPayload = {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      role: user.role_name,
      role_display_name: user.role_display_name,
      is_main_admin: Boolean(user.is_main_admin),
      permissions,
    };

    const token = generateToken(userPayload);

    return res.json({
      success: true,
      message: 'Two-factor authentication verified successfully. Welcome!',
      token,
      user: userPayload,
    });
  } catch (error) {
    console.error('[Verify Login OTP Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error verifying 2FA code.',
    });
  }
};

// ==========================================
// 3. SIGNUP (Step 1: Details -> Email OTP)
// ==========================================
const register = async (req, res) => {
  try {
    const { full_name, email, password, phone } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Full name, email, and password are required.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.',
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.',
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check email uniqueness
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.',
      });
    }

    // Invalidate prior unused SIGNUP OTPs
    await pool.query(
      `UPDATE otps SET is_used = TRUE WHERE email = ? AND purpose = 'SIGNUP' AND is_used = FALSE`,
      [cleanEmail]
    );

    const passwordHash = await bcrypt.hash(password, 10);
    const otpCode = generateOTP();

    const metadata = JSON.stringify({
      full_name: full_name.trim(),
      phone: phone ? phone.trim() : null,
      password_hash: passwordHash,
    });

    // Store in otps with 10-minute expiry
    await pool.query(`
      INSERT INTO otps (user_id, email, otp_code, purpose, metadata, expires_at)
      VALUES (NULL, ?, ?, 'SIGNUP', ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))
    `, [cleanEmail, otpCode, metadata]);

    // Send verification email
    await sendOTPEmail({
      to: cleanEmail,
      otp: otpCode,
      purpose: 'SIGNUP',
      userName: full_name.trim(),
    });

    return res.status(200).json({
      success: true,
      require_2fa: true,
      message: 'Verification code sent to your email. Please verify to complete account registration.',
      email: cleanEmail,
      debug_otp: process.env.DEBUG_OTP === 'true' ? otpCode : undefined,
    });
  } catch (error) {
    console.error('[Register Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during registration.',
    });
  }
};

// ==========================================
// 4. VERIFY SIGNUP OTP (Step 2: Create Account -> JWT)
// ==========================================
const verifySignupOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and verification code are required.',
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanOTP = otp.toString().trim();

    const [otpRows] = await pool.query(`
      SELECT id, otp_code, metadata, expires_at, is_used
      FROM otps
      WHERE email = ? AND purpose = 'SIGNUP' AND is_used = FALSE
      ORDER BY id DESC LIMIT 1
    `, [cleanEmail]);

    if (otpRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No active registration verification code found. Please submit your registration details again.',
      });
    }

    const otpRecord = otpRows[0];

    // Check expiration
    if (new Date() > new Date(otpRecord.expires_at)) {
      await pool.query('UPDATE otps SET is_used = TRUE WHERE id = ?', [otpRecord.id]);
      return res.status(400).json({
        success: false,
        message: 'Verification code has expired. Please register again.',
      });
    }

    // Check code match
    if (otpRecord.otp_code !== cleanOTP) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code. Please check your email and try again.',
      });
    }

    // Mark OTP used
    await pool.query('UPDATE otps SET is_used = TRUE, used_at = NOW() WHERE id = ?', [otpRecord.id]);

    // Parse metadata
    const metadata = typeof otpRecord.metadata === 'string'
      ? JSON.parse(otpRecord.metadata)
      : otpRecord.metadata;

    // Resolve customer role
    const [customerRole] = await pool.query("SELECT id, name, display_name FROM roles WHERE name = 'customer'");
    if (customerRole.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'Server error: Customer role not configured.',
      });
    }

    const roleId = customerRole[0].id;

    // Check if user was registered in the meantime
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address has already been created.',
      });
    }

    // Insert user
    const [insertResult] = await pool.query(`
      INSERT INTO users (role_id, full_name, email, phone, password_hash, is_active, is_main_admin)
      VALUES (?, ?, ?, ?, ?, TRUE, FALSE)
    `, [roleId, metadata.full_name, cleanEmail, metadata.phone || null, metadata.password_hash]);

    const newUserId = insertResult.insertId;

    // Link user_id to the OTP record
    await pool.query('UPDATE otps SET user_id = ? WHERE id = ?', [newUserId, otpRecord.id]);

    const newUser = {
      id: newUserId,
      full_name: metadata.full_name,
      email: cleanEmail,
      phone: metadata.phone || null,
      role: customerRole[0].name,
      role_display_name: customerRole[0].display_name,
      is_main_admin: false,
      permissions: ['profile.manage'],
    };

    const token = generateToken(newUser);

    return res.status(201).json({
      success: true,
      message: 'Email verified and account registered successfully.',
      token,
      user: newUser,
    });
  } catch (error) {
    console.error('[Verify Signup OTP Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error verifying registration.',
    });
  }
};

// ==========================================
// 5. FORGOT PASSWORD (Send Reset OTP)
// ==========================================
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required.',
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    const [userRows] = await pool.query(`
      SELECT id, full_name, email, is_active FROM users WHERE email = ?
    `, [cleanEmail]);

    if (userRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email address.',
      });
    }

    const user = userRows[0];

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'This account has been deactivated. Please contact the administrator.',
      });
    }

    // Invalidate previous RESET_PASSWORD OTPs
    await pool.query(
      `UPDATE otps SET is_used = TRUE WHERE email = ? AND purpose = 'RESET_PASSWORD' AND is_used = FALSE`,
      [cleanEmail]
    );

    const otpCode = generateOTP();

    // Store in otps with 10-minute expiry
    await pool.query(`
      INSERT INTO otps (user_id, email, otp_code, purpose, expires_at)
      VALUES (?, ?, ?, 'RESET_PASSWORD', DATE_ADD(NOW(), INTERVAL 10 MINUTE))
    `, [user.id, cleanEmail, otpCode]);

    // Send email
    await sendOTPEmail({
      to: cleanEmail,
      otp: otpCode,
      purpose: 'RESET_PASSWORD',
      userName: user.full_name,
    });

    return res.json({
      success: true,
      message: 'Password reset code has been sent to your email.',
      email: cleanEmail,
      debug_otp: process.env.DEBUG_OTP === 'true' ? otpCode : undefined,
    });
  } catch (error) {
    console.error('[Forgot Password Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error sending password reset code.',
    });
  }
};

// ==========================================
// 6. RESET PASSWORD (Verify OTP & Update Password)
// ==========================================
const resetPassword = async (req, res) => {
  try {
    const { email, otp, new_password } = req.body;

    if (!email || !otp || !new_password) {
      return res.status(400).json({
        success: false,
        message: 'Email, verification code, and new password are required.',
      });
    }

    if (new_password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long.',
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanOTP = otp.toString().trim();

    // Find latest unused RESET_PASSWORD OTP
    const [otpRows] = await pool.query(`
      SELECT id, user_id, otp_code, expires_at, is_used
      FROM otps
      WHERE email = ? AND purpose = 'RESET_PASSWORD' AND is_used = FALSE
      ORDER BY id DESC LIMIT 1
    `, [cleanEmail]);

    if (otpRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No active password reset code found. Please request a new one.',
      });
    }

    const otpRecord = otpRows[0];

    // Check expiry
    if (new Date() > new Date(otpRecord.expires_at)) {
      await pool.query('UPDATE otps SET is_used = TRUE WHERE id = ?', [otpRecord.id]);
      return res.status(400).json({
        success: false,
        message: 'Verification code has expired. Please request a new reset code.',
      });
    }

    // Check code match
    if (otpRecord.otp_code !== cleanOTP) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code. Please check your email and try again.',
      });
    }

    // Mark OTP used
    await pool.query('UPDATE otps SET is_used = TRUE, used_at = NOW() WHERE id = ?', [otpRecord.id]);

    // Hash new password and update user
    const passwordHash = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE users SET password_hash = ? WHERE email = ?', [passwordHash, cleanEmail]);

    return res.json({
      success: true,
      message: 'Password has been reset successfully. You can now sign in with your new password.',
    });
  } catch (error) {
    console.error('[Reset Password Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error resetting password.',
    });
  }
};

// ==========================================
// 7. RESEND OTP (Generic for LOGIN, SIGNUP, RESET_PASSWORD)
// ==========================================
const resendOTP = async (req, res) => {
  try {
    const { email, purpose } = req.body;

    if (!email || !purpose) {
      return res.status(400).json({
        success: false,
        message: 'Email and purpose (LOGIN, SIGNUP, RESET_PASSWORD) are required.',
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanPurpose = purpose.toUpperCase().trim();

    if (!['LOGIN', 'SIGNUP', 'RESET_PASSWORD'].includes(cleanPurpose)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid purpose. Must be LOGIN, SIGNUP, or RESET_PASSWORD.',
      });
    }

    let userId = null;
    let userName = null;
    let metadata = null;

    if (cleanPurpose === 'LOGIN' || cleanPurpose === 'RESET_PASSWORD') {
      const [userRows] = await pool.query('SELECT id, full_name, is_active FROM users WHERE email = ?', [cleanEmail]);
      if (userRows.length === 0) {
        return res.status(404).json({ success: false, message: 'Account not found.' });
      }
      if (!userRows[0].is_active) {
        return res.status(403).json({ success: false, message: 'Account is deactivated.' });
      }
      userId = userRows[0].id;
      userName = userRows[0].full_name;
    } else if (cleanPurpose === 'SIGNUP') {
      // Find existing signup metadata from previous attempt
      const [priorRows] = await pool.query(`
        SELECT metadata FROM otps WHERE email = ? AND purpose = 'SIGNUP' ORDER BY id DESC LIMIT 1
      `, [cleanEmail]);
      if (priorRows.length === 0) {
        return res.status(400).json({ success: false, message: 'No registration in progress found for this email.' });
      }
      metadata = priorRows[0].metadata;
      try {
        const parsed = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
        userName = parsed?.full_name;
      } catch (e) {}
    }

    // Invalidate existing unused OTPs
    await pool.query(
      'UPDATE otps SET is_used = TRUE WHERE email = ? AND purpose = ? AND is_used = FALSE',
      [cleanEmail, cleanPurpose]
    );

    const otpCode = generateOTP();

    // Insert new record
    await pool.query(`
      INSERT INTO otps (user_id, email, otp_code, purpose, metadata, expires_at)
      VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))
    `, [userId, cleanEmail, otpCode, cleanPurpose, metadata]);

    // Send email
    await sendOTPEmail({
      to: cleanEmail,
      otp: otpCode,
      purpose: cleanPurpose,
      userName,
    });

    return res.json({
      success: true,
      message: 'A fresh verification code has been sent to your email.',
      email: cleanEmail,
      debug_otp: process.env.DEBUG_OTP === 'true' ? otpCode : undefined,
    });
  } catch (error) {
    console.error('[Resend OTP Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error resending verification code.',
    });
  }
};

// ==========================================
// 8. LOGOUT & GET CURRENT USER
// ==========================================
const logout = (req, res) => {
  return res.json({
    success: true,
    message: 'Logged out successfully. Please remove the authentication token from client storage.',
  });
};

const getMe = (req, res) => {
  return res.json({
    success: true,
    user: req.user,
  });
};

module.exports = {
  login,
  verifyLoginOTP,
  register,
  verifySignupOTP,
  forgotPassword,
  resetPassword,
  resendOTP,
  logout,
  getMe,
};
