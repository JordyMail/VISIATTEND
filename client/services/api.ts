// client/services/api.ts
import axios from "axios";
import CryptoJS from "crypto-js";

const BASE = "/api";
const SECRET = (import.meta as any).env?.VITE_ENCRYPTION_KEY || "your-secret-key-min-32-chars-long!!";

// ─── Token helpers ────────────────────────────────────────────────────────────
const tryDecrypt = (s: string): string => {
  try {
    const b = CryptoJS.AES.decrypt(s, SECRET);
    return b.toString(CryptoJS.enc.Utf8) || s;
  } catch { return s; }
};

const readToken = (field: "accessToken" | "refreshToken"): string | null => {
  try {
    const raw = localStorage.getItem("session");
    if (!raw) return null;
    const sess = JSON.parse(raw);
    if (!sess[field]) return null;
    const v = tryDecrypt(sess[field]);
    return v || null;
  } catch { return null; }
};

const patchStoredToken = (newToken: string) => {
  try {
    const raw = localStorage.getItem("session");
    if (!raw) return;
    const sess = JSON.parse(raw);
    sess.accessToken = newToken;
    localStorage.setItem("session", JSON.stringify(sess));
  } catch { /* ignore */ }
};

// ─── Axios instance ───────────────────────────────────────────────────────────
const api = axios.create({ baseURL: BASE, headers: { "Content-Type": "application/json" } });

