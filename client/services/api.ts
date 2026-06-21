import axios from "axios";

const BASE = "/api";

const readToken = (field: "accessToken" | "refreshToken"): string | null => {
  try {
    const raw = localStorage.getItem("session");
    if (!raw) return null;
    const sess = JSON.parse(raw);
    return sess[field] || null;
  } catch {
    return null;
  }
};

const patchStoredToken = (newToken: string) => {
  try {
    const raw = localStorage.getItem("session");
    if (!raw) return;
    const sess = JSON.parse(raw);
    sess.accessToken = newToken;
    localStorage.setItem("session", JSON.stringify(sess));
  } catch {
    /* ignore */
  }
};

const api = axios.create({
  baseURL: BASE,
  headers: { "Content-Type": "application/json" },
});

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
        const { data } = await axios.post(`${BASE}/auth/refresh`, {
          refreshToken: rt,
        });
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

export const authApi = {
  login: (data: { email: string; password: string }) =>
    api.post("/auth/login", data),
  register: (data: any) => api.post("/auth/register", data),
  logout: () => api.post("/auth/logout"),
  me: () => api.get("/auth/me"),
  forgotPassword: (email: string) =>
    api.post("/auth/forgot-password", { email }),
  verifyResetCode: (email: string, code: string) =>
    api.post("/auth/verify-reset-code", { email, code }),
  resetPassword: (email: string, code: string, newPassword: string) =>
    api.post("/auth/reset-password", { email, code, newPassword }),
  refresh: (refreshToken: string) =>
    api.post("/auth/refresh", { refreshToken }),
};

export const userApi = {
  getAll: (filters?: {
    role?: string;
    isActive?: boolean;
    division?: string;
    jabatan?: string;
    search?: string;
  }) => api.get("/users", { params: filters }),
  getById: (id: number) => api.get(`/users/${id}`),
  create: (data: any) => api.post("/users", data),
  update: (id: number, data: any) => api.put(`/users/${id}`, data),
  delete: (id: number) => api.delete(`/users/${id}`),
  toggleStatus: (id: number) => api.patch(`/users/${id}/toggle-status`),
  resetPassword: (id: number, newPassword: string) =>
    api.post(`/users/${id}/reset-password`, { newPassword }),
};

export const eventApi = {
  getAll: (filters?: { isActive?: boolean; eventType?: string }) =>
    api.get("/events", { params: filters }),
  getById: (id: number) => api.get(`/events/${id}`),
  create: (data: any) => api.post("/events", data),
  update: (id: number, data: any) => api.put(`/events/${id}`, data),
  delete: (id: number) => api.delete(`/events/${id}`),
  getEnrolledMembers: (id: number) => api.get(`/events/${id}/members`),
  enrollMember: (eventId: number, userId: number) =>
    api.post(`/events/${eventId}/enroll`, { userId }),
  unenrollMember: (eventId: number, userId: number) =>
    api.delete(`/events/${eventId}/enroll/${userId}`),
};

export const attendanceApi = {
  getAll: (filters?: {
    userId?: number;
    eventId?: number;
    startDate?: string;
    endDate?: string;
    status?: string;
    division?: string;
    jabatan?: string;
  }) => api.get("/attendance", { params: filters }),
  getById: (id: number) => api.get(`/attendance/${id}`),
  create: (data: any) => api.post("/attendance", data),
  update: (id: number, data: any) => api.put(`/attendance/${id}`, data),
  delete: (id: number) => api.delete(`/attendance/${id}`),
  checkIn: (data: { qrToken?: string; eventId?: number }) =>
    api.post("/attendance/checkin", data),
  getMy: (filters?: {
    eventId?: number;
    startDate?: string;
    endDate?: string;
    status?: string;
  }) => api.get("/attendance/my", { params: filters }),
  getMyStats: () => api.get("/attendance/my/stats"),
  getTodayStats: () => api.get("/attendance/stats/today"),
  getPublicOverview: () => api.get("/attendance/public-overview"),
  getTrend: (days: number, eventId?: number) =>
    api.get("/attendance/trend", {
      params: { days, ...(eventId ? { eventId } : {}) },
    }),
  getLeaderboard: (eventId?: number, period?: string) =>
    api.get("/attendance/leaderboard", {
      params: {
        ...(eventId ? { eventId } : {}),
        ...(period ? { period } : {}),
      },
    }),
};

export const qrApi = {
  generate: (data: {
    eventId: number;
    validDate?: string;
    expiryMinutes?: number;
  }) => api.post("/qr/generate", data),
  getByEvent: (eventId: number) => api.get(`/qr/${eventId}`),
};

export const scheduleApi = {
  getAll: (filters?: { eventId?: number; upcoming?: boolean }) =>
    api.get("/schedules", { params: filters }),
  create: (data: any) => api.post("/schedules", data),
  update: (id: number, data: any) => api.put(`/schedules/${id}`, data),
  delete: (id: number) => api.delete(`/schedules/${id}`),
};

