import { getConnection, sql } from '../config';
import { Event } from '../../../shared/types.ts';

export class EventRepository {
    async findAll(filters?: { isActive?: boolean; eventType?: string }): Promise<Event[]> {
        const pool = await getConnection();
        let query = `
            SELECT e.*, u.full_name as preacher_name
            FROM events e
            LEFT JOIN users u ON e.preacher_id = u.id
            WHERE 1=1
        `;
        
        const request = pool.request();
        
        if (filters?.isActive !== undefined) {
            query += ` AND e.is_active = @isActive`;
            request.input('isActive', sql.Bit, filters.isActive);
        }
        
        if (filters?.eventType) {
            query += ` AND e.event_type = @eventType`;
            request.input('eventType', sql.NVarChar, filters.eventType);
        }
        
        query += ` ORDER BY e.created_at DESC`;
        
        const result = await request.query(query);
        return result.recordset;
    }

    async findById(id: number): Promise<Event | null> {
        const pool = await getConnection();
        const result = await pool
            .request()
            .input('id', sql.Int, id)
            .query(`
                SELECT e.*, u.full_name as preacher_name
                FROM events e
                LEFT JOIN users u ON e.preacher_id = u.id
                WHERE e.id = @id
            `);
        
        return result.recordset[0] || null;
    }

    async create(event: Partial<Event>): Promise<Event> {
        const pool = await getConnection();
        const result = await pool
            .request()
            .input('event_code', sql.NVarChar, event.eventCode)
            .input('event_name', sql.NVarChar, event.eventName)
            .input('description', sql.NVarChar, event.description)
            .input('preacher_id', sql.Int, event.preacherId)
            .input('season', sql.NVarChar, event.season)
            .input('event_type', sql.NVarChar, event.eventType)
            .query(`
                INSERT INTO events (event_code, event_name, description, preacher_id, season, event_type)
                OUTPUT INSERTED.*
                VALUES (@event_code, @event_name, @description, @preacher_id, @season, @event_type)
            `);
        
        return result.recordset[0];
    }

    async update(id: number, event: Partial<Event>): Promise<Event | null> {
        const pool = await getConnection();
        const request = pool.request();
        
        let query = `UPDATE events SET updated_at = GETDATE()`;
        
        if (event.eventName) {
            query += `, event_name = @event_name`;
            request.input('event_name', sql.NVarChar, event.eventName);
        }
        if (event.description !== undefined) {
            query += `, description = @description`;
            request.input('description', sql.NVarChar, event.description);
        }
        if (event.preacherId !== undefined) {
            query += `, preacher_id = @preacher_id`;
            request.input('preacher_id', sql.Int, event.preacherId);
        }
        if (event.isActive !== undefined) {
            query += `, is_active = @is_active`;
            request.input('is_active', sql.Bit, event.isActive);
        }
        
        query += ` OUTPUT INSERTED.* WHERE id = @id`;
        request.input('id', sql.Int, id);
        
        const result = await request.query(query);
        return result.recordset[0] || null;
    }

    async delete(id: number): Promise<boolean> {
        const pool = await getConnection();
        const result = await pool
            .request()
            .input('id', sql.Int, id)
            .query(`DELETE FROM events WHERE id = @id`);
        
        return result.rowsAffected[0] > 0;
    }

    async getEnrolledMembers(eventId: number): Promise<any[]> {
        const pool = await getConnection();
        const result = await pool
            .request()
            .input('event_id', sql.Int, eventId)
            .query(`
                SELECT u.id, u.full_name, u.member_id, u.email, u.phone_number
                FROM event_enrollments ee
                JOIN users u ON ee.user_id = u.id
                WHERE ee.event_id = @event_id AND ee.is_active = 1
                ORDER BY u.full_name
            `);
        
        return result.recordset;
    }

    async enrollMember(eventId: number, userId: number): Promise<void> {
        const pool = await getConnection();
        await pool
            .request()
            .input('event_id', sql.Int, eventId)
            .input('user_id', sql.Int, userId)
            .query(`
                MERGE INTO event_enrollments AS target
                USING (SELECT @event_id as event_id, @user_id as user_id) AS source
                ON target.event_id = source.event_id AND target.user_id = source.user_id
                WHEN MATCHED THEN
                    UPDATE SET is_active = 1
                WHEN NOT MATCHED THEN
                    INSERT (event_id, user_id) VALUES (@event_id, @user_id)
            `);
    }
}