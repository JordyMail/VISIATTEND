import { getConnection, sql } from '../config';

export class AttendanceSummaryRepository {
    async syncByUser(userId: number) {
        const pool = await getConnection();
        await pool
            .request()
            .input('user_id', sql.Int, userId)
            .query(`
                MERGE attendance_summary AS target
                USING (
                    SELECT
                        @user_id AS user_id,
                        ISNULL(SUM(CASE WHEN status IN ('present', 'late') THEN 1 ELSE 0 END), 0) AS total_hadir,
                        ISNULL(SUM(CASE WHEN check_in_time IS NOT NULL THEN 1 ELSE 0 END), 0) AS total_check_in,
                        ISNULL(SUM(CASE WHEN check_out_time IS NOT NULL THEN 1 ELSE 0 END), 0) AS total_check_out
                    FROM attendance
                    WHERE user_id = @user_id
                ) AS source
                ON target.user_id = source.user_id
                WHEN MATCHED THEN
                    UPDATE SET
                        total_hadir = source.total_hadir,
                        total_check_in = source.total_check_in,
                        total_check_out = source.total_check_out
                WHEN NOT MATCHED THEN
                    INSERT (user_id, total_hadir, total_check_in, total_check_out)
                    VALUES (source.user_id, source.total_hadir, source.total_check_in, source.total_check_out);
            `);

        return this.findByUserId(userId);
    }

    async findByUserId(userId: number) {
        const pool = await getConnection();
        const result = await pool
            .request()
            .input('user_id', sql.Int, userId)
            .query(`SELECT * FROM attendance_summary WHERE user_id = @user_id`);

        return result.recordset[0] || null;
    }
}