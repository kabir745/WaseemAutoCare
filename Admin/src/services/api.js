import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('wac_admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle session expiration or deactivation
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      if (error.response.status === 401 && !window.location.pathname.includes('/login')) {
        localStorage.removeItem('wac_admin_token');
        localStorage.removeItem('wac_admin_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  verifyLoginOTP: (data) => api.post('/auth/verify-login-otp', data),
  resendOTP: (data) => api.post('/auth/resend-otp', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
};

export const userAPI = {
  getProfile: () => api.get('/users/me'),
  updateProfile: (data) => api.put('/users/me', data),
  getDashboardStats: () => api.get('/users/dashboard-stats'),
  getAllUsers: (params) => api.get('/users', { params }),
  createUser: (data) => api.post('/users', data),
  toggleStatus: (id, isActive) => api.patch(`/users/${id}/status`, { is_active: isActive }),
  // toggleUserStatus: called with (id, currentIsActive) — sends the flipped boolean to the backend
  toggleUserStatus: (id, currentIsActive) =>
    api.patch(`/users/${id}/status`, { is_active: !currentIsActive }),
};

export const roleAPI = {
  getAllRoles: () => api.get('/roles'),
  getAllPermissions: () => api.get('/roles/permissions'),
  updateRolePermissions: (roleId, permissionIds) => api.put(`/roles/${roleId}/permissions`, { permission_ids: permissionIds }),
};

export default api;
