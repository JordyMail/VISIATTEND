-- ============================================
-- VISIATTEND Database Schema
-- Database: VISIATTEND_DB
-- ============================================

-- Create Database
CREATE DATABASE VISIATTEND_DB;
GO

USE VISIATTEND_DB;
GO

-- ============================================
-- 1. USERS TABLE
-- ============================================
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
);

-- Create index for faster searches
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_member_id ON users(member_id);
CREATE INDEX idx_users_role ON users(role);

-- ============================================
-- 2. EVENTS TABLE
-- ============================================
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
);

-- Create indexes
CREATE INDEX idx_events_event_code ON events(event_code);
CREATE INDEX idx_events_preacher ON events(preacher_id);
CREATE INDEX idx_events_type ON events(event_type);

-- ============================================
-- 3. EVENT_ENROLLMENTS TABLE (Many-to-Many)
-- ============================================
CREATE TABLE event_enrollments (
    id INT IDENTITY(1,1) PRIMARY KEY,
    event_id INT NOT NULL,
    user_id INT NOT NULL,
    enrolled_at DATETIME DEFAULT GETDATE(),
    is_active BIT DEFAULT 1,
    UNIQUE(event_id, user_id),
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_enrollments_event ON event_enrollments(event_id);
CREATE INDEX idx_enrollments_user ON event_enrollments(user_id);

-- ============================================
-- 4. ATTENDANCE TABLE
-- ============================================
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
    face_image_url NVARCHAR(500),
    notes NVARCHAR(500),
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    UNIQUE(user_id, event_id, attendance_date)
);

-- Create indexes for performance
CREATE INDEX idx_attendance_user ON attendance(user_id);
CREATE INDEX idx_attendance_event ON attendance(event_id);
CREATE INDEX idx_attendance_date ON attendance(attendance_date);
CREATE INDEX idx_attendance_status ON attendance(status);
CREATE INDEX idx_attendance_user_date ON attendance(user_id, attendance_date);

-- ============================================
-- 5. ACHIEVEMENTS TABLE
-- ============================================
CREATE TABLE achievements (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL,
    description NVARCHAR(500),
    icon NVARCHAR(50),
    criteria_type NVARCHAR(50) NOT NULL CHECK (criteria_type IN ('attendance_count', 'perfect_attendance', 'streak', 'early_bird', 'custom')),
    criteria_value INT,
    badge_image_url NVARCHAR(500),
    created_at DATETIME DEFAULT GETDATE()
);

-- ============================================
-- 6. USER_ACHIEVEMENTS TABLE
-- ============================================
CREATE TABLE user_achievements (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    achievement_id INT NOT NULL,
    earned_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE,
    UNIQUE(user_id, achievement_id)
);

-- ============================================
-- 7. SESSIONS TABLE (for auth)
-- ============================================
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
);

CREATE INDEX idx_sessions_access_token ON sessions(access_token);
CREATE INDEX idx_sessions_refresh_token ON sessions(refresh_token);

-- ============================================
-- 8. ACTIVITY_LOGS TABLE
-- ============================================
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
);

CREATE INDEX idx_activity_user ON activity_logs(user_id);
CREATE INDEX idx_activity_created ON activity_logs(created_at);

-- ============================================
-- 9. SYSTEM_SETTINGS TABLE
-- ============================================
CREATE TABLE system_settings (
    id INT IDENTITY(1,1) PRIMARY KEY,
    setting_key NVARCHAR(100) UNIQUE NOT NULL,
    setting_value NVARCHAR(MAX),
    setting_type NVARCHAR(20) DEFAULT 'string',
    description NVARCHAR(500),
    updated_at DATETIME DEFAULT GETDATE()
);

-- Insert default settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, description) VALUES
('lateness_threshold', '15', 'integer', 'Minutes after which attendance is marked as late'),
('enable_notifications', 'true', 'boolean', 'Enable email notifications'),
('enable_leaderboard', 'true', 'boolean', 'Enable leaderboard feature'),
('auto_backup', 'false', 'boolean', 'Enable automatic database backup'),
('maintenance_mode', 'false', 'boolean', 'Put system in maintenance mode');

