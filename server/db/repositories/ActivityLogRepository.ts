import { getConnection, sql } from '../config';

export interface ActivityLog {
    id: number;
    userId?: number;
    action: string;
    entityType?: string;
    entityId?: number;
    description?: string;
    ipAddress?: string;
    createdAt: Date;
}

export class ActivityLogRepository {
    async log(activity: Partial<ActivityLog>): Promise<void> {
        const pool = await getConnection();
        await pool
            .request()
            .input('user_id', sql.Int, activity.userId)
            .input('action', sql.NVarChar, activity.action)
            .input('entity_type', sql.NVarChar, activity.entityType)
            .input('entity_id', sql.Int, activity.entityId)
            .input('description', sql.NVarChar, activity.description)
            .input('ip_address', sql.NVarChar, activity.ipAddress)
            .query(`
                INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description, ip_address)
                VALUES (@user_id, @action, @entity_type, @entity_id, @description, @ip_address)
            `);
    }

    async getRecent(limit: number = 10): Promise<ActivityLog[]> {
        const pool = await getConnection();
        const result = await pool
            .request()
            .input('limit', sql.Int, limit)
            .query(`
                SELECT al.*, u.full_name as user_name
                FROM activity_logs al
                LEFT JOIN users u ON al.user_id = u.id
                ORDER BY al.created_at DESC
                OFFSET 0 ROWS FETCH NEXT @limit ROWS ONLY
            `);
        
        return result.recordset;
    }

    async getByUser(userId: number, limit: number = 20): Promise<ActivityLog[]> {
        const pool = await getConnection();
        const result = await pool
            .request()
            .input('user_id', sql.Int, userId)
            .input('limit', sql.Int, limit)
            .query(`
                SELECT * FROM activity_logs
                WHERE user_id = @user_id
                ORDER BY created_at DESC
                OFFSET 0 ROWS FETCH NEXT @limit ROWS ONLY
            `);
        
        return result.recordset;
    }
}