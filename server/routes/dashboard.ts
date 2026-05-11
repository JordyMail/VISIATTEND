import { Router } from 'express';
import { ActivityLogRepository } from '../db/repositories/ActivityLogRepository';
import { AttendanceRepository } from '../db/repositories/AttendanceRepository';
import { PointLogRepository } from '../db/repositories/PointLogRepository';
import { UserRepository } from '../db/repositories/UserRepository';
import { ok, serverError } from '../lib/http';

const router = Router();
const attendanceRepository = new AttendanceRepository();
const activityLogRepository = new ActivityLogRepository();
const pointLogRepository = new PointLogRepository();
const userRepository = new UserRepository();

router.get('/stats', async (_req, res) => {
    try {
        const [todayAttendance, members, attendanceRate, totalPointsAwarded, leaderboard] = await Promise.all([
            attendanceRepository.getTodayStats(),
            userRepository.findAll({ role: 'member', isActive: true }),
            attendanceRepository.getOverallAttendanceRate(),
            pointLogRepository.getTotalAwardedPoints(),
            pointLogRepository.getLeaderboard(1),
        ]);

        return ok(res, {
            totalMembers: members.length,
            todayAttendance,
            attendanceRate,
            totalPointsAwarded,
            topScorer: leaderboard[0] || null,
        });
    } catch (error) {
        return serverError(res, error, 'Failed to fetch dashboard stats');
    }
});

router.get('/activities', async (req, res) => {
    try {
        const limit = req.query.limit ? Number(req.query.limit) : 10;
        const activities = await activityLogRepository.getRecent(limit);
        return ok(res, activities);
    } catch (error) {
        return serverError(res, error, 'Failed to fetch recent activities');
    }
});

export default router;