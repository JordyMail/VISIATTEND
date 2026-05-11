import { getConnection, sql } from '../config';
import { UserRepository } from './UserRepository';

export class PointLogRepository {
    private userRepository = new UserRepository();

    async create(log: { userId: number; points: number; type: 'attendance' | 'quiz' }) {
        const pool = await getConnection();
        const result = await pool
            .request()
            .input('user_id', sql.Int, log.userId)
            .input('points', sql.Int, log.points)
            .input('type', sql.NVarChar, log.type)
            .query(`
                INSERT INTO point_logs (user_id, points, type)
                OUTPUT INSERTED.*
                VALUES (@user_id, @points, @type)
            `);

        await this.recalculateUserTotal(log.userId);
        return result.recordset[0];
    }

    async findByUserId(userId: number, limit?: number) {
        const pool = await getConnection();
        const request = pool.request().input('user_id', sql.Int, userId);
        const topClause = limit ? 'TOP (@limit)' : '';

        if (limit) {
            request.input('limit', sql.Int, limit);
        }

        const result = await request.query(`
            SELECT ${topClause}
                p.*,
                u.full_name AS user_name,
                u.user_id AS member_id
            FROM point_logs p
            INNER JOIN users u ON u.id = p.user_id
            WHERE p.user_id = @user_id
            ORDER BY p.created_at DESC, p.id DESC
        `);

        return result.recordset;
    }

    async getLeaderboard(limit: number = 50) {
        const pool = await getConnection();
        const result = await pool
            .request()
            .input('limit', sql.Int, limit)
            .query(`
                SELECT TOP (@limit)
                    u.id AS member_pk_id,
                    u.full_name,
                    u.user_id,
                    u.total_points,
                    ISNULL(quiz.total_correct_answers, 0) AS total_correct_answers,
                    CAST(ISNULL(att.attendance_percentage, 0) AS DECIMAL(5, 2)) AS attendance_percentage,
                    ISNULL(att.total_hadir, 0) AS total_hadir
                FROM users u
                LEFT JOIN (
                    SELECT
                        user_id,
                        SUM(CASE WHEN type = 'quiz' THEN 1 ELSE 0 END) AS total_correct_answers
                    FROM point_logs
                    GROUP BY user_id
                ) AS quiz ON quiz.user_id = u.id
                LEFT JOIN (
                    SELECT
                        user_id,
                        SUM(CASE WHEN status IN ('present', 'late') THEN 1 ELSE 0 END) AS total_hadir,
                        CASE WHEN COUNT(*) = 0 THEN 0
                            ELSE SUM(CASE WHEN status IN ('present', 'late') THEN 1 ELSE 0 END) * 100.0 / COUNT(*)
                        END AS attendance_percentage
                    FROM attendance
                    GROUP BY user_id
                ) AS att ON att.user_id = u.id
                WHERE u.role = 'member' AND u.is_active = 1
                ORDER BY u.total_points DESC, ISNULL(quiz.total_correct_answers, 0) DESC, u.full_name ASC
            `);

        return result.recordset;
    }

    async getCorrectQuizCount(userId: number) {
        const pool = await getConnection();
        const result = await pool
            .request()
            .input('user_id', sql.Int, userId)
            .query(`
                SELECT ISNULL(SUM(CASE WHEN type = 'quiz' THEN 1 ELSE 0 END), 0) AS total_correct_answers
                FROM point_logs
                WHERE user_id = @user_id
            `);

        return result.recordset[0]?.total_correct_answers ?? 0;
    }

    async getTotalAwardedPoints() {
        const pool = await getConnection();
        const result = await pool.query(`
            SELECT ISNULL(SUM(points), 0) AS total_awarded_points
            FROM point_logs
        `);

        return result.recordset[0]?.total_awarded_points ?? 0;
    }

    async recalculateUserTotal(userId: number) {
        const pool = await getConnection();
        const result = await pool
            .request()
            .input('user_id', sql.Int, userId)
            .query(`
                SELECT ISNULL(SUM(points), 0) AS total_points
                FROM point_logs
                WHERE user_id = @user_id
            `);

        const totalPoints = result.recordset[0]?.total_points ?? 0;
        await this.userRepository.setTotalPoints(userId, totalPoints);
        return totalPoints;
    }
}