api.interceptors.request.use((config) => {
  const token = readToken("accessToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  async (err) => {
    const orig = err.config;
    if (err.response?.status === 401 && !orig._retry) {
      orig._retry = true;
      try {
        const rt = readToken("refreshToken");
        if (!rt) throw new Error("no refresh token");
        const { data } = await axios.post(`${BASE}/auth/refresh`, { refreshToken: rt });
        patchStoredToken(data.accessToken);
        orig.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(orig);
      } catch {
        localStorage.removeItem("session");
        window.location.href = "/login";
        return Promise.reject(err);
      }
    }
    return Promise.reject(err);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login:           (data: { email: string; password: string }) => api.post("/auth/login", data),
  register:        (data: any) => api.post("/auth/register", data),
  logout:          () => api.post("/auth/logout"),
  me:              () => api.get("/auth/me"),
  forgotPassword:  (email: string) => api.post("/auth/forgot-password", { email }),
  verifyResetCode: (email: string, code: string) => api.post("/auth/verify-reset-code", { email, code }),
  resetPassword:   (email: string, code: string, newPassword: string) =>
                     api.post("/auth/reset-password", { email, code, newPassword }),
  refresh:         (refreshToken: string) => api.post("/auth/refresh", { refreshToken }),
};

// ─── Users ────────────────────────────────────────────────────────────────────
export const userApi = {
  getAll: (filters?: {
    role?: string; isActive?: boolean; division?: string; jabatan?: string; search?: string;
  }) => api.get("/users", { params: filters }),
  getById:       (id: number) => api.get(`/users/${id}`),
  create:        (data: any)  => api.post("/users", data),
  update:        (id: number, data: any) => api.put(`/users/${id}`, data),
  delete:        (id: number) => api.delete(`/users/${id}`),
  toggleStatus:  (id: number) => api.patch(`/users/${id}/toggle-status`),
  resetPassword: (id: number, newPassword: string) =>
                   api.post(`/users/${id}/reset-password`, { newPassword }),
};

// ─── Events ───────────────────────────────────────────────────────────────────
export const eventApi = {
  getAll: (filters?: { isActive?: boolean; eventType?: string }) =>
            api.get("/events", { params: filters }),
  getById:         (id: number)             => api.get(`/events/${id}`),
  create:          (data: any)              => api.post("/events", data),
  update:          (id: number, data: any)  => api.put(`/events/${id}`, data),
  delete:          (id: number)             => api.delete(`/events/${id}`),
  getEnrolledMembers: (id: number)          => api.get(`/events/${id}/members`),
  enrollMember:    (eventId: number, userId: number) =>
                     api.post(`/events/${eventId}/enroll`, { userId }),
  unenrollMember:  (eventId: number, userId: number) =>
                     api.delete(`/events/${eventId}/enroll/${userId}`),
};

// ─── Attendance ───────────────────────────────────────────────────────────────
export const attendanceApi = {
  getAll: (filters?: {
    userId?: number; eventId?: number; startDate?: string; endDate?: string;
    status?: string; division?: string; jabatan?: string;
  }) => api.get("/attendance", { params: filters }),

  getById:      (id: number)             => api.get(`/attendance/${id}`),
  create:       (data: any)              => api.post("/attendance", data),
  update:       (id: number, data: any)  => api.put(`/attendance/${id}`, data),
  delete:       (id: number)             => api.delete(`/attendance/${id}`),

  // User self check-in
  checkIn:      (data: { qrToken?: string; eventId?: number }) =>
                  api.post("/attendance/checkin", data),

  // User's own records
  getMy:        (filters?: { eventId?: number; startDate?: string; endDate?: string; status?: string }) =>
                  api.get("/attendance/my", { params: filters }),
  getMyStats:   () => api.get("/attendance/my/stats"),

  // Admin views
  getTodayStats:  () => api.get("/attendance/stats/today"),
  getTrend:       (days: number, eventId?: number) =>
                    api.get("/attendance/trend", { params: { days, eventId } }),
  getLeaderboard: (eventId?: number, period?: string) =>
                    api.get("/attendance/leaderboard", { params: { eventId, period } }),
};

// ─── QR ───────────────────────────────────────────────────────────────────────
export const qrApi = {
  generate:   (data: { eventId: number; validDate?: string; expiryMinutes?: number }) =>
                api.post("/qr/generate", data),
  getByEvent: (eventId: number) => api.get(`/qr/${eventId}`),
};

// ─── Schedules ────────────────────────────────────────────────────────────────
export const scheduleApi = {
  getAll:   (filters?: { eventId?: number; upcoming?: boolean }) =>
              api.get("/schedules", { params: filters }),
  create:   (data: any)              => api.post("/schedules", data),
  update:   (id: number, data: any)  => api.put(`/schedules/${id}`, data),
  delete:   (id: number)             => api.delete(`/schedules/${id}`),
};

// ─── Announcements ────────────────────────────────────────────────────────────
export const announcementApi = {
  getAll:   () => api.get("/announcements"),
  create:   (data: { title: string; body: string; pinned?: boolean }) =>
              api.post("/announcements", data),
  update:   (id: number, data: any)  => api.put(`/announcements/${id}`, data),
  delete:   (id: number)             => api.delete(`/announcements/${id}`),
};

// ─── Divisions ────────────────────────────────────────────────────────────────
export const divisionApi = {
  getAll:   () => api.get("/divisions"),
  create:   (data: { name: string; description?: string; leaderId?: number }) =>
              api.post("/divisions", data),
  update:   (id: number, data: any) => api.put(`/divisions/${id}`, data),
};

// ─── Dashboard ────────────────────────────────────────────────────────────────
export const dashboardApi = {
  getStats:           () => api.get("/dashboard/stats"),
  getRecentActivities:(limit?: number) => api.get("/dashboard/activities", { params: { limit } }),
};

// ─── Reports ──────────────────────────────────────────────────────────────────
export const reportsApi = {
  generate: (data: {
    reportType: string; eventId?: number | string;
    period: string; format: string;
  }) => api.post("/reports/generate", data),
  getList:  () => api.get("/reports"),
};

// ─── Settings ─────────────────────────────────────────────────────────────────
export const settingsApi = {
  getProfile:           () => api.get("/settings/profile"),
  updateProfile:        (data: any) => api.put("/settings/profile", data),
  changePassword:       (data: { currentPassword: string; newPassword: string }) =>
                          api.post("/settings/change-password", data),
  getSystemSettings:    () => api.get("/settings/system"),
  updateSystemSettings: (data: any) => api.put("/settings/system", data),
  getActivityLogs:      (limit?: number, offset?: number) =>
                          api.get("/settings/activity-logs", { params: { limit, offset } }),
};

export default api;