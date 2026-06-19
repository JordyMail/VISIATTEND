// server/db/migrate_v2.ts
// Run: npx tsx server/db/migrate_v2.ts
import { getConnection, sql } from "./config.js";


async function migrateV2() {
  console.log("🔄  VISIATTEND V2 Migration starting...");
  const pool = await getConnection();

  // ── 1. Drop old role CHECK constraint (may have 'staff'/'preacher'/'member') ─
  console.log("  Dropping old role constraint...");
  await pool.request().query(`
    DECLARE @cn NVARCHAR(200);
    SELECT @cn = name FROM sys.check_constraints
      WHERE parent_object_id = OBJECT_ID('users') AND name LIKE '%role%';
    IF @cn IS NOT NULL
      EXEC('ALTER TABLE users DROP CONSTRAINT [' + @cn + ']');
  `);

  // ── 2. Migrate legacy role values before adding new constraint ────────────────
  console.log("  Migrating legacy role values...");
  await pool.request().query(`
    UPDATE users SET role = 'user'  WHERE role IN ('member','preacher','staff');
    UPDATE users SET role = 'admin' WHERE role NOT IN ('super_admin','admin','user');
  `);

  // ── 3. Add new role constraint (only 3 roles) ─────────────────────────────────
  console.log("  Adding new role constraint...");
  await pool.request().query(`
    IF NOT EXISTS (
      SELECT 1 FROM sys.check_constraints
      WHERE parent_object_id = OBJECT_ID('users') AND name = 'CK_users_role_v2'
    )
    ALTER TABLE users ADD CONSTRAINT CK_users_role_v2
      CHECK (role IN ('super_admin','admin','user'));
  `);

  // ── 4. Add jabatan column (organizational position label) ─────────────────────
  // jabatan: preacher | ketua | wakil_ketua | kepala_divisi | member_divisi | peserta
  console.log("  Adding jabatan column...");
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('users') AND name='jabatan')
      ALTER TABLE users ADD jabatan NVARCHAR(50) NULL;
  `);

  // ── 5. Add division column ────────────────────────────────────────────────────
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('users') AND name='division')
      ALTER TABLE users ADD division NVARCHAR(100) NULL;
  `);

  // ── 6. Add avatar_url column ──────────────────────────────────────────────────
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('users') AND name='avatar_url')
      ALTER TABLE users ADD avatar_url NVARCHAR(500) NULL;
  `);

  // ── 7. Divisions table ────────────────────────────────────────────────────────
  console.log("  Creating divisions table...");
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='divisions' AND xtype='U')
    CREATE TABLE divisions (
      id          INT IDENTITY(1,1) PRIMARY KEY,
      name        NVARCHAR(100) NOT NULL,
      description NVARCHAR(500),
      leader_id   INT NULL REFERENCES users(id) ON DELETE SET NULL,
      is_active   BIT DEFAULT 1,
      created_at  DATETIME DEFAULT GETDATE()
    );
  `);

  // ── 8. Schedules table ────────────────────────────────────────────────────────
  console.log("  Creating schedules table...");
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='schedules' AND xtype='U')
    CREATE TABLE schedules (
      id             INT IDENTITY(1,1) PRIMARY KEY,
      event_id       INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      scheduled_date DATE NOT NULL,
      start_time     NVARCHAR(10) NOT NULL,
      end_time       NVARCHAR(10) NULL,
      location       NVARCHAR(200) NULL,
      notes          NVARCHAR(500) NULL,
      created_by     INT NULL REFERENCES users(id) ON DELETE SET NULL,
      created_at     DATETIME DEFAULT GETDATE()
    );
  `);

  // ── 9. Announcements table ────────────────────────────────────────────────────
  console.log("  Creating announcements table...");
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='announcements' AND xtype='U')
    CREATE TABLE announcements (
      id         INT IDENTITY(1,1) PRIMARY KEY,
      title      NVARCHAR(200) NOT NULL,
      body       NVARCHAR(MAX) NOT NULL,
      author_id  INT NULL REFERENCES users(id) ON DELETE SET NULL,
      is_active  BIT DEFAULT 1,
      pinned     BIT DEFAULT 0,
      created_at DATETIME DEFAULT GETDATE(),
      updated_at DATETIME DEFAULT GETDATE()
    );
  `);

  // ── 10. QR tokens table ───────────────────────────────────────────────────────
  console.log("  Creating qr_tokens table...");
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='qr_tokens' AND xtype='U')
    CREATE TABLE qr_tokens (
      id         INT IDENTITY(1,1) PRIMARY KEY,
      event_id   INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      token      NVARCHAR(100) NOT NULL UNIQUE,
      valid_date DATE NOT NULL,
      expires_at DATETIME NOT NULL,
      created_by INT NULL REFERENCES users(id) ON DELETE SET NULL,
      created_at DATETIME DEFAULT GETDATE()
    );
  `);

  // ── 11. Password resets table (if missing) ────────────────────────────────────
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='password_resets' AND xtype='U')
    CREATE TABLE password_resets (
      id         INT IDENTITY(1,1) PRIMARY KEY,
      user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reset_code NVARCHAR(10) NOT NULL,
      expires_at DATETIME NOT NULL,
      is_used    BIT DEFAULT 0,
      created_at DATETIME DEFAULT GETDATE()
    );
  `);

  // ── 12. Update events: remove preacher_id dependency (now flexible) ───────────
  // Remove old check constraint on event_type if it includes something wrong
  await pool.request().query(`
    DECLARE @ecn NVARCHAR(200);
    SELECT @ecn = name FROM sys.check_constraints
      WHERE parent_object_id = OBJECT_ID('events') AND name LIKE '%event_type%';
    IF @ecn IS NOT NULL
      EXEC('ALTER TABLE events DROP CONSTRAINT [' + @ecn + ']');
  `);
  await pool.request().query(`
    IF NOT EXISTS (
      SELECT 1 FROM sys.check_constraints
      WHERE parent_object_id = OBJECT_ID('events') AND name = 'CK_events_type_v2'
    )
    ALTER TABLE events ADD CONSTRAINT CK_events_type_v2
      CHECK (event_type IN ('worship','meeting','study','fellowship','outreach'));
  `);

  // ── 13. System settings ───────────────────────────────────────────────────────
  console.log("  Upserting system settings...");
  const settings = [
    ["lateness_threshold",  "15",                "integer", "Minutes after event start to mark as late"],
    ["enable_notifications","true",              "boolean", "Send notifications for attendance events"],
    ["enable_leaderboard",  "true",              "boolean", "Show ranking/leaderboard"],
    ["auto_backup",         "false",             "boolean", "Auto backup database daily"],
    ["maintenance_mode",    "false",             "boolean", "Restrict access for maintenance"],
    ["org_name",            "VISIATTEND Church", "string",  "Organization name"],
    ["org_logo_url",        "",                  "string",  "Organization logo URL"],
    ["qr_expiry_minutes",   "60",                "integer", "Minutes before QR token expires"],
    ["attendance_window",   "120",               "integer", "Minutes attendance window stays open"],
    ["ranking_enabled",     "true",              "boolean", "Show ranking/leaderboard to users"],
    ["ranking_period",      "month",             "string",  "Default ranking period: week|month|semester"],
    ["allow_self_checkin",  "true",              "boolean", "Allow users to self check-in"],
    ["streak_enabled",      "true",              "boolean", "Enable attendance streak tracking"],
  ];
  for (const [k, v, t, d] of settings) {
    await pool.request()
      .input("k", sql.NVarChar, k).input("v", sql.NVarChar, v)
      .input("t", sql.NVarChar, t).input("d", sql.NVarChar, d)
      .query(`
        IF NOT EXISTS (SELECT 1 FROM system_settings WHERE setting_key=@k)
          INSERT INTO system_settings (setting_key,setting_value,setting_type,description)
          VALUES (@k,@v,@t,@d)
      `);
  }

  // ── 14. Remove old constraint on attendance status if includes wrong values ───
  await pool.request().query(`
    DECLARE @acn NVARCHAR(200);
    SELECT @acn = name FROM sys.check_constraints
      WHERE parent_object_id = OBJECT_ID('attendance') AND name LIKE '%status%';
    IF @acn IS NOT NULL
      EXEC('ALTER TABLE attendance DROP CONSTRAINT [' + @acn + ']');
  `);
  await pool.request().query(`
    IF NOT EXISTS (
      SELECT 1 FROM sys.check_constraints
      WHERE parent_object_id = OBJECT_ID('attendance') AND name = 'CK_attendance_status_v2'
    )
    ALTER TABLE attendance ADD CONSTRAINT CK_attendance_status_v2
      CHECK (status IN ('present','late','excused','sick','absent'));
  `);

  // ── 15. Add notes column to attendance if missing ─────────────────────────────
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('attendance') AND name='notes')
      ALTER TABLE attendance ADD notes NVARCHAR(500) NULL;
  `);

  console.log("✅  V2 migration complete!\n");
  process.exit(0);
}

// server/db/migrate_v2.ts - Tambahkan fungsi ini

async function createQuestionsSystem() {
  console.log("  Creating questions system tables...");
  const pool = await getConnection();
  
  // Questions table
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='questions' AND xtype='U')
    CREATE TABLE questions (
      id INT IDENTITY(1,1) PRIMARY KEY,
      title NVARCHAR(200) NOT NULL,
      question_text NVARCHAR(MAX) NOT NULL,
      question_type NVARCHAR(20) NOT NULL CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer')),
      options NVARCHAR(MAX),
      correct_answer NVARCHAR(500),
      points INT DEFAULT 10,
      time_limit_minutes INT DEFAULT 5,
      is_active BIT DEFAULT 1,
      created_by INT NULL REFERENCES users(id) ON DELETE SET NULL,
      start_date DATETIME NULL,
      end_date DATETIME NULL,
      max_attempts INT DEFAULT 1,
      created_at DATETIME DEFAULT GETDATE(),
      updated_at DATETIME DEFAULT GETDATE()
    );
  `);

  // User answers table
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='user_answers' AND xtype='U')
    CREATE TABLE user_answers (
      id INT IDENTITY(1,1) PRIMARY KEY,
      user_id INT NOT NULL,
      question_id INT NOT NULL,
      answer_text NVARCHAR(MAX) NOT NULL,
      is_correct BIT DEFAULT 0,
      points_earned INT DEFAULT 0,
      time_spent_seconds INT,
      attempt_number INT DEFAULT 1,
      answered_at DATETIME DEFAULT GETDATE(),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
    );
  `);

  // User points table
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='user_points' AND xtype='U')
    CREATE TABLE user_points (
      id INT IDENTITY(1,1) PRIMARY KEY,
      user_id INT NOT NULL UNIQUE,
      total_points INT DEFAULT 0,
      questions_answered INT DEFAULT 0,
      correct_answers INT DEFAULT 0,
      streak_count INT DEFAULT 0,
      last_answered_at DATETIME,
      updated_at DATETIME DEFAULT GETDATE(),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  console.log("  ✅ Questions system tables created");
}

migrateV2().catch((e) => { console.error("❌ Migration failed:", e); process.exit(1); });