import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import Logo from '../components/Logo';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  X,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const navigate = useNavigate();
  const { login, verify2FA, resendLoginOTP, isAuthenticated } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Views: 'SIGNIN' | '2FA' | 'FORGOT_REQUEST' | 'FORGOT_RESET'
  const [view, setView] = useState('SIGNIN');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // 2FA state
  const [otp, setOtp] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  // Recovery states
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Loading & Custom Toast
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, type: '', message: '' });

  const showToast = (type, message) => {
    setToast({ show: true, type, message });
  };

  const closeToast = () => {
    setToast({ show: false, type: '', message: '' });
  };

  // Auto-dismiss toast
  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        setToast({ show: false, type: '', message: '' });
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Resend cooldown countdown
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setInterval(() => setResendTimer((t) => t - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [resendTimer]);

  // ----------------------------------------------------
  // SUBMIT: SIGN IN
  // ----------------------------------------------------
  const handleSignIn = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      showToast('error', 'Enter your email address to continue.');
      return;
    }
    if (!EMAIL_PATTERN.test(email.trim())) {
      showToast('error', 'Enter a valid email address, such as name@example.com.');
      return;
    }
    if (!password) {
      showToast('error', 'Enter your password to continue.');
      return;
    }

    setLoading(true);
    closeToast();

    const result = await login(email.trim(), password);
    setLoading(false);

    if (!result.success) {
      showToast('error', result.message || 'Invalid credentials.');
    } else if (result.require_2fa) {
      setView('2FA');
      setOtp('');
      setResendTimer(30);
      showToast('success', 'Security code sent to your email.');
    } else {
      // Direct login successful (Main Admin)
      navigate('/', { replace: true });
    }
  };

  // ----------------------------------------------------
  // SUBMIT: 2FA VERIFY
  // ----------------------------------------------------
  const handleVerify2FA = async (e) => {
    e.preventDefault();
    if (!otp.trim() || otp.trim().length !== 6) {
      showToast('error', 'Enter the complete 6-digit code.');
      return;
    }

    setLoading(true);
    closeToast();

    const result = await verify2FA(email.trim(), otp.trim());
    setLoading(false);

    if (!result.success) {
      showToast('error', result.message || 'Invalid code.');
    } else {
      navigate('/', { replace: true });
    }
  };

  const handleResend2FA = async () => {
    if (resendTimer > 0 || loading) return;
    setLoading(true);
    const result = await resendLoginOTP(email.trim());
    setLoading(false);
    if (result.success) {
      setResendTimer(30);
      showToast('success', 'A new code has been sent.');
    } else {
      showToast('error', result.message || 'Failed to resend code.');
    }
  };

  // ----------------------------------------------------
  // SUBMIT: FORGOT PASSWORD
  // ----------------------------------------------------
  const handleForgotRequest = async (e) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      showToast('error', 'Enter your registered email address.');
      return;
    }
    if (!EMAIL_PATTERN.test(forgotEmail.trim())) {
      showToast('error', 'Enter a valid email address, such as name@example.com.');
      return;
    }

    setLoading(true);
    closeToast();

    try {
      const res = await authAPI.forgotPassword({ email: forgotEmail.trim() });
      setLoading(false);
      if (res.data?.success) {
        setView('FORGOT_RESET');
        showToast('success', 'Recovery code sent to your email.');
      } else {
        showToast('error', res.data?.message || 'Email not found.');
      }
    } catch (err) {
      setLoading(false);
      showToast('error', err.response?.data?.message || 'Could not find an account with this email.');
    }
  };

  // ----------------------------------------------------
  // SUBMIT: RESET PASSWORD
  // ----------------------------------------------------
  const handleForgotReset = async (e) => {
    e.preventDefault();
    if (!forgotOtp.trim() || forgotOtp.trim().length !== 6) {
      showToast('error', 'Enter the 6-digit recovery code.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      showToast('error', 'Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('error', 'Passwords do not match.');
      return;
    }

    setLoading(true);
    closeToast();

    try {
      const res = await authAPI.resetPassword({
        email: forgotEmail.trim(),
        otp: forgotOtp.trim(),
        new_password: newPassword,
      });
      setLoading(false);
      if (res.data?.success) {
        setView('SIGNIN');
        setEmail(forgotEmail.trim());
        setPassword('');
        showToast('success', 'Password reset successfully. Please sign in.');
      } else {
        showToast('error', res.data?.message || 'Reset failed.');
      }
    } catch (err) {
      setLoading(false);
      showToast('error', err.response?.data?.message || 'Invalid or expired code.');
    }
  };

  return (
    <div
      className="auth-screen"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at 50% 25%, #1d4666 0%, #0f2b3f 50%, #0a1b28 100%)',
        padding: '24px 16px',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Floating Custom Toast */}
      {toast.show && (
        <div
          className={`auth-toast ${toast.type === 'error' ? 'auth-toast-error' : 'auth-toast-success'}`}
          role={toast.type === 'error' ? 'alert' : 'status'}
          aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
          style={{
            position: 'fixed',
            top: 24,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 18px',
            borderRadius: 12,
            background: toast.type === 'error' ? '#1E1B1B' : '#14231E',
            border: `1px solid ${toast.type === 'error' ? '#EF4444' : '#10B981'}`,
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.35)',
            color: '#FFFFFF',
            fontSize: '0.88rem',
            maxWidth: 420,
            animation: 'fadeIn 0.2s ease',
          }}
        >
          {toast.type === 'error' ? (
            <AlertCircle size={18} color="#EF4444" style={{ flexShrink: 0 }} />
          ) : (
            <CheckCircle2 size={18} color="#10B981" style={{ flexShrink: 0 }} />
          )}
          <span style={{ flex: 1, fontWeight: 500 }}>{toast.message}</span>
          <button
            onClick={closeToast}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
              padding: 2,
              display: 'flex',
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Main Authentication Container */}
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Brand Header — Clean Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <Logo size={48} variant="light" showText={true} />
        </div>

        {/* Card */}
        <div
          className="auth-panel"
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            padding: '36px 32px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          }}
        >
          {/* VIEW 1: SIGN IN */}
          {view === 'SIGNIN' && (
            <div>
              <div style={{ marginBottom: 24 }}>
                <h2
                  style={{
                    fontSize: '1.45rem',
                    fontWeight: 700,
                    color: 'var(--color-text-primary)',
                    letterSpacing: '-0.3px',
                    margin: '0 0 6px 0',
                  }}
                >
                  Sign In
                </h2>
                <p style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                  Enter your credentials to access your dashboard.
                </p>
              </div>

              <form onSubmit={handleSignIn} noValidate>
                {/* Email Field */}
                <div style={{ marginBottom: 18 }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.84rem',
                      fontWeight: 600,
                      color: 'var(--color-text-secondary)',
                      marginBottom: 6,
                    }}
                  >
                    Email
                  </label>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      border: '1px solid var(--color-border)',
                      borderRadius: 10,
                      padding: '0 12px',
                      height: 44,
                      backgroundColor: 'var(--color-surface-secondary)',
                      transition: 'border-color 0.2s',
                    }}
                  >
                    <Mail size={16} color="var(--color-text-secondary)" style={{ marginRight: 10, flexShrink: 0 }} />
                    <input
                      type="email"
                      placeholder="name@waseemautocare.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      required
                      style={{
                        width: '100%',
                        border: 'none',
                        background: 'transparent',
                        outline: 'none',
                        fontSize: '0.92rem',
                        color: 'var(--color-text-primary)',
                      }}
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div style={{ marginBottom: 24 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 6,
                    }}
                  >
                    <label
                      style={{
                        fontSize: '0.84rem',
                        fontWeight: 600,
                        color: 'var(--color-text-secondary)',
                        margin: 0,
                      }}
                    >
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotEmail(email);
                        setView('FORGOT_REQUEST');
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        color: 'var(--color-accent)',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      Forgot?
                    </button>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      border: '1px solid var(--color-border)',
                      borderRadius: 10,
                      padding: '0 12px',
                      height: 44,
                      backgroundColor: 'var(--color-surface-secondary)',
                    }}
                  >
                    <Lock size={16} color="var(--color-text-secondary)" style={{ marginRight: 10, flexShrink: 0 }} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        border: 'none',
                        background: 'transparent',
                        outline: 'none',
                        fontSize: '0.92rem',
                        color: 'var(--color-text-primary)',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--color-text-secondary)',
                        cursor: 'pointer',
                        padding: 4,
                        display: 'flex',
                      }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Sign In Button */}
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    height: 46,
                    backgroundColor: 'var(--color-accent)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 10,
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.75 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) e.currentTarget.style.backgroundColor = 'var(--color-burgundy-dark)';
                  }}
                  onMouseLeave={(e) => {
                    if (!loading) e.currentTarget.style.backgroundColor = 'var(--color-accent)';
                  }}
                >
                  {loading ? (
                    <span className="spinner-border spinner-border-sm" role="status" />
                  ) : (
                    'Sign In'
                  )}
                </button>
              </form>
            </div>
          )}

          {/* VIEW 2: 2FA VERIFICATION (For accounts requiring 2FA) */}
          {view === '2FA' && (
            <div>
              <div style={{ marginBottom: 20 }}>
                <h2
                  style={{
                    fontSize: '1.45rem',
                    fontWeight: 700,
                    color: 'var(--color-text-primary)',
                    letterSpacing: '-0.3px',
                    margin: '0 0 6px 0',
                  }}
                >
                  Two-Factor Verification
                </h2>
                <p style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                  Enter the 6-digit code sent to <strong style={{ color: 'var(--color-accent)' }}>{email}</strong>
                </p>
              </div>

              <form onSubmit={handleVerify2FA} noValidate>
                <div style={{ marginBottom: 24 }}>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="••••••"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    autoFocus
                    required
                    style={{
                      width: '100%',
                      height: 54,
                      textAlign: 'center',
                      fontSize: '1.8rem',
                      fontWeight: 700,
                      letterSpacing: '10px',
                      fontFamily: 'monospace',
                      border: '2px solid var(--color-accent)',
                      borderRadius: 12,
                      outline: 'none',
                      color: 'var(--color-accent)',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  style={{
                    width: '100%',
                    height: 46,
                    backgroundColor: 'var(--color-accent)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 10,
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    cursor: loading || otp.length !== 6 ? 'not-allowed' : 'pointer',
                    opacity: loading || otp.length !== 6 ? 0.6 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 16,
                  }}
                >
                  {loading ? (
                    <span className="spinner-border spinner-border-sm" role="status" />
                  ) : (
                    'Verify'
                  )}
                </button>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.85rem',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setView('SIGNIN')}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--color-text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: 0,
                    }}
                  >
                    <ArrowLeft size={14} /> Back
                  </button>

                  <button
                    type="button"
                    onClick={handleResend2FA}
                    disabled={resendTimer > 0 || loading}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      fontWeight: 600,
                      color: resendTimer > 0 ? 'var(--color-text-secondary)' : 'var(--color-secondary)',
                      cursor: resendTimer > 0 ? 'not-allowed' : 'pointer',
                      padding: 0,
                    }}
                  >
                    {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Code'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* VIEW 3: FORGOT PASSWORD REQUEST */}
          {view === 'FORGOT_REQUEST' && (
            <div>
              <div style={{ marginBottom: 20 }}>
                <h2
                  style={{
                    fontSize: '1.45rem',
                    fontWeight: 700,
                    color: 'var(--color-text-primary)',
                    letterSpacing: '-0.3px',
                    margin: '0 0 6px 0',
                  }}
                >
                  Reset Password
                </h2>
                <p style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                  Enter your email to receive a recovery code.
                </p>
              </div>

              <form onSubmit={handleForgotRequest} noValidate>
                <div style={{ marginBottom: 20 }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.84rem',
                      fontWeight: 600,
                      color: 'var(--color-text-secondary)',
                      marginBottom: 6,
                    }}
                  >
                    Email Address
                  </label>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      border: '1px solid var(--color-border)',
                      borderRadius: 10,
                      padding: '0 12px',
                      height: 44,
                      backgroundColor: 'var(--color-surface-secondary)',
                    }}
                  >
                    <Mail size={16} color="var(--color-text-secondary)" style={{ marginRight: 10, flexShrink: 0 }} />
                    <input
                      type="email"
                      placeholder="name@waseemautocare.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      required
                      autoFocus
                      style={{
                        width: '100%',
                        border: 'none',
                        background: 'transparent',
                        outline: 'none',
                        fontSize: '0.92rem',
                        color: 'var(--color-text-primary)',
                      }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    height: 46,
                    backgroundColor: 'var(--color-accent)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 10,
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.75 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 16,
                  }}
                >
                  {loading ? (
                    <span className="spinner-border spinner-border-sm" role="status" />
                  ) : (
                    'Send Code'
                  )}
                </button>

                <div style={{ textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setView('SIGNIN')}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--color-text-secondary)',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <ArrowLeft size={14} /> Back to Sign In
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* VIEW 4: FORGOT PASSWORD RESET */}
          {view === 'FORGOT_RESET' && (
            <div>
              <div style={{ marginBottom: 20 }}>
                <h2
                  style={{
                    fontSize: '1.45rem',
                    fontWeight: 700,
                    color: 'var(--color-text-primary)',
                    letterSpacing: '-0.3px',
                    margin: '0 0 6px 0',
                  }}
                >
                  Set New Password
                </h2>
                <p style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                  Enter the code sent to your email and your new password.
                </p>
              </div>

              <form onSubmit={handleForgotReset} noValidate>
                <div style={{ marginBottom: 16 }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.84rem',
                      fontWeight: 600,
                      color: 'var(--color-text-secondary)',
                      marginBottom: 6,
                    }}
                  >
                    6-Digit Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="••••••"
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    autoFocus
                    required
                    style={{
                      width: '100%',
                      height: 44,
                      textAlign: 'center',
                      fontSize: '1.3rem',
                      fontWeight: 700,
                      letterSpacing: '6px',
                      fontFamily: 'monospace',
                      border: '1px solid var(--color-border)',
                      borderRadius: 10,
                      outline: 'none',
                      color: 'var(--color-accent)',
                    }}
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.84rem',
                      fontWeight: 600,
                      color: 'var(--color-text-secondary)',
                      marginBottom: 6,
                    }}
                  >
                    New Password (min 6 characters)
                  </label>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      border: '1px solid var(--color-border)',
                      borderRadius: 10,
                      padding: '0 12px',
                      height: 44,
                      backgroundColor: 'var(--color-surface-secondary)',
                    }}
                  >
                    <Lock size={16} color="var(--color-text-secondary)" style={{ marginRight: 10, flexShrink: 0 }} />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="New password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        border: 'none',
                        background: 'transparent',
                        outline: 'none',
                        fontSize: '0.92rem',
                        color: 'var(--color-text-primary)',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--color-text-secondary)',
                        cursor: 'pointer',
                        padding: 4,
                        display: 'flex',
                      }}
                    >
                      {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: 22 }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.84rem',
                      fontWeight: 600,
                      color: 'var(--color-text-secondary)',
                      marginBottom: 6,
                    }}
                  >
                    Confirm Password
                  </label>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      border: '1px solid var(--color-border)',
                      borderRadius: 10,
                      padding: '0 12px',
                      height: 44,
                      backgroundColor: 'var(--color-surface-secondary)',
                    }}
                  >
                    <Lock size={16} color="var(--color-text-secondary)" style={{ marginRight: 10, flexShrink: 0 }} />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="Re-enter password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        border: 'none',
                        background: 'transparent',
                        outline: 'none',
                        fontSize: '0.92rem',
                        color: 'var(--color-text-primary)',
                      }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    height: 46,
                    backgroundColor: 'var(--color-accent)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 10,
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.75 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 16,
                  }}
                >
                  {loading ? (
                    <span className="spinner-border spinner-border-sm" role="status" />
                  ) : (
                    'Reset Password'
                  )}
                </button>

                <div style={{ textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setView('SIGNIN')}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--color-text-secondary)',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <ArrowLeft size={14} /> Back to Sign In
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
