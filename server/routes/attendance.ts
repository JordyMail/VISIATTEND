import { Router } from 'express';
import { AttendanceRepository } from '../db/repositories/AttendanceRepository';
import { badRequest, getRequestIp, notFound, ok, serverError } from '../lib/http';
import { AttendanceService } from '../services/AttendanceService';

const router = Router();
const attendanceRepository = new AttendanceRepository();
const attendanceService = new AttendanceService();

router.get('/', async (req, res) => {
    try {
        const attendances = await attendanceRepository.findAll({
            userId: req.query.userId ? Number(req.query.userId) : undefined,
            startDate: typeof req.query.startDate === 'string' ? req.query.startDate : undefined,
            endDate: typeof req.query.endDate === 'string' ? req.query.endDate : undefined,
            status: typeof req.query.status === 'string' ? req.query.status : undefined,
        });

        return ok(res, attendances);
    } catch (error) {
        return serverError(res, error, 'Failed to fetch attendance records');
    }
});

router.get('/stats/today', async (_req, res) => {
    try {
        const stats = await attendanceRepository.getTodayStats();
        return ok(res, stats);
    } catch (error) {
        return serverError(res, error, 'Failed to fetch today attendance stats');
    }
});

router.get('/trend', async (req, res) => {
    try {
        const days = req.query.days ? Number(req.query.days) : 7;
        const userId = req.query.userId ? Number(req.query.userId) : undefined;
        const trend = await attendanceRepository.getTrend(days, userId);
        return ok(res, trend);
    } catch (error) {
        return serverError(res, error, 'Failed to fetch attendance trend');
    }
});

router.get('/leaderboard', async (req, res) => {
    try {
        const period = typeof req.query.period === 'string' ? req.query.period : 'semester';
        const leaderboard = await attendanceRepository.getLeaderboard(period);
        return ok(res, leaderboard);
    } catch (error) {
        return serverError(res, error, 'Failed to fetch leaderboard');
    }
});

router.get('/:id', async (req, res) => {
    try {
        const attendance = await attendanceRepository.findById(Number(req.params.id));
        if (!attendance) {
            return notFound(res, 'Attendance not found');
        }

        return ok(res, attendance);
    } catch (error) {
        return serverError(res, error, 'Failed to fetch attendance detail');
    }
});

router.post('/', async (req, res) => {
    try {
        const { userId, attendanceDate, checkInTime, status } = req.body || {};
        if (!userId || !attendanceDate || !checkInTime || !status) {
            return badRequest(res, 'userId, attendanceDate, checkInTime, and status are required');
        }

        const result = await attendanceService.createAttendance(req.body, {
            ipAddress: getRequestIp(req),
        });

        return ok(res, result, result.isNew ? 'Attendance created successfully' : 'Attendance already exists for this user and date');
    } catch (error: any) {
        if (error instanceof Error && error.message.includes('not found')) {
            return notFound(res, error.message);
        }

        return serverError(res, error, 'Failed to create attendance');
    }
});

router.put('/:id', async (req, res) => {
    try {
        const result = await attendanceService.updateAttendance(Number(req.params.id), req.body || {}, {
            ipAddress: getRequestIp(req),
        });

        return ok(res, result, 'Attendance updated successfully');
    } catch (error: any) {
        if (error instanceof Error && error.message === 'Attendance not found') {
            return notFound(res, error.message);
        }

        return serverError(res, error, 'Failed to update attendance');
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const result = await attendanceService.deleteAttendance(Number(req.params.id), {
            ipAddress: getRequestIp(req),
        });

        return ok(res, result, 'Attendance deleted successfully');
    } catch (error: any) {
        if (error instanceof Error && error.message === 'Attendance not found') {
            return notFound(res, error.message);
        }

        return serverError(res, error, 'Failed to delete attendance');
    }
});

export default router;