import axios from 'axios';

const API_BASE_URL = '/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add token to requests
api.interceptors.request.use((config) => {
    const session = localStorage.getItem('session');
    if (session) {
        const { accessToken } = JSON.parse(session);
        if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`;
        }
    }
    return config;
});

// Response interceptor for token refresh
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                const refreshToken = JSON.parse(localStorage.getItem('session') || '{}').refreshToken;
                const response = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
                const { accessToken } = response.data;
                const session = JSON.parse(localStorage.getItem('session') || '{}');
                session.accessToken = accessToken;
                localStorage.setItem('session', JSON.stringify(session));
                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                localStorage.removeItem('session');
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);

// User API
export const userApi = {
    getAll: (filters?: { role?: string; isActive?: boolean }) => 
        api.get('/users', { params: filters }),
    getById: (id: number) => api.get(`/users/${id}`),
    create: (data: any) => api.post('/users', data),
    update: (id: number, data: any) => api.put(`/users/${id}`, data),
    delete: (id: number) => api.delete(`/users/${id}`),
    toggleStatus: (id: number) => api.patch(`/users/${id}/toggle-status`),
};

// Event API
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

// Attendance API
export const attendanceApi = {
    getAll: (filters?: { userId?: number; eventId?: number; startDate?: string; endDate?: string; status?: string }) => 
        api.get('/attendance', { params: filters }),
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

// Dashboard API
export const dashboardApi = {
    getStats: () => api.get('/dashboard/stats'),
    getRecentActivities: (limit?: number) => api.get('/dashboard/activities', { params: { limit } }),
};

// Reports API
export const reportsApi = {
    generate: (data: any) => api.post('/reports/generate', data),
    getList: () => api.get('/reports'),
    download: (id: string) => api.get(`/reports/${id}/download`, { responseType: 'blob' }),
    delete: (id: string) => api.delete(`/reports/${id}`),
};

// Settings API
export const settingsApi = {
    getProfile: () => api.get('/settings/profile'),
    updateProfile: (data: any) => api.put('/settings/profile', data),
    changePassword: (data: any) => api.post('/settings/change-password', data),
    getSystemSettings: () => api.get('/settings/system'),
    updateSystemSettings: (data: any) => api.put('/settings/system', data),
    getActivityLogs: (limit?: number) => api.get('/settings/activity-logs', { params: { limit } }),
};

// Auth API
export const authApi = {
    login: (data: any) => api.post('/auth/login', data),
    register: (data: any) => api.post('/auth/register', data),
    logout: () => api.post('/auth/logout'),
    forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
    verifyResetCode: (email: string, code: string) => api.post('/auth/verify-reset-code', { email, code }),
    resetPassword: (email: string, code: string, newPassword: string) => 
        api.post('/auth/reset-password', { email, code, newPassword }),
};

export default api;