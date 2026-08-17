// server/db/seed.ts
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
        
        // Check if event_schedule table exists (V2 structure)
        const eventScheduleTableCheck = await pool.request()
            .query(`SELECT 1 FROM sysobjects WHERE name='event_schedule' AND xtype='U'`);
            
        if (eventScheduleTableCheck.recordset.length > 0) {
            console.log('📝 Checking sample events in event_schedule...');
            const events = [
                { code: 'W001', name: 'Sunday Worship Service', desc: 'Worship service', daysOffset: 0 },
                { code: 'M001', name: 'Prayer Meeting', desc: 'Prayer gathering', daysOffset: 1 },
                { code: 'S001', name: 'Bible Study', desc: 'Bible study session', daysOffset: -1 },
            ];
            
            for (const event of events) {
                const eventCheck = await pool.request()
                    .input('event_code', sql.NVarChar, event.code)
                    .query(`SELECT 1 FROM event_schedule WHERE event_code = @event_code`);
                
                if (eventCheck.recordset.length === 0) {
                    const eventDate = new Date();
                    eventDate.setDate(eventDate.getDate() + event.daysOffset);
                    const dateStr = eventDate.toISOString().split('T')[0];
                    
                    // Ensure unique date_event
                    const dateCheck = await pool.request()
                        .input('date_event', sql.Date, dateStr)
                        .query(`SELECT 1 FROM event_schedule WHERE date_event = @date_event`);
                        
                    if (dateCheck.recordset.length === 0) {
                        console.log(`Creating event ${event.code} in event_schedule...`);
                        await pool.request()
                            .input('event_code', sql.NVarChar, event.code)
                            .input('event_name', sql.NVarChar, event.name)
                            .input('description', sql.NVarChar, event.desc)
                            .input('date_event', sql.Date, dateStr)
                            .query(`
                                INSERT INTO event_schedule (event_code, event_name, description, date_event, created_at, updated_at)
                                VALUES (@event_code, @event_name, @description, @date_event, GETDATE(), GETDATE())
                            `);
                    } else {
                        console.log(`Skipping event ${event.code} because date_event ${dateStr} is already taken.`);
                    }
                }
            }
        } else {
            // Fallback to legacy events table (V1 structure)
            const eventsCheck = await pool.request()
                .query(`SELECT COUNT(*) as count FROM events`);
            
            if (eventsCheck.recordset[0].count === 0) {
                console.log('📝 Creating sample events in legacy events table...');
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
        }
        
        console.log('✅ Seeding completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
}

seedDatabase();