export const announcementApi = {
  getAll: () => api.get("/announcements"),
  create: (data: { title: string; body: string; pinned?: boolean }) =>
    api.post("/announcements", data),
  update: (id: number, data: any) => api.put(`/announcements/${id}`, data),
  delete: (id: number) => api.delete(`/announcements/${id}`),
};

export const divisionApi = {
  getAll: () => api.get("/divisions"),
  create: (data: { name: string; description?: string; leaderId?: number }) =>
    api.post("/divisions", data),
  update: (id: number, data: any) => api.put(`/divisions/${id}`, data),
};

export const dashboardApi = {
  getStats: () => api.get("/dashboard/stats"),
  getRecentActivities: (limit?: number) =>
    api.get("/dashboard/activities", { params: { limit } }),
};

export const reportsApi = {
  generate: (data: {
    reportType: string;
    eventId?: number | string;
    period: string;
    format: string;
  }) => api.post("/reports/generate", data),
  getList: () => api.get("/reports"),
};

export const settingsApi = {
  getProfile: () => api.get("/settings/profile"),
  updateProfile: (data: any) => api.put("/settings/profile", data),
  changePassword: (data: {
    currentPassword: string;
    newPassword: string;
  }) => api.post("/settings/change-password", data),
  getSystemSettings: () => api.get("/settings/system"),
  updateSystemSettings: (data: any) => api.put("/settings/system", data),
  getActivityLogs: (limit?: number, offset?: number) =>
    api.get("/settings/activity-logs", { params: { limit, offset } }),
};




// ─── Questions ────────────────────────────────────────────────────────────────
export const questionApi = {
  // Admin endpoints
  getAll: (filters?: { isActive?: boolean }) =>
    api.get('/questions', { params: filters }),
  getById: (id: number) =>
    api.get(`/questions/${id}`),
  create: (data: {
    title: string;
    questionText: string;
    questionType: string;
    options?: string[] | null;
    correctAnswer: string;
    points?: number;
    timeLimitMinutes?: number;
    startDate?: string | null;
    endDate?: string | null;
    maxAttempts?: number;
  }) => api.post('/questions', data),
  update: (id: number, data: any) =>
    api.put(`/questions/${id}`, data),
  delete: (id: number) =>
    api.delete(`/questions/${id}`),
  
  // User endpoints
  getAvailable: () =>
    api.get('/questions/available'),
  submitAnswer: (questionId: number, answer: string, timeSpentSeconds?: number) =>
    api.post(`/questions/${questionId}/submit`, { answer, timeSpentSeconds }),
  
  // Stats & Leaderboard
  getLeaderboard: () =>
    api.get('/questions/leaderboard'),
  getUserStats: (userId: number) =>
    api.get(`/questions/stats/${userId}`),
  getMyStats: () => api.get('/user/question-stats'),
};


export const faceAiApi = {
  previewDetection: (data: { imageBase64: string }) =>
    api.post("/face-ai/preview", data),
  captureRegistration: (data: { imageBase64: string; sessionId?: string | null }) =>
    api.post("/face-ai/registration/capture", data),
  finalizeRegistration: (data: {
    sessionId: string;
    profile: { name: string; email: string; category: string; phone: string; birthday: string };
  }) => api.post("/face-ai/registration/finalize", data),
  verifyAttendance: (data: { imageBase64: string; threshold?: number }) =>
    api.post("/face-ai/attendance/verify", data),
};

export const userDashboardApi = {
  getProfile: (params: { email?: string; name?: string }) =>
    api.get("/user-dashboard/profile", { params }),
  awardQuestionPoints: (data: { email?: string; name?: string; reward: number }) =>
    api.post("/user-dashboard/question/reward", data),
  getQuestions: (params: { email?: string; name?: string }) =>
    api.get("/user-dashboard/questions", { params }),
  submitQuestionAnswer: (data: { email?: string; name?: string; questionId: number; answer: string; timeSpentSeconds?: number }) =>
    api.post("/user-dashboard/questions/submit", data),
};

export const attendanceScheduleApi = {
  getAll: () => api.get("/attendance-schedule"),
  checkToday: () => api.get("/attendance-schedule/today"),
  addDate: (date: string) => api.post("/attendance-schedule", { date }),
  removeDate: (date: string) => api.delete(`/attendance-schedule/${date}`),
};

export const userMemberApi = {
  create: (data: {
    name: string;
    email: string;
    category: string;
    phone: string;
    birthday: string;
  }) => api.post("/user-members", data),
};

export const memberLeaderboardApi = {
  getLeaderboard: () => api.get("/member-leaderboard"),
};

export default api;
