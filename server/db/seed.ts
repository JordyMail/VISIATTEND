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
                .input('member_id', sql.NVarChar, 'ADMIN001')
                .input('email', sql.NVarChar, 'admin@gmail.com')
                .input('password_hash', sql.NVarChar, hashedPassword)
                .input('role', sql.NVarChar, 'admin')
                .input('phone_number', sql.NVarChar, '081234567890')
                .query(`
                    INSERT INTO users (full_name, member_id, email, password_hash, role, phone_number, is_active, email_verified)
                    VALUES (@full_name, @member_id, @email, @password_hash, @role, @phone_number, 1, 1)
                `);
        }
        
        // Get admin id
        const adminResult = await pool.request()
            .query(`SELECT id FROM users WHERE email = 'admin@gmail.com'`);
        const adminId = adminResult.recordset[0].id;
        
        // Create sample events
        const eventsCheck = await pool.request()
            .query(`SELECT COUNT(*) as count FROM events`);
        
        if (eventsCheck.recordset[0].count === 0) {
            console.log('📝 Creating sample events...');
            const events = [
                { code: 'W001', name: 'Sunday Worship Service', type: 'worship', season: '2024 Season' },
                { code: 'M001', name: 'Prayer Meeting', type: 'meeting', season: '2024 Season' },
                { code: 'S001', name: 'Bible Study', type: 'study', season: '2024 Season' },
            ];
            
            for (const event of events) {
                await pool.request()
                    .input('event_code', sql.NVarChar, event.code)
                    .input('event_name', sql.NVarChar, event.name)
                    .input('description', sql.NVarChar, null)
                    .input('preacher_id', sql.Int, adminId)
                    .input('season', sql.NVarChar, event.season)
                    .input('event_type', sql.NVarChar, event.type)
                    .query(`
                        INSERT INTO events (event_code, event_name, description, preacher_id, season, event_type, is_active)
                        VALUES (@event_code, @event_name, @description, @preacher_id, @season, @event_type, 1)
                    `);
            }
        }
        
        console.log('✅ Seeding completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
}

seedDatabase();