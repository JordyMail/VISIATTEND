// shared/types.ts

// ============================================
// USER TYPES
// ============================================
export interface User {
    id: number;
    fullName: string;
    memberId: string;
    email: string;
    passwordHash?: string;
    role: 'admin' | 'preacher' | 'member' | 'staff';
    phoneNumber?: string;
    isActive: boolean;
    emailVerified: boolean;
    lastLogin?: Date;
    createdAt: Date;
    updatedAt?: Date;
}

export interface UserCreateInput {
    fullName: string;
    memberId: string;
    email: string;
    password: string;
    role?: 'admin' | 'preacher' | 'member' | 'staff';
    phoneNumber?: string;
}

export interface UserUpdateInput {
    fullName?: string;
    email?: string;
    phoneNumber?: string;
    isActive?: boolean;
    role?: 'admin' | 'preacher' | 'member' | 'staff';
}

// ============================================
// EVENT TYPES
// ============================================
export interface Event {
    id: number;
    eventCode: string;
    eventName: string;
    description?: string;
    preacherId: number;
    preacherName?: string;
    season: string;
    eventType: 'worship' | 'meeting' | 'study' | 'fellowship' | 'outreach';
    isActive: boolean;
    createdAt: Date;
    updatedAt?: Date;
}

export interface EventCreateInput {
    eventCode: string;
    eventName: string;
    description?: string;
    preacherId: number;
    season: string;
    eventType: 'worship' | 'meeting' | 'study' | 'fellowship' | 'outreach';
}

export interface EventUpdateInput {
    eventName?: string;
    description?: string;
    preacherId?: number;
    isActive?: boolean;
    eventType?: 'worship' | 'meeting' | 'study' | 'fellowship' | 'outreach';
}

// ============================================
// ATTENDANCE TYPES
// ============================================
export interface Attendance {
    id: number;
    userId: number;
    userName?: string;
    eventId: number;
    eventName?: string;
    eventCode?: string;
    attendanceDate: string; // YYYY-MM-DD
    checkInTime: string; // ISO datetime
    checkOutTime?: string; // ISO datetime
    status: 'present' | 'late' | 'excused' | 'sick' | 'absent';
    confidenceScore?: number;
    livenessVerified?: boolean;
    deviceInfo?: string;
    faceImageUrl?: string;
    notes?: string;
    createdAt: Date;
    updatedAt?: Date;
}

export interface AttendanceCreateInput {
    userId: number;
    eventId: number;
    attendanceDate: string;
    checkInTime: string;
    checkOutTime?: string;
    status: 'present' | 'late' | 'excused' | 'sick' | 'absent';
    confidenceScore?: number;
    livenessVerified?: boolean;
    deviceInfo?: string;
    notes?: string;
}

export interface AttendanceUpdateInput {
    checkOutTime?: string;
    status?: 'present' | 'late' | 'excused' | 'sick' | 'absent';
    notes?: string;
}

// ============================================
// ACHIEVEMENT TYPES
// ============================================
export interface Achievement {
    id: number;
    name: string;
    description: string;
    icon: string;
    criteriaType: 'attendance_count' | 'perfect_attendance' | 'streak' | 'early_bird' | 'custom';
    criteriaValue?: number;
    badgeImageUrl?: string;
    createdAt: Date;
}

export interface UserAchievement {
    id: number;
    userId: number;
    achievementId: number;
    earnedAt: Date;
    achievement?: Achievement;
}

// ============================================
// LEADERBOARD TYPES
// ============================================
export interface LeaderboardEntry {
    userId: number;
    fullName: string;
    memberId: string;
    totalPresent: number;
    totalLate: number;
    totalAbsent: number;
    attendancePercentage: number;
    achievements: string[]; // achievement ids
}

// ============================================
// STATISTICS TYPES
// ============================================
export interface AttendanceStats {
    present: number;
    late: number;
    excused: number;
    sick: number;
    absent: number;
    total: number;
    attendancePercentage: number;
}