-- ============================================
-- 10. PASSWORD_RESETS TABLE
-- ============================================
CREATE TABLE password_resets (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    reset_code NVARCHAR(10) NOT NULL,
    expires_at DATETIME NOT NULL,
    is_used BIT DEFAULT 0,
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_resets_code ON password_resets(reset_code);

-- ============================================
-- TRIGGERS
-- ============================================

-- Update updated_at timestamp
CREATE TRIGGER tr_users_update ON users
AFTER UPDATE AS
BEGIN
    UPDATE users SET updated_at = GETDATE()
    WHERE id IN (SELECT DISTINCT id FROM inserted)
END
GO

CREATE TRIGGER tr_events_update ON events
AFTER UPDATE AS
BEGIN
    UPDATE events SET updated_at = GETDATE()
    WHERE id IN (SELECT DISTINCT id FROM inserted)
END
GO

CREATE TRIGGER tr_attendance_update ON attendance
AFTER UPDATE AS
BEGIN
    UPDATE attendance SET updated_at = GETDATE()
    WHERE id IN (SELECT DISTINCT id FROM inserted)
END
GO

-- ============================================
-- STORED PROCEDURES
-- ============================================

-- Get attendance statistics for a user
CREATE PROCEDURE sp_get_user_attendance_stats
    @user_id INT,
    @start_date DATE = NULL,
    @end_date DATE = NULL
AS
BEGIN
    SELECT 
        COUNT(CASE WHEN status = 'present' THEN 1 END) AS present_count,
        COUNT(CASE WHEN status = 'late' THEN 1 END) AS late_count,
        COUNT(CASE WHEN status = 'excused' THEN 1 END) AS excused_count,
        COUNT(CASE WHEN status = 'sick' THEN 1 END) AS sick_count,
        COUNT(CASE WHEN status = 'absent' THEN 1 END) AS absent_count,
        COUNT(*) AS total_count,
        CAST(ROUND(
            CAST(COUNT(CASE WHEN status IN ('present', 'late') THEN 1 END) AS FLOAT) / 
            NULLIF(COUNT(*), 0) * 100, 2
        ) AS DECIMAL(5,2)) AS attendance_percentage
    FROM attendance
    WHERE user_id = @user_id
        AND (@start_date IS NULL OR attendance_date >= @start_date)
        AND (@end_date IS NULL OR attendance_date <= @end_date)
END
GO

-- Get leaderboard data
CREATE PROCEDURE sp_get_leaderboard
    @event_id INT,
    @period NVARCHAR(20) -- 'week', 'month', 'semester'
AS
BEGIN
    DECLARE @start_date DATE;
    
    SET @start_date = CASE @period
        WHEN 'week' THEN DATEADD(DAY, -7, GETDATE())
        WHEN 'month' THEN DATEADD(MONTH, -1, GETDATE())
        WHEN 'semester' THEN DATEADD(MONTH, -6, GETDATE())
        ELSE DATEADD(MONTH, -1, GETDATE())
    END;
    
    SELECT 
        u.id AS user_id,
        u.full_name,
        u.member_id,
        COUNT(CASE WHEN a.status IN ('present', 'late') THEN 1 END) AS total_present,
        COUNT(CASE WHEN a.status = 'late' THEN 1 END) AS total_late,
        CAST(ROUND(
            CAST(COUNT(CASE WHEN a.status IN ('present', 'late') THEN 1 END) AS FLOAT) / 
            NULLIF(COUNT(*), 0) * 100, 2
        ) AS DECIMAL(5,2)) AS attendance_percentage
    FROM users u
    JOIN attendance a ON u.id = a.user_id
    WHERE a.event_id = @event_id
        AND a.attendance_date >= @start_date
        AND u.role = 'member'
    GROUP BY u.id, u.full_name, u.member_id
    ORDER BY attendance_percentage DESC, total_present DESC
END
GO