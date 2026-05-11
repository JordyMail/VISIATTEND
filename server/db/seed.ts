import { getConnection, sql } from './config.js';
import bcrypt from 'bcrypt';

async function seedDatabase() {
    try {
        console.log('🌱 Seeding database...');
        const pool = await getConnection();
        
        // Hash password
        const hashedPassword = await bcrypt.hash('123', 10);
        
        // Check if admin exists
        const adminCheck = await pool.request()
            .query(`SELECT id FROM users WHERE email = 'admin@gmail.com'`);
        
        if (adminCheck.recordset.length === 0) {
            console.log('📝 Creating admin user...');
            await pool.request()
                .input('full_name', sql.NVarChar, 'Admin User')
                .input('user_id', sql.NVarChar, 'ADMIN001')
                .input('email', sql.NVarChar, 'admin@gmail.com')
                .input('password_hash', sql.NVarChar, hashedPassword)
                .input('role', sql.NVarChar, 'admin')
                .input('phone_number', sql.NVarChar, '081234567890')
                .query(`
                    INSERT INTO users (full_name, user_id, email, password_hash, role, phone_number, is_active, email_verified)
                    VALUES (@full_name, @user_id, @email, @password_hash, @role, @phone_number, 1, 1)
                `);
        }
        
        // Get admin id
        const adminResult = await pool.request()
            .query(`SELECT id FROM users WHERE email = 'admin@gmail.com'`);
        const adminId = adminResult.recordset[0].id;

        console.log(`✅ Admin user ready with id ${adminId}`);
        
        console.log('✅ Seeding completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
}

seedDatabase();