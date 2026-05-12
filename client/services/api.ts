// client/services/api.ts
import axios from 'axios';
import CryptoJS from 'crypto-js';

const API_BASE_URL = '/api';
const SECRET_KEY = (import.meta as any).env?.VITE_ENCRYPTION_KEY || 'your-secret-key-min-32-chars-long!!';

// ─── Token helpers ────────────────────────────────────────────────────────────
const decryptData = (encryptedData: string): string => {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, SECRET_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch {
    return encryptedData; // fallback: already plain text
  }
};

/** Read accessToken from localStorage 'session', handling both encrypted and plain formats */
const getAccessToken = (): string | null => {
  try {
    const sessionStr = localStorage.getItem('session');
    if (!sessionStr) return null;
    const session = JSON.parse(sessionStr);
    if (!session.accessToken) return null;

    // Try to decrypt; if decryption yields empty string it's already plain
    const decrypted = decryptData(session.accessToken);
    return decrypted || session.accessToken;
  } catch {
    return null;
  }
};

const getRefreshToken = (): string | null => {
  try {
    const sessionStr = localStorage.getItem('session');
    if (!sessionStr) return null;
    const session = JSON.parse(sessionStr);
    if (!session.refreshToken) return null;
    const decrypted = decryptData(session.refreshToken);
    return decrypted || session.refreshToken;
  } catch {
    return null;
  }
};

const updateStoredAccessToken = (newToken: string): void => {
  try {
    const sessionStr = localStorage.getItem('session');
    if (!sessionStr) return;
    const session = JSON.parse(sessionStr);
    // Store the new token in the same format as the existing session
    // If session has encrypted fields, we store plain (lib/auth will handle encryption on next login)
    session.accessToken = newToken;
    localStorage.setItem('session', JSON.stringify(session));
  } catch { /* ignore */ }
};

// ─── Axios instance ───────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor – attach Bearer token
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor – auto-refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = getRefreshToken();
        if (!refreshToken) throw new Error('No refresh token');

        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
        const { accessToken } = response.data;

        updateStoredAccessToken(accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch {
        localStorage.removeItem('session');
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

// ─── User API ─────────────────────────────────────────────────────────────────
export const userApi = {
  getAll: (filters?: { role?: string; isActive?: boolean }) =>
    api.get('/users', { params: filters }),
  getById: (id: number) => api.get(`/users/${id}`),
  create: (data: any) => api.post('/users', data),
  update: (id: number, data: any) => api.put(`/users/${id}`, data),
  delete: (id: number) => api.delete(`/users/${id}`),
  toggleStatus: (id: number) => api.patch(`/users/${id}/toggle-status`),
};

// ─── Event API ────────────────────────────────────────────────────────────────
export const eventApi = {
  getAll: (filters?: { isActive?: boolean; eventType?: string }) =>
    api.get('/events', { params: filters }),
  getById: (id: number) => api.get(`/events/${id}`),
  create: (data: any) => api.post('/events', data),
  update: (id: number, data: any) => api.put(`/events/${id}`, data),
  delete: (id: number) => api.delete(`/events/${id}`),
  getEnrolledMembers: (id: number) => api.get(`/events/${id}/members`),
  enrollMember: (eventId: number, userId: number) =>
    api.post(`/events/${eventId}/enroll`, { userId }),
};

// ─── Attendance API ───────────────────────────────────────────────────────────
export const attendanceApi = {
  getAll: (filters?: {
    userId?: number;
    eventId?: number;
    startDate?: string;
    endDate?: string;
    status?: string;
  }) => api.get('/attendance', { params: filters }),
  getById: (id: number) => api.get(`/attendance/${id}`),
  create: (data: any) => api.post('/attendance', data),
  update: (id: number, data: any) => api.put(`/attendance/${id}`, data),
  delete: (id: number) => api.delete(`/attendance/${id}`),
  getTodayStats: () => api.get('/attendance/stats/today'),
  getTrend: (days: number, eventId?: number) =>
    api.get('/attendance/trend', { params: { days, eventId } }),
  getLeaderboard: (eventId: number, period: string) =>
    api.get('/attendance/leaderboard', { params: { eventId, period } }),
};

// ─── Dashboard API ────────────────────────────────────────────────────────────
export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats'),
  getRecentActivities: (limit?: number) =>
    api.get('/dashboard/activities', { params: { limit } }),
};

// ─── Reports API ──────────────────────────────────────────────────────────────
export const reportsApi = {
  generate: (data: any) => api.post('/reports/generate', data),
  getList: () => api.get('/reports'),
  delete: (id: string) => api.delete(`/reports/${id}`),
};

// ─── Settings API ─────────────────────────────────────────────────────────────
export const settingsApi = {
  getProfile: () => api.get('/settings/profile'),
  updateProfile: (data: any) => api.put('/settings/profile', data),
  changePassword: (data: any) => api.post('/settings/change-password', data),
  getSystemSettings: () => api.get('/settings/system'),
  updateSystemSettings: (data: any) => api.put('/settings/system', data),
  getActivityLogs: (limit?: number) =>
    api.get('/settings/activity-logs', { params: { limit } }),
};

// ─── Auth API ─────────────────────────────────────────────────────────────────
export const authApi = {
  login: (data: any) => api.post('/auth/login', data),
  register: (data: any) => api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  verifyResetCode: (email: string, code: string) =>
    api.post('/auth/verify-reset-code', { email, code }),
  resetPassword: (email: string, code: string, newPassword: string) =>
    api.post('/auth/reset-password', { email, code, newPassword }),
};

export default api;