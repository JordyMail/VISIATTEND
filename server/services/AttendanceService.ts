import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { ActivityLogRepository } from '../db/repositories/ActivityLogRepository';
import { AttendanceRepository, AttendanceCreateInput } from '../db/repositories/AttendanceRepository';
import { AttendanceSummaryRepository } from '../db/repositories/AttendanceSummaryRepository';
import { PointLogRepository } from '../db/repositories/PointLogRepository';
import { UserRepository } from '../db/repositories/UserRepository';
import { generateMemberId } from '../lib/member-id';

const DEFAULT_ATTENDANCE_POINTS = 10;

export class AttendanceService {
    private userRepository = new UserRepository();
    private attendanceRepository = new AttendanceRepository();
    private attendanceSummaryRepository = new AttendanceSummaryRepository();
    private pointLogRepository = new PointLogRepository();
    private activityLogRepository = new ActivityLogRepository();

    async createAttendance(input: AttendanceCreateInput, options?: { awardPoints?: boolean; actorUserId?: number; ipAddress?: string | null }) {
        const user = await this.userRepository.findById(input.userId);
        if (!user) {
            throw new Error('User not found');
        }

        const existingAttendance = await this.attendanceRepository.findByUserDate(
            input.userId,
            input.attendanceDate,
        );

        if (existingAttendance) {
            return {
                attendance: await this.attendanceRepository.findById(existingAttendance.id),
                summary: await this.attendanceSummaryRepository.syncByUser(input.userId),
                pointLog: null,
                isNew: false,
            };
        }

        const attendance = await this.attendanceRepository.create(input);
        const hydratedAttendance = await this.attendanceRepository.findById(attendance.id);
        const summary = await this.attendanceSummaryRepository.syncByUser(input.userId);

        let pointLog = null;
        if (options?.awardPoints !== false && input.status !== 'absent') {
            pointLog = await this.pointLogRepository.create({
                userId: input.userId,
                points: DEFAULT_ATTENDANCE_POINTS,
                type: 'attendance',
            });
        }

        await this.activityLogRepository.log({
            userId: options?.actorUserId ?? input.userId,
            action: 'ATTENDANCE_CREATED',
            entityType: 'attendance',
            entityId: attendance.id,
            description: `Attendance recorded for user ${user.full_name} on ${input.attendanceDate}`,
            ipAddress: options?.ipAddress ?? undefined,
        });

        return {
            attendance: hydratedAttendance,
            summary,
            pointLog,
            isNew: true,
        };
    }

    async updateAttendance(id: number, input: Partial<AttendanceCreateInput>, options?: { actorUserId?: number; ipAddress?: string | null }) {
        const currentAttendance = await this.attendanceRepository.findById(id);
        if (!currentAttendance) {
            throw new Error('Attendance not found');
        }

        const attendance = await this.attendanceRepository.update(id, input);
        const hydratedAttendance = await this.attendanceRepository.findById(id);
        const summary = await this.attendanceSummaryRepository.syncByUser(currentAttendance.user_id);

        await this.activityLogRepository.log({
            userId: options?.actorUserId,
            action: 'ATTENDANCE_UPDATED',
            entityType: 'attendance',
            entityId: id,
            description: `Attendance updated for user_id ${currentAttendance.user_id}`,
            ipAddress: options?.ipAddress ?? undefined,
        });

        return { attendance: hydratedAttendance ?? attendance, summary };
    }

    async deleteAttendance(id: number, options?: { actorUserId?: number; ipAddress?: string | null }) {
        const attendance = await this.attendanceRepository.findById(id);
        if (!attendance) {
            throw new Error('Attendance not found');
        }

        await this.attendanceRepository.delete(id);
        const summary = await this.attendanceSummaryRepository.syncByUser(attendance.user_id);

        await this.activityLogRepository.log({
            userId: options?.actorUserId,
            action: 'ATTENDANCE_DELETED',
            entityType: 'attendance',
            entityId: id,
            description: `Attendance deleted for user_id ${attendance.user_id}`,
            ipAddress: options?.ipAddress ?? undefined,
        });

        return { deleted: true, summary };
    }

    async registerMember(input: {
        fullName: string;
        email: string;
        phoneNumber?: string;
        userId?: string;
        dateOfBirth?: string;
        category?: 'student' | 'other';
    }) {
        const preparedRegistration = await this.prepareMemberRegistration(input);

        const randomPassword = randomBytes(8).toString('hex');
        const passwordHash = await bcrypt.hash(randomPassword, 10);
        const user = await this.userRepository.create({
            fullName: preparedRegistration.fullName,
            userId: preparedRegistration.userId,
            email: preparedRegistration.email,
            passwordHash,
            role: 'member',
            phoneNumber: preparedRegistration.phoneNumber,
            dateOfBirth: preparedRegistration.dateOfBirth,
            category: preparedRegistration.category,
        });

        await this.activityLogRepository.log({
            userId: user.id,
            action: 'USER_CREATED',
            entityType: 'users',
            entityId: user.id,
            description: `New member ${user.full_name} registered from Flutter attendance flow`,
        });

        return {
            nextStep: 'check-in',
            user,
        };
    }

