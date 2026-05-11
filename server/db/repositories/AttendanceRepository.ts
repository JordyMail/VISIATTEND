import { getConnection, sql } from '../config';

export interface AttendanceCreateInput {
    userId: number;
    attendanceDate: string;
    checkInTime: string;
    checkOutTime?: string;
    status: 'present' | 'late' | 'excused' | 'sick' | 'absent';
    confidenceScore?: number;
    livenessVerified?: boolean;
    deviceInfo?: string;
    faceImageUrl?: string;
    notes?: string;
}

export class AttendanceRepository {
    async findAll(filters?: { userId?: number; startDate?: string; endDate?: string; status?: string }) {
        const pool = await getConnection();
        const request = pool.request();
        let query = `
            SELECT a.*, u.full_name AS user_name, u.user_id AS member_id
            FROM attendance a
            INNER JOIN users u ON u.id = a.user_id
            WHERE 1=1
        `;

        if (filters?.userId) {
            query += ` AND a.user_id = @user_id`;
            request.input('user_id', sql.Int, filters.userId);
        }

        if (filters?.startDate) {
            query += ` AND a.attendance_date >= @start_date`;
            request.input('start_date', sql.Date, filters.startDate);
        }

        if (filters?.endDate) {
            query += ` AND a.attendance_date <= @end_date`;
            request.input('end_date', sql.Date, filters.endDate);
        }

        if (filters?.status) {
            query += ` AND a.status = @status`;
            request.input('status', sql.NVarChar, filters.status);
        }

        query += ` ORDER BY a.attendance_date DESC, a.check_in_time DESC`;

        const result = await request.query(query);
        return result.recordset;
    }

    async findById(id: number) {
        const pool = await getConnection();
        const result = await pool
            .request()
            .input('id', sql.Int, id)
            .query(`
                SELECT a.*, u.full_name AS user_name, u.user_id AS member_id
                FROM attendance a
                INNER JOIN users u ON u.id = a.user_id
                WHERE a.id = @id
            `);

        return result.recordset[0] || null;
    }

    async findByUserDate(userId: number, attendanceDate: string) {
        const pool = await getConnection();
        const result = await pool
            .request()
            .input('user_id', sql.Int, userId)
            .input('attendance_date', sql.Date, attendanceDate)
            .query(`
                SELECT *
                FROM attendance
                WHERE user_id = @user_id AND attendance_date = @attendance_date
            `);

        return result.recordset[0] || null;
    }

    async create(attendance: AttendanceCreateInput) {
        const pool = await getConnection();
        const result = await pool
            .request()
            .input('user_id', sql.Int, attendance.userId)
            .input('attendance_date', sql.Date, attendance.attendanceDate)
            .input('check_in_time', sql.DateTime, attendance.checkInTime)
            .input('check_out_time', sql.DateTime, attendance.checkOutTime ?? null)
            .input('status', sql.NVarChar, attendance.status)
            .input('confidence_score', sql.Decimal(5, 2), attendance.confidenceScore ?? null)
            .input('liveness_verified', sql.Bit, attendance.livenessVerified ?? false)
            .input('device_info', sql.NVarChar, attendance.deviceInfo ?? null)
            .input('face_image_url', sql.NVarChar, attendance.faceImageUrl ?? null)
            .input('notes', sql.NVarChar, attendance.notes ?? null)
            .query(`
                INSERT INTO attendance (
                    user_id,
                    attendance_date,
                    check_in_time,
                    check_out_time,
                    status,
                    confidence_score,
                    liveness_verified,
                    device_info,
                    face_image_url,
                    notes
                )
                OUTPUT INSERTED.*
                VALUES (
                    @user_id,
                    @attendance_date,
                    @check_in_time,
                    @check_out_time,
                    @status,
                    @confidence_score,
                    @liveness_verified,
                    @device_info,
                    @face_image_url,
                    @notes
                )
            `);

        return result.recordset[0];
    }

    async update(id: number, attendance: Partial<AttendanceCreateInput>) {
        const pool = await getConnection();
        const request = pool.request().input('id', sql.Int, id);
        const updates: string[] = ['updated_at = GETDATE()'];

        if (attendance.checkOutTime !== undefined) {
            updates.push('check_out_time = @check_out_time');
            request.input('check_out_time', sql.DateTime, attendance.checkOutTime ?? null);
        }

        if (attendance.status !== undefined) {
            updates.push('status = @status');
            request.input('status', sql.NVarChar, attendance.status);
        }

        if (attendance.notes !== undefined) {
            updates.push('notes = @notes');
            request.input('notes', sql.NVarChar, attendance.notes);
        }

        const result = await request.query(`
            UPDATE attendance
            SET ${updates.join(', ')}
            OUTPUT INSERTED.*
            WHERE id = @id
        `);

        return result.recordset[0] || null;
    }

