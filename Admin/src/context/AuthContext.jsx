import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, userAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('wac_admin_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('wac_admin_token'));
  const [loading, setLoading] = useState(true);

  // Validate session on launch
  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('wac_admin_token');
      if (storedToken) {
        try {
          const res = await authAPI.getMe();
          if (res.data?.success && res.data.user) {
            setUser(res.data.user);
            localStorage.setItem('wac_admin_user', JSON.stringify(res.data.user));
          } else {
            logout();
          }
        } catch (e) {
          logout();
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const res = await authAPI.login({ email, password });
      if (res.data?.success) {
        // If 2FA is required (default flow)
        if (res.data.require_2fa) {
          if (res.data.role === 'customer') {
            return {
              success: false,
              message: 'Access Denied: Customer accounts must use the mobile application.',
            };
          }
          return {
            success: true,
            require_2fa: true,
            email: res.data.email,
            message: res.data.message,
            debug_otp: res.data.debug_otp,
          };
        }

        const { token: receivedToken, user: receivedUser } = res.data;

        // Ensure user is not an ordinary customer trying to access management portal
        if (receivedUser.role === 'customer') {
          return {
            success: false,
            message: 'Access Denied: Customer accounts must use the mobile application.',
          };
        }

        localStorage.setItem('wac_admin_token', receivedToken);
        localStorage.setItem('wac_admin_user', JSON.stringify(receivedUser));
        setToken(receivedToken);
        setUser(receivedUser);
        return { success: true };
      }
      return { success: false, message: res.data?.message || 'Login failed.' };
    } catch (error) {
      const msg = error.response?.data?.message || 'Login failed. Please check credentials.';
      return { success: false, message: msg };
    }
  };

  const verify2FA = async (email, otp) => {
    try {
      const res = await authAPI.verifyLoginOTP({ email, otp });
      if (res.data?.success) {
        const { token: receivedToken, user: receivedUser } = res.data;

        if (receivedUser.role === 'customer') {
          return {
            success: false,
            message: 'Access Denied: Customer accounts must use the mobile application.',
          };
        }

        localStorage.setItem('wac_admin_token', receivedToken);
        localStorage.setItem('wac_admin_user', JSON.stringify(receivedUser));
        setToken(receivedToken);
        setUser(receivedUser);
        return { success: true, user: receivedUser };
      }
      return { success: false, message: res.data?.message || 'Verification failed.' };
    } catch (error) {
      const msg = error.response?.data?.message || 'Invalid or expired verification code.';
      return { success: false, message: msg };
    }
  };

  const resendLoginOTP = async (email) => {
    try {
      const res = await authAPI.resendOTP({ email, purpose: 'LOGIN' });
      return {
        success: res.data?.success,
        message: res.data?.message,
        debug_otp: res.data?.debug_otp,
      };
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to resend verification code.';
      return { success: false, message: msg };
    }
  };

  const logout = () => {
    if (token) {
      authAPI.logout().catch(() => {});
    }
    localStorage.removeItem('wac_admin_token');
    localStorage.removeItem('wac_admin_user');
    setToken(null);
    setUser(null);
  };

  const updateProfile = async ({ full_name, phone }) => {
    try {
      const res = await userAPI.updateProfile({ full_name, phone });
      if (res.data?.success && res.data.user) {
        setUser((prev) => ({
          ...prev,
          full_name: res.data.user.full_name,
          phone: res.data.user.phone,
        }));
        localStorage.setItem('wac_admin_user', JSON.stringify({
          ...user,
          full_name: res.data.user.full_name,
          phone: res.data.user.phone,
        }));
        return { success: true, message: res.data.message };
      }
      return { success: false, message: res.data?.message || 'Update failed.' };
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to update profile.';
      return { success: false, message: msg };
    }
  };

  const hasPermission = (permissionName) => {
    if (!user) return false;
    if (user.is_main_admin) return true;
    return Array.isArray(user.permissions) && user.permissions.includes(permissionName);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        loading,
        login,
        verify2FA,
        resendLoginOTP,
        logout,
        updateProfile,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
