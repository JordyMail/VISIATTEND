import { Router } from 'express';
import { PointLogRepository } from '../db/repositories/PointLogRepository';
import { badRequest, ok, serverError } from '../lib/http';
import { AttendanceService } from '../services/AttendanceService';

const router = Router();
const pointLogRepository = new PointLogRepository();
const attendanceService = new AttendanceService();

router.get('/logs', async (req, res) => {
    try {
        const userId = Number(req.query.userId);
        if (!userId) {
            return badRequest(res, 'userId is required');
        }

        const logs = await pointLogRepository.findByUserId(userId);
        return ok(res, logs);
    } catch (error) {
        return serverError(res, error, 'Failed to fetch point logs');
    }
});

router.get('/leaderboard', async (req, res) => {
    try {
        const limit = req.query.limit ? Number(req.query.limit) : 50;
        const leaderboard = await pointLogRepository.getLeaderboard(limit);
        return ok(res, leaderboard);
    } catch (error) {
        return serverError(res, error, 'Failed to fetch point leaderboard');
    }
});

router.post('/quiz', async (req, res) => {
    try {
        const userId = Number(req.body?.userId);
        const points = Number(req.body?.points);
        if (!userId || Number.isNaN(points)) {
            return badRequest(res, 'userId and points are required');
        }

        const pointLog = await attendanceService.awardQuizPoints({ userId, points });
        return ok(res, pointLog, 'Quiz points awarded successfully');
    } catch (error) {
        return serverError(res, error, 'Failed to award quiz points');
    }
});

export default router;