    async delete(id: number) {
        const pool = await getConnection();
        const result = await pool
            .request()
            .input('id', sql.Int, id)
            .query(`
                DELETE FROM attendance
                WHERE id = @id
            `);

        return result.rowsAffected[0] > 0;
    }

    async getTodayStats() {
        const pool = await getConnection();
        const result = await pool.query(`
            SELECT
                (SELECT COUNT(*) FROM attendance WHERE attendance_date = CAST(GETDATE() AS DATE) AND check_in_time IS NOT NULL) AS checked_in,
                (SELECT COUNT(*) FROM users WHERE role = 'member' AND is_active = 1) AS total_members
        `);

        const checkedIn = result.recordset[0]?.checked_in ?? 0;
        const totalMembers = result.recordset[0]?.total_members ?? 0;
        return {
            checkedIn,
            pending: Math.max(totalMembers - checkedIn, 0),
            absent: 0,
        };
    }

    async getTrend(days: number, userId?: number) {
        const pool = await getConnection();
        const request = pool.request().input('days', sql.Int, days);
        let userFilter = '';

        if (userId) {
            userFilter = 'AND a.user_id = @user_id';
            request.input('user_id', sql.Int, userId);
        }

        const result = await request.query(`
            SELECT
                a.attendance_date,
                SUM(CASE WHEN a.status IN ('present', 'late') THEN 1 ELSE 0 END) AS total_present,
                SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) AS total_absent
            FROM attendance a
            WHERE a.attendance_date >= DATEADD(DAY, -@days, CAST(GETDATE() AS DATE))
            ${userFilter}
            GROUP BY a.attendance_date
            ORDER BY a.attendance_date ASC
        `);

        return result.recordset;
    }

    async getLeaderboard(period: 'week' | 'month' | 'semester' | string) {
        const pool = await getConnection();
        const request = pool.request();

        let startDateExpression = 'DATEADD(DAY, -180, CAST(GETDATE() AS DATE))';
        if (period === 'week') {
            startDateExpression = 'DATEADD(DAY, -7, CAST(GETDATE() AS DATE))';
        } else if (period === 'month') {
            startDateExpression = 'DATEADD(MONTH, -1, CAST(GETDATE() AS DATE))';
        }

        const result = await request.query(`
            SELECT
                u.id AS member_pk_id,
                u.full_name,
                u.user_id,
                SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) AS total_present,
                SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) AS total_late,
                CAST(
                    CASE WHEN COUNT(a.id) = 0 THEN 0
                    ELSE (SUM(CASE WHEN a.status IN ('present', 'late') THEN 1 ELSE 0 END) * 100.0 / COUNT(a.id))
                    END AS DECIMAL(5, 2)
                ) AS attendance_percentage
            FROM users u
            LEFT JOIN attendance a
                ON a.user_id = u.id
                AND a.attendance_date >= ${startDateExpression}
            WHERE u.role = 'member' AND u.is_active = 1
            GROUP BY u.id, u.full_name, u.user_id
            ORDER BY attendance_percentage DESC, total_present DESC, u.full_name ASC
        `);

        return result.recordset;
    }

    async getOverallAttendanceRate() {
        const pool = await getConnection();
        const result = await pool.query(`
            SELECT CAST(
                CASE WHEN COUNT(*) = 0 THEN 0
                ELSE SUM(CASE WHEN status IN ('present', 'late') THEN 1 ELSE 0 END) * 100.0 / COUNT(*)
                END AS DECIMAL(5, 2)
            ) AS attendance_rate
            FROM attendance
        `);

        return result.recordset[0]?.attendance_rate ?? 0;
    }

    async getAttendanceRateByUser(userId: number) {
        const pool = await getConnection();
        const result = await pool
            .request()
            .input('user_id', sql.Int, userId)
            .query(`
                SELECT CAST(
                    CASE WHEN COUNT(*) = 0 THEN 0
                    ELSE SUM(CASE WHEN status IN ('present', 'late') THEN 1 ELSE 0 END) * 100.0 / COUNT(*)
                    END AS DECIMAL(5, 2)
                ) AS attendance_rate
                FROM attendance
                WHERE user_id = @user_id
            `);

        return result.recordset[0]?.attendance_rate ?? 0;
    }

    async getRecentByUser(userId: number, limit: number = 10) {
        const pool = await getConnection();
        const result = await pool
            .request()
            .input('user_id', sql.Int, userId)
            .input('limit', sql.Int, limit)
            .query(`
                SELECT TOP (@limit) a.*, u.full_name AS user_name, u.user_id AS member_id
                FROM attendance a
                INNER JOIN users u ON u.id = a.user_id
                WHERE a.user_id = @user_id
                ORDER BY a.attendance_date DESC, a.check_in_time DESC
            `);

        return result.recordset;
    }
}