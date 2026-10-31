const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middlewares/authMiddleware');

// 2FA Login Flow
router.post('/login', authController.login);
router.post('/verify-login-otp', authController.verifyLoginOTP);

// 2FA Signup Flow
router.post('/register', authController.register);
router.post('/verify-signup-otp', authController.verifySignupOTP);

// Password Reset Flow
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Generic Resend OTP
router.post('/resend-otp', authController.resendOTP);

// Session Endpoints
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.getMe);

module.exports = router;
