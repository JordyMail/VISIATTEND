import { getConnection, sql } from '../config';

const SAFE_USER_SELECT = `
    u.id,
    u.full_name,
    u.user_id,
    u.email,
    u.role,
    u.phone_number,
    u.date_of_birth,
    u.category,
    u.total_points,
    u.is_active,
    u.email_verified,
    u.last_login,
    u.created_at,
    u.updated_at
`;

export interface UserCreateInput {
    fullName: string;
    userId: string;
    email: string;
    passwordHash: string;
    role: 'admin' | 'preacher' | 'member' | 'staff';
    phoneNumber?: string;
    dateOfBirth?: string;
    category?: 'student' | 'other';
}

export interface UserUpdateInput {
    fullName?: string;
    email?: string;
    phoneNumber?: string;
    dateOfBirth?: string;
    category?: 'student' | 'other';
    role?: 'admin' | 'preacher' | 'member' | 'staff';
    isActive?: boolean;
}

export class UserRepository {
    async findAll(filters?: { role?: string; isActive?: boolean }) {
        const pool = await getConnection();
        const request = pool.request();
        let query = `SELECT ${SAFE_USER_SELECT} FROM users u WHERE 1=1`;

        if (filters?.role) {
            query += ` AND role = @role`;
            request.input('role', sql.NVarChar, filters.role);
        }

        if (filters?.isActive !== undefined) {
            query += ` AND is_active = @is_active`;
            request.input('is_active', sql.Bit, filters.isActive);
        }

        query += ` ORDER BY created_at DESC`;

        const result = await request.query(query);
        return result.recordset;
    }

    async findById(id: number) {
        const pool = await getConnection();
        const result = await pool
            .request()
            .input('id', sql.Int, id)
            .query(`
                SELECT ${SAFE_USER_SELECT}, s.total_hadir, s.total_check_in, s.total_check_out
                FROM users u
                LEFT JOIN attendance_summary s ON s.user_id = u.id
                WHERE u.id = @id
            `);

        return result.recordset[0] || null;
    }

    async findByEmail(email: string) {
        const pool = await getConnection();
        const result = await pool
            .request()
            .input('email', sql.NVarChar, email)
            .query(`SELECT * FROM users WHERE email = @email`);

        return result.recordset[0] || null;
    }

    async findByUserId(userId: string) {
        const pool = await getConnection();
        const result = await pool
            .request()
            .input('user_id', sql.NVarChar, userId)
            .query(`SELECT ${SAFE_USER_SELECT} FROM users u WHERE u.user_id = @user_id`);

        return result.recordset[0] || null;
    }

    async create(user: UserCreateInput) {
        const pool = await getConnection();
        const result = await pool
            .request()
            .input('full_name', sql.NVarChar, user.fullName)
            .input('user_id', sql.NVarChar, user.userId)
            .input('email', sql.NVarChar, user.email)
            .input('password_hash', sql.NVarChar, user.passwordHash)
            .input('role', sql.NVarChar, user.role)
            .input('phone_number', sql.NVarChar, user.phoneNumber ?? null)
            .input('date_of_birth', sql.Date, user.dateOfBirth ?? null)
            .input('category', sql.NVarChar, user.category ?? null)
            .query(`
                INSERT INTO users (full_name, user_id, email, password_hash, role, phone_number, date_of_birth, category)
                OUTPUT
                    INSERTED.id,
                    INSERTED.full_name,
                    INSERTED.user_id,
                    INSERTED.email,
                    INSERTED.role,
                    INSERTED.phone_number,
                    INSERTED.date_of_birth,
                    INSERTED.category,
                    INSERTED.total_points,
                    INSERTED.is_active,
                    INSERTED.email_verified,
                    INSERTED.last_login,
                    INSERTED.created_at,
                    INSERTED.updated_at
                VALUES (@full_name, @user_id, @email, @password_hash, @role, @phone_number, @date_of_birth, @category)
            `);

        return result.recordset[0];
    }

    async update(id: number, user: UserUpdateInput) {
        const pool = await getConnection();
        const request = pool.request().input('id', sql.Int, id);
        const updates: string[] = ['updated_at = GETDATE()'];

        if (user.fullName !== undefined) {
            updates.push('full_name = @full_name');
            request.input('full_name', sql.NVarChar, user.fullName);
        }

        if (user.email !== undefined) {
            updates.push('email = @email');
            request.input('email', sql.NVarChar, user.email);
        }

        if (user.phoneNumber !== undefined) {
            updates.push('phone_number = @phone_number');
            request.input('phone_number', sql.NVarChar, user.phoneNumber);
        }

        if (user.dateOfBirth !== undefined) {
            updates.push('date_of_birth = @date_of_birth');
            request.input('date_of_birth', sql.Date, user.dateOfBirth ?? null);
        }

        if (user.category !== undefined) {
            updates.push('category = @category');
            request.input('category', sql.NVarChar, user.category);
        }

        if (user.role !== undefined) {
            updates.push('role = @role');
            request.input('role', sql.NVarChar, user.role);
        }

        if (user.isActive !== undefined) {
            updates.push('is_active = @is_active');
            request.input('is_active', sql.Bit, user.isActive);
        }

        await request.query(`
            UPDATE users
            SET ${updates.join(', ')}
            WHERE id = @id
        `);

        return this.findById(id);
    }

    async updatePassword(id: number, passwordHash: string) {
        const pool = await getConnection();
        await pool
            .request()
            .input('id', sql.Int, id)
            .input('password_hash', sql.NVarChar, passwordHash)
            .query(`
                UPDATE users
                SET password_hash = @password_hash, updated_at = GETDATE()
                WHERE id = @id
            `);
    }

    async updateLastLogin(id: number) {
        const pool = await getConnection();
        await pool
            .request()
            .input('id', sql.Int, id)
            .query(`UPDATE users SET last_login = GETDATE(), updated_at = GETDATE() WHERE id = @id`);
    }

    async setTotalPoints(userId: number, totalPoints: number) {
        const pool = await getConnection();
        await pool
            .request()
            .input('user_id', sql.Int, userId)
            .input('total_points', sql.Int, totalPoints)
            .query(`
                UPDATE users
                SET total_points = @total_points, updated_at = GETDATE()
                WHERE id = @user_id
            `);
    }

    async toggleStatus(id: number) {
        const pool = await getConnection();
        await pool
            .request()
            .input('id', sql.Int, id)
            .query(`
                UPDATE users
                SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END,
                    updated_at = GETDATE()
                WHERE id = @id
            `);

        return this.findById(id);
    }

    async delete(id: number) {
        const pool = await getConnection();
        const result = await pool
            .request()
            .input('id', sql.Int, id)
            .query(`DELETE FROM users WHERE id = @id`);

        return result.rowsAffected[0] > 0;
    }
}