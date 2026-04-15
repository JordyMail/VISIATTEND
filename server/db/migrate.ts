import { getConnection, sql } from './config.js';

async function createTables() {
    try {
        console.log('📦 Connecting to database...');
        const pool = await getConnection();
        
        // 1. Users table
        console.log('Creating users table...');
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='users' AND xtype='U')
            CREATE TABLE users (
                id INT IDENTITY(1,1) PRIMARY KEY,
                full_name NVARCHAR(100) NOT NULL,
                member_id NVARCHAR(50) UNIQUE NOT NULL,
                email NVARCHAR(100) UNIQUE NOT NULL,
                password_hash NVARCHAR(255) NOT NULL,
                role NVARCHAR(20) NOT NULL CHECK (role IN ('admin', 'preacher', 'member', 'staff')),
                phone_number NVARCHAR(20),
                is_active BIT DEFAULT 1,
                email_verified BIT DEFAULT 0,
                last_login DATETIME,
                created_at DATETIME DEFAULT GETDATE(),
                updated_at DATETIME DEFAULT GETDATE()
            )
        `);
        
        // 2. Events table
        console.log('Creating events table...');
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='events' AND xtype='U')
            CREATE TABLE events (
                id INT IDENTITY(1,1) PRIMARY KEY,
                event_code NVARCHAR(20) UNIQUE NOT NULL,
                event_name NVARCHAR(100) NOT NULL,
                description NVARCHAR(500),
                preacher_id INT,
                season NVARCHAR(50),
                event_type NVARCHAR(20) NOT NULL CHECK (event_type IN ('worship', 'meeting', 'study', 'fellowship', 'outreach')),
                is_active BIT DEFAULT 1,
                created_at DATETIME DEFAULT GETDATE(),
                updated_at DATETIME DEFAULT GETDATE(),
                FOREIGN KEY (preacher_id) REFERENCES users(id) ON DELETE SET NULL
            )
        `);
        
        // 3. Event Enrollments table
        console.log('Creating event_enrollments table...');
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='event_enrollments' AND xtype='U')
            CREATE TABLE event_enrollments (
                id INT IDENTITY(1,1) PRIMARY KEY,
                event_id INT NOT NULL,
                user_id INT NOT NULL,
                enrolled_at DATETIME DEFAULT GETDATE(),
                is_active BIT DEFAULT 1,
                FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                CONSTRAINT UQ_event_user UNIQUE(event_id, user_id)
            )
        `);
        
        // 4. Attendance table
        console.log('Creating attendance table...');
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='attendance' AND xtype='U')
            CREATE TABLE attendance (
                id INT IDENTITY(1,1) PRIMARY KEY,
                user_id INT NOT NULL,
                event_id INT NOT NULL,
                attendance_date DATE NOT NULL,
                check_in_time DATETIME NOT NULL,
                check_out_time DATETIME,
                status NVARCHAR(20) NOT NULL CHECK (status IN ('present', 'late', 'excused', 'sick', 'absent')),
                confidence_score DECIMAL(5,2),
                liveness_verified BIT DEFAULT 0,
                device_info NVARCHAR(255),
                notes NVARCHAR(500),
                created_at DATETIME DEFAULT GETDATE(),
                updated_at DATETIME DEFAULT GETDATE(),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
                CONSTRAINT UQ_attendance_user_event_date UNIQUE(user_id, event_id, attendance_date)
            )
        `);
        
        // 5. Sessions table
        console.log('Creating sessions table...');
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='sessions' AND xtype='U')
            CREATE TABLE sessions (
                id INT IDENTITY(1,1) PRIMARY KEY,
                user_id INT NOT NULL,
                access_token NVARCHAR(500) NOT NULL,
                refresh_token NVARCHAR(500) NOT NULL,
                expires_at DATETIME NOT NULL,
                created_at DATETIME DEFAULT GETDATE(),
                last_activity DATETIME DEFAULT GETDATE(),
                ip_address NVARCHAR(45),
                user_agent NVARCHAR(255),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        
        // 6. Activity logs table
        console.log('Creating activity_logs table...');
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='activity_logs' AND xtype='U')
            CREATE TABLE activity_logs (
                id INT IDENTITY(1,1) PRIMARY KEY,
                user_id INT,
                action NVARCHAR(50) NOT NULL,
                entity_type NVARCHAR(50),
                entity_id INT,
                description NVARCHAR(500),
                ip_address NVARCHAR(45),
                created_at DATETIME DEFAULT GETDATE(),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            )
        `);
        
        // 7. System settings table
        console.log('Creating system_settings table...');
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='system_settings' AND xtype='U')
            CREATE TABLE system_settings (
                id INT IDENTITY(1,1) PRIMARY KEY,
                setting_key NVARCHAR(100) UNIQUE NOT NULL,
                setting_value NVARCHAR(MAX),
                setting_type NVARCHAR(20) DEFAULT 'string',
                description NVARCHAR(500),
                updated_at DATETIME DEFAULT GETDATE()
            )
        `);
        
        // Insert default settings
        console.log('Inserting default settings...');
        await pool.request().query(`
            IF NOT EXISTS (SELECT 1 FROM system_settings WHERE setting_key = 'lateness_threshold')
            INSERT INTO system_settings (setting_key, setting_value, setting_type, description) VALUES
            ('lateness_threshold', '15', 'integer', 'Minutes after which attendance is marked as late'),
            ('enable_notifications', 'true', 'boolean', 'Enable email notifications'),
            ('enable_leaderboard', 'true', 'boolean', 'Enable leaderboard feature'),
            ('auto_backup', 'false', 'boolean', 'Enable automatic database backup'),
            ('maintenance_mode', 'false', 'boolean', 'Put system in maintenance mode')
        `);
        
        console.log('✅ All tables created successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

createTables();