    async prepareMemberRegistration(input: {
        fullName: string;
        email: string;
        phoneNumber?: string;
        userId?: string;
        dateOfBirth?: string;
        category?: 'student' | 'other';
    }) {
        const existingByEmail = await this.userRepository.findByEmail(input.email);
        if (existingByEmail) {
            throw new Error('Email already registered');
        }

        const resolvedUserId = input.userId || generateMemberId();
        const existingByUserId = await this.userRepository.findByUserId(resolvedUserId);
        if (existingByUserId) {
            throw new Error('User ID already registered');
        }

        return {
            fullName: input.fullName,
            email: input.email,
            phoneNumber: input.phoneNumber,
            userId: resolvedUserId,
            dateOfBirth: input.dateOfBirth,
            category: input.category,
        };
    }

    async processFlutterAttendance(input: {
        attendanceDate: string;
        checkInTime: string;
        userId?: string;
        memberId?: string;
        email?: string;
        deviceInfo?: string;
        confidenceScore?: number;
        notes?: string;
    }) {
        const resolvedUser = await this.findUserForFlutterAttendance(input);
        if (!resolvedUser) {
            return {
                requiresRegistration: true,
                nextStep: 'registration',
                message: 'User not found. Registration is required before attendance can be recorded.',
            };
        }

        const attendanceResult = await this.createAttendance({
            userId: resolvedUser.id,
            attendanceDate: input.attendanceDate,
            checkInTime: input.checkInTime,
            status: 'present',
            deviceInfo: input.deviceInfo,
            confidenceScore: input.confidenceScore,
            notes: input.notes,
        }, {
            actorUserId: resolvedUser.id,
        });

        const dashboard = await this.getUserDashboard(resolvedUser.id);

        return {
            requiresRegistration: false,
            registered: false,
            nextStep: 'user-dashboard',
            dashboard,
            user: resolvedUser,
            ...attendanceResult,
        };
    }

    async rollbackMemberRegistration(userId: number) {
        return this.userRepository.delete(userId);
    }

    async registerAndAttend(input: {
        fullName: string;
        email: string;
        phoneNumber?: string;
        userId?: string;
        dateOfBirth?: string;
        category?: 'student' | 'other';
        attendanceDate: string;
        checkInTime: string;
        deviceInfo?: string;
        notes?: string;
    }) {
        const registration = await this.registerMember(input);
        const attendanceResult = await this.createAttendance({
            userId: registration.user.id,
            attendanceDate: input.attendanceDate,
            checkInTime: input.checkInTime,
            status: 'present',
            deviceInfo: input.deviceInfo,
            notes: input.notes,
        }, {
            actorUserId: registration.user.id,
        });

        await this.activityLogRepository.log({
            userId: registration.user.id,
            action: 'USER_REGISTERED_FROM_ATTENDANCE',
            entityType: 'users',
            entityId: registration.user.id,
            description: `New member ${registration.user.full_name} registered during attendance flow`,
        });

        const dashboard = await this.getUserDashboard(registration.user.id);

        return {
            nextStep: 'user-dashboard',
            user: registration.user,
            dashboard,
            ...attendanceResult,
        };
    }

    async awardQuizPoints(input: { userId: number; points: number }) {
        const user = await this.userRepository.findById(input.userId);
        if (!user) {
            throw new Error('User not found');
        }

        const pointLog = await this.pointLogRepository.create({
            userId: input.userId,
            points: input.points,
            type: 'quiz',
        });

        await this.activityLogRepository.log({
            userId: input.userId,
            action: 'QUIZ_POINTS_AWARDED',
            entityType: 'point_logs',
            entityId: pointLog.id,
            description: `${input.points} quiz points awarded to ${user.full_name}`,
        });

        return pointLog;
    }

    async getUserDashboard(userId: number) {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        const summary = await this.attendanceSummaryRepository.findByUserId(userId);
        const recentAttendance = await this.attendanceRepository.getRecentByUser(userId, 10);
        const pointLogs = await this.pointLogRepository.findByUserId(userId, 10);
        const totalCorrectAnswers = await this.pointLogRepository.getCorrectQuizCount(userId);
        const attendancePercentage = await this.attendanceRepository.getAttendanceRateByUser(userId);

        return {
            user,
            summary,
            stats: {
                totalCorrectAnswers,
                attendancePercentage,
                totalPoints: user.total_points ?? 0,
            },
            recentAttendance,
            pointLogs,
        };
    }

    private async findUserForFlutterAttendance(input: {
        userId?: string;
        memberId?: string;
        email?: string;
    }) {
        const resolvedUserId = input.userId || input.memberId;
        if (resolvedUserId) {
            return this.userRepository.findByUserId(resolvedUserId);
        }

        if (input.email) {
            return this.userRepository.findByEmail(input.email);
        }

        throw new Error('userId, memberId, or email is required');
    }
}