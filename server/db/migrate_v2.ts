// server/db/migrate_v2.ts
// Run with: npx tsx server/db/migrate_v2.ts
import { getConnection, sql } from "./config.js";

async function migrateV2() {
  console.log("🔄 Running V2 migration...");
  const pool = await getConnection();

  // ── 1. Update users.role CHECK constraint to include super_admin ─────────────
  console.log("Updating users role constraint...");
  try {
    // Drop existing check constraint (name may vary, try common names)
    await pool.request().query(`
      DECLARE @cname NVARCHAR(200);
      SELECT @cname = name FROM sys.check_constraints
        WHERE parent_object_id = OBJECT_ID('users') AND name LIKE '%role%';
      IF @cname IS NOT NULL
        EXEC('ALTER TABLE users DROP CONSTRAINT [' + @cname + ']');
    `);
  } catch { /* ignore if not found */ }

  await pool.request().query(`
    IF NOT EXISTS (
      SELECT 1 FROM sys.check_constraints
      WHERE parent_object_id = OBJECT_ID('users') AND definition LIKE '%super_admin%'
    )
    ALTER TABLE users ADD CONSTRAINT CK_users_role
      CHECK (role IN ('super_admin','admin','user'));
  `);

  // ── 2. Rename old roles: 'member' → 'user', 'preacher'/'staff' → 'admin' ────
  console.log("Migrating existing role values...");
  await pool.request().query(`
    UPDATE users SET role = 'user'  WHERE role = 'member';
    UPDATE users SET role = 'admin' WHERE role IN ('preacher','staff');
  `);

  // ── 3. Add division column to users ──────────────────────────────────────────
  console.log("Adding division column to users...");
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('users') AND name='division')
      ALTER TABLE users ADD division NVARCHAR(100) NULL;
  `);

  // ── 4. Add avatar_url to users ───────────────────────────────────────────────
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('users') AND name='avatar_url')
      ALTER TABLE users ADD avatar_url NVARCHAR(500) NULL;
  `);

  // ── 5. Divisions table ────────────────────────────────────────────────────────
  console.log("Creating divisions table...");
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='divisions' AND xtype='U')
    CREATE TABLE divisions (
      id          INT IDENTITY(1,1) PRIMARY KEY,
      name        NVARCHAR(100) NOT NULL,
      description NVARCHAR(500),
      leader_id   INT REFERENCES users(id) ON DELETE SET NULL,
      is_active   BIT DEFAULT 1,
      created_at  DATETIME DEFAULT GETDATE()
    )
  `);

  // ── 6. QR tokens table (for attendance check-in) ─────────────────────────────
  console.log("Creating qr_tokens table...");
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='qr_tokens' AND xtype='U')
    CREATE TABLE qr_tokens (
      id         INT IDENTITY(1,1) PRIMARY KEY,
      event_id   INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      token      NVARCHAR(100) NOT NULL UNIQUE,
      valid_date DATE NOT NULL,
      expires_at DATETIME NOT NULL,
      created_by INT REFERENCES users(id) ON DELETE SET NULL,
      created_at DATETIME DEFAULT GETDATE()
    )
  `);

  // ── 7. Announcements table ────────────────────────────────────────────────────
  console.log("Creating announcements table...");
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='announcements' AND xtype='U')
    CREATE TABLE announcements (
      id         INT IDENTITY(1,1) PRIMARY KEY,
      title      NVARCHAR(200) NOT NULL,
      body       NVARCHAR(MAX) NOT NULL,
      author_id  INT REFERENCES users(id) ON DELETE SET NULL,
      is_active  BIT DEFAULT 1,
      pinned     BIT DEFAULT 0,
      created_at DATETIME DEFAULT GETDATE(),
      updated_at DATETIME DEFAULT GETDATE()
    )
  `);

  // ── 8. Schedules table ────────────────────────────────────────────────────────
  console.log("Creating schedules table...");
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='schedules' AND xtype='U')
    CREATE TABLE schedules (
      id          INT IDENTITY(1,1) PRIMARY KEY,
      event_id    INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      scheduled_date DATE NOT NULL,
      start_time  NVARCHAR(10) NOT NULL,
      end_time    NVARCHAR(10),
      location    NVARCHAR(200),
      notes       NVARCHAR(500),
      created_by  INT REFERENCES users(id) ON DELETE SET NULL,
      created_at  DATETIME DEFAULT GETDATE()
    )
  `);

  // ── 9. Password resets table (if missing) ────────────────────────────────────
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='password_resets' AND xtype='U')
    CREATE TABLE password_resets (
      id          INT IDENTITY(1,1) PRIMARY KEY,
      user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reset_code  NVARCHAR(10) NOT NULL,
      expires_at  DATETIME NOT NULL,
      is_used     BIT DEFAULT 0,
      created_at  DATETIME DEFAULT GETDATE()
    )
  `);

  // ── 10. Add extra system settings ────────────────────────────────────────────
  console.log("Updating system settings...");
  const newSettings = [
    ["org_name",             "VISIATTEND Church",    "string",  "Organization name"],
    ["org_logo_url",         "",                     "string",  "Organization logo URL"],
    ["qr_expiry_minutes",    "60",                   "integer", "Minutes before QR token expires"],
    ["attendance_window",    "120",                  "integer", "Minutes attendance window is open"],
    ["ranking_enabled",      "true",                 "boolean", "Show ranking/leaderboard"],
    ["ranking_period",       "month",                "string",  "Default ranking period: week|month|semester"],
    ["allow_self_checkin",   "true",                 "boolean", "Allow users to self check-in"],
    ["streak_enabled",       "true",                 "boolean", "Enable streak tracking"],
    ["late_threshold",       "15",                   "integer", "Minutes after start to mark as late"],
  ];

  for (const [key, value, type, desc] of newSettings) {
    await pool.request()
      .input("key",   sql.NVarChar, key)
      .input("value", sql.NVarChar, value)
      .input("type",  sql.NVarChar, type)
      .input("desc",  sql.NVarChar, desc)
      .query(`
        IF NOT EXISTS (SELECT 1 FROM system_settings WHERE setting_key = @key)
          INSERT INTO system_settings (setting_key, setting_value, setting_type, description)
          VALUES (@key, @value, @type, @desc)
      `);
  }

  console.log("✅ V2 migration complete!");
  process.exit(0);
}

migrateV2().catch((e) => { console.error("❌", e); process.exit(1); });