export interface TodayAttendanceStats {
    checkedIn: number;
    pending: number;
    absent: number;
}

export interface ActivityLog {
    id: number;
    userId?: number;
    userName?: string;
    action: string;
    entityType?: string;
    entityId?: number;
    description?: string;
    ipAddress?: string;
    createdAt: Date;
}

// ============================================
// AUTH TYPES
// ============================================
export interface LoginRequest {
    email: string;
    password: string;
    rememberMe?: boolean;
}

export interface LoginResponse {
    success: boolean;
    user?: User;
    accessToken?: string;
    refreshToken?: string;
    twoFactorRequired?: boolean;
}

export interface RegisterRequest {
    fullName: string;
    email: string;
    password: string;
    confirmPassword: string;
    phoneNumber: string;
    memberId?: string;
}

export interface RegisterResponse {
    success: boolean;
    message: string;
    userId?: number;
}

export interface ForgotPasswordRequest {
    email: string;
}

export interface VerifyResetCodeRequest {
    email: string;
    code: string;
}

export interface ResetPasswordRequest {
    email: string;
    code: string;
    newPassword: string;
}

export interface TwoFactorRequest {
    userId: number;
    code: string;
}

// ============================================
// API RESPONSE TYPES
// ============================================
export interface ApiResponse<T = any> {
    success: boolean;
    message?: string;
    data?: T;
    error?: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

// ============================================
// SESSION TYPES
// ============================================
export interface Session {
    user: User;
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
    lastActivity: Date;
}

// ============================================
// FILTER TYPES
// ============================================
export interface AttendanceFilter {
    userId?: number;
    eventId?: number;
    startDate?: string;
    endDate?: string;
    status?: string;
}

export interface UserFilter {
    role?: string;
    isActive?: boolean;
    search?: string;
}

export interface EventFilter {
    isActive?: boolean;
    eventType?: string;
    search?: string;
}

// ============================================
// REPORT TYPES
// ============================================
export interface ReportRequest {
    type: 'attendance-summary' | 'lateness-report' | 'student-performance' | 'absence-analysis' | 'class-statistics';
    classId?: number;
    eventId?: number;
    period: 'week' | 'month' | 'semester' | 'year';
    format: 'pdf' | 'excel' | 'csv';
}

export interface Report {
    id: string;
    name: string;
    type: string;
    class: string;
    period: string;
    format: string;
    createdAt: Date;
    size: string;
    url?: string;
}

// ============================================
// SYSTEM SETTINGS TYPES
// ============================================
export interface SystemSettings {
    latenessThreshold: number;
    enableNotifications: boolean;
    enableLeaderboard: boolean;
    autoBackup: boolean;
    maintenanceMode: boolean;
}

// ============================================
// CHART DATA TYPES
// ============================================
export interface ChartDataPoint {
    label: string;
    value: number;
    color?: string;
}

export interface TrendDataPoint {
    date: string;
    present: number;
    late?: number;
    absent?: number;
}

// ============================================
// NOTIFICATION TYPES
// ============================================
export interface Notification {
    id: number;
    userId: number;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    isRead: boolean;
    createdAt: Date;
    data?: any;
}

// ============================================
// CONSTANTS
// ============================================
export const USER_ROLES = ['admin', 'preacher', 'member', 'staff'] as const;
export const EVENT_TYPES = ['worship', 'meeting', 'study', 'fellowship', 'outreach'] as const;
export const ATTENDANCE_STATUSES = ['present', 'late', 'excused', 'sick', 'absent'] as const;
export const REPORT_TYPES = ['attendance-summary', 'lateness-report', 'student-performance', 'absence-analysis', 'class-statistics'] as const;
export const REPORT_PERIODS = ['week', 'month', 'semester', 'year'] as const;
export const REPORT_FORMATS = ['pdf', 'excel', 'csv'] as const;