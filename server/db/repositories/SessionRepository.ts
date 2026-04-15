import { getConnection, sql } from '../config';

export interface Session {
    id: number;
    userId: number;
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
    lastActivity: Date;
}

export class SessionRepository {
    async create(session: Partial<Session>): Promise<Session> {
        const pool = await getConnection();
        const result = await pool
            .request()
            .input('user_id', sql.Int, session.userId)
            .input('access_token', sql.NVarChar, session.accessToken)
            .input('refresh_token', sql.NVarChar, session.refreshToken)
            .input('expires_at', sql.DateTime, session.expiresAt)
            .input('ip_address', sql.NVarChar, session.ipAddress)
            .query(`
                INSERT INTO sessions (user_id, access_token, refresh_token, expires_at, ip_address)
                OUTPUT INSERTED.*
                VALUES (@user_id, @access_token, @refresh_token, @expires_at, @ip_address)
            `);
        
        return result.recordset[0];
    }

    async findByAccessToken(accessToken: string): Promise<Session | null> {
        const pool = await getConnection();
        const result = await pool
            .request()
            .input('access_token', sql.NVarChar, accessToken)
            .query(`
                SELECT * FROM sessions 
                WHERE access_token = @access_token AND expires_at > GETDATE()
            `);
        
        return result.recordset[0] || null;
    }

    async findByRefreshToken(refreshToken: string): Promise<Session | null> {
        const pool = await getConnection();
        const result = await pool
            .request()
            .input('refresh_token', sql.NVarChar, refreshToken)
            .query(`
                SELECT * FROM sessions 
                WHERE refresh_token = @refresh_token AND expires_at > GETDATE()
            `);
        
        return result.recordset[0] || null;
    }

    async updateLastActivity(id: number): Promise<void> {
        const pool = await getConnection();
        await pool
            .request()
            .input('id', sql.Int, id)
            .query(`UPDATE sessions SET last_activity = GETDATE() WHERE id = @id`);
    }

    async delete(id: number): Promise<boolean> {
        const pool = await getConnection();
        const result = await pool
            .request()
            .input('id', sql.Int, id)
            .query(`DELETE FROM sessions WHERE id = @id`);
        
        return result.rowsAffected[0] > 0;
    }

    async deleteByUserId(userId: number): Promise<void> {
        const pool = await getConnection();
        await pool
            .request()
            .input('user_id', sql.Int, userId)
            .query(`DELETE FROM sessions WHERE user_id = @user_id`);
    }

    async cleanupExpired(): Promise<void> {
        const pool = await getConnection();
        await pool.query(`DELETE FROM sessions WHERE expires_at < GETDATE()`);
    }
}