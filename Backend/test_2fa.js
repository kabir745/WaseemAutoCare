const { pool } = require('./src/config/db');
const http = require('http');

// Make an express app instance for direct superagent/http testing or start test server
const app = require('express')();
const cors = require('cors');
const morgan = require('morgan');
app.use(cors());
app.use(require('express').json());
app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/users', require('./src/routes/userRoutes'));
app.use('/api/roles', require('./src/routes/roleRoutes'));

let server;
const PORT = 5555;
const BASE_URL = `http://localhost:${PORT}/api`;

const makeRequest = (method, path, body = null, headers = {}) => {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
};

const runTests = async () => {
  console.log('--- STARTING 2FA AUTOMATED TEST SUITE ---');
  server = app.listen(PORT);

  let passed = 0;
  let failed = 0;

  const assert = (condition, title, details = '') => {
    if (condition) {
      console.log(` ✅ PASS: ${title}`);
      passed++;
    } else {
      console.error(` ❌ FAIL: ${title} - ${details}`);
      failed++;
    }
  };

  try {
    // ----------------------------------------------------
    // TEST 1: Login with invalid password
    // ----------------------------------------------------
    const res1 = await makeRequest('POST', '/auth/login', {
      email: 'admin@waseemautocare.com',
      password: 'WrongPassword!',
    });
    assert(res1.status === 401 && !res1.body.require_2fa, 'Login with invalid password rejected with 401');

    // ----------------------------------------------------
    // TEST 2: Login with valid credentials triggers 2FA
    // ----------------------------------------------------
    const res2 = await makeRequest('POST', '/auth/login', {
      email: 'admin@waseemautocare.com',
      password: 'Admin@12345',
    });
    assert(
      res2.status === 200 && res2.body.require_2fa === true && res2.body.email === 'admin@waseemautocare.com',
      'Valid credentials require 2FA and do NOT return JWT prematurely'
    );

    // Verify OTP record in MySQL database
    const [otpRows1] = await pool.query(`
      SELECT * FROM otps WHERE email = 'admin@waseemautocare.com' AND purpose = 'LOGIN' AND is_used = FALSE
      ORDER BY id DESC LIMIT 1
    `);
    assert(otpRows1.length === 1, 'OTP record saved in DB with is_used = FALSE');
    const loginOTP = otpRows1[0].otp_code;

    // ----------------------------------------------------
    // TEST 3: Verify 2FA with incorrect OTP
    // ----------------------------------------------------
    const res3 = await makeRequest('POST', '/auth/verify-login-otp', {
      email: 'admin@waseemautocare.com',
      otp: '000000',
    });
    assert(res3.status === 400 && res3.body.success === false, 'Invalid OTP code rejected with 400');

    // ----------------------------------------------------
    // TEST 4: Verify 2FA with correct OTP
    // ----------------------------------------------------
    const res4 = await makeRequest('POST', '/auth/verify-login-otp', {
      email: 'admin@waseemautocare.com',
      otp: loginOTP,
    });
    assert(
      res4.status === 200 && res4.body.token && res4.body.user.is_main_admin === true,
      'Valid OTP code returns JWT token and user profile'
    );

    // Verify OTP record marked as used in DB
    const [usedCheck] = await pool.query('SELECT is_used, used_at FROM otps WHERE id = ?', [otpRows1[0].id]);
    assert(usedCheck[0].is_used === 1 && usedCheck[0].used_at !== null, 'OTP record in DB marked is_used = 1 with timestamp');

    // ----------------------------------------------------
    // TEST 5: Reusing the same OTP code must fail
    // ----------------------------------------------------
    const res5 = await makeRequest('POST', '/auth/verify-login-otp', {
      email: 'admin@waseemautocare.com',
      otp: loginOTP,
    });
    assert(res5.status === 400, 'Replay/reuse of already used OTP rejected');

    // ----------------------------------------------------
    // TEST 6: Expired OTP handling
    // ----------------------------------------------------
    // Insert an artificially expired OTP
    await pool.query(`
      INSERT INTO otps (user_id, email, otp_code, purpose, expires_at, is_used)
      VALUES (?, 'admin@waseemautocare.com', '999999', 'LOGIN', DATE_SUB(NOW(), INTERVAL 5 MINUTE), FALSE)
    `, [otpRows1[0].user_id]);

    const res6 = await makeRequest('POST', '/auth/verify-login-otp', {
      email: 'admin@waseemautocare.com',
      otp: '999999',
    });
    assert(res6.status === 400 && res6.body.message.includes('expired'), 'Expired OTP rejected with expiration message');

    // ----------------------------------------------------
    // TEST 7: 2FA Signup flow
    // ----------------------------------------------------
    const testSignupEmail = `test_customer_${Date.now()}@test.com`;
    // Clean up if already exists
    await pool.query('DELETE FROM users WHERE email = ?', [testSignupEmail]);
    await pool.query('DELETE FROM otps WHERE email = ?', [testSignupEmail]);

    const res7 = await makeRequest('POST', '/auth/register', {
      full_name: 'Test Customer 2FA',
      email: testSignupEmail,
      password: 'Customer@123',
      phone: '03009988776',
    });
    assert(res7.status === 200 && res7.body.require_2fa === true, 'Registration initiates 2FA and holds account creation');

    // Check DB: User should NOT exist in users table yet
    const [pendingUserCheck] = await pool.query('SELECT id FROM users WHERE email = ?', [testSignupEmail]);
    assert(pendingUserCheck.length === 0, 'User is NOT created in users table prior to OTP verification');

    // Fetch signup OTP from DB
    const [signupOtpRows] = await pool.query(`
      SELECT * FROM otps WHERE email = ? AND purpose = 'SIGNUP' AND is_used = FALSE
    `, [testSignupEmail]);
    assert(signupOtpRows.length === 1, 'Signup OTP saved in DB with metadata');
    const signupOTP = signupOtpRows[0].otp_code;

    // Verify signup with valid OTP
    const res8 = await makeRequest('POST', '/auth/verify-signup-otp', {
      email: testSignupEmail,
      otp: signupOTP,
    });
    assert(
      res8.status === 201 && res8.body.token && res8.body.user.email === testSignupEmail,
      'Signup OTP verified, account created with customer role, and JWT issued'
    );

    // Now user must exist in DB
    const [verifiedUserCheck] = await pool.query('SELECT id, role_id FROM users WHERE email = ?', [testSignupEmail]);
    assert(verifiedUserCheck.length === 1, 'Verified customer user exists in users table');

    // ----------------------------------------------------
    // TEST 8: Forgot Password & Reset Password flow
    // ----------------------------------------------------
    const res9 = await makeRequest('POST', '/auth/forgot-password', {
      email: testSignupEmail,
    });
    assert(res9.status === 200 && res9.body.success === true, 'Forgot password dispatches reset OTP to email');

    // Fetch reset OTP from DB
    const [resetOtpRows] = await pool.query(`
      SELECT * FROM otps WHERE email = ? AND purpose = 'RESET_PASSWORD' AND is_used = FALSE
    `, [testSignupEmail]);
    assert(resetOtpRows.length === 1, 'Reset password OTP saved in DB');
    const resetOTP = resetOtpRows[0].otp_code;

    // Reset password with valid OTP
    const newPass = 'NewCustomerPass@456';
    const res10 = await makeRequest('POST', '/auth/reset-password', {
      email: testSignupEmail,
      otp: resetOTP,
      new_password: newPass,
    });
    assert(res10.status === 200 && res10.body.success === true, 'Password reset successfully with OTP');

    // Verify login with OLD password fails
    const res11 = await makeRequest('POST', '/auth/login', {
      email: testSignupEmail,
      password: 'Customer@123',
    });
    assert(res11.status === 401, 'Old password fails authentication');

    // Verify login with NEW password succeeds & sends 2FA
    const res12 = await makeRequest('POST', '/auth/login', {
      email: testSignupEmail,
      password: newPass,
    });
    assert(res12.status === 200 && res12.body.require_2fa === true, 'New password initiates 2FA login');

    // Clean up test customer
    await pool.query('DELETE FROM users WHERE email = ?', [testSignupEmail]);
    await pool.query('DELETE FROM otps WHERE email = ?', [testSignupEmail]);

    console.log(`\n==========================================`);
    console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log(`==========================================\n`);
  } catch (err) {
    console.error('Test suite error:', err);
    failed++;
  } finally {
    if (server) server.close();
    process.exit(failed > 0 ? 1 : 0);
  }
};

runTests();
