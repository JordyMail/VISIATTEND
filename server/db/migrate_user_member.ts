// server/db/migrate_user_member.ts
// Run: npx tsx server/db/migrate_user_member.ts
import { getConnection } from "./config.js";

async function migrateUserMember() {
  console.log("🔄 Migrating user_member, point_logs, member_point, and attendance_member...");
  const pool = await getConnection();

  // 1) Rename legacy table [user member] -> user_member when needed
  await pool.request().query(`
    IF OBJECT_ID('[user member]', 'U') IS NOT NULL AND OBJECT_ID('user_member', 'U') IS NULL
      EXEC sp_rename '[user member]', 'user_member';
  `);

  // 2) Ensure user_member table exists
  await pool.request().query(`
    IF OBJECT_ID('user_member', 'U') IS NULL
    CREATE TABLE user_member (
      id INT IDENTITY(1,1) PRIMARY KEY,
      member_id NVARCHAR(20) NULL,
      name NVARCHAR(150) NOT NULL,
      email NVARCHAR(150) NOT NULL,
      category NVARCHAR(30) NOT NULL,
      phone NVARCHAR(40) NOT NULL,
      birthday DATE NOT NULL,
      created_at DATETIME DEFAULT GETDATE()
    );
  `);

  // 3) Ensure member_id column exists
  await pool.request().query(`
    IF NOT EXISTS (
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'user_member' AND COLUMN_NAME = 'member_id'
    )
      ALTER TABLE user_member ADD member_id NVARCHAR(20) NULL;

    IF NOT EXISTS (
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'user_member' AND COLUMN_NAME = 'photo_profile'
    )
      ALTER TABLE user_member ADD photo_profile NVARCHAR(500) NULL;
  `);

  // 4) Backfill member_id for existing rows
  await pool.request().query(`
    UPDATE user_member
    SET member_id = CASE
      WHEN id < 1000 THEN RIGHT('000' + CAST(id AS VARCHAR(10)), 3)
      ELSE CAST(id AS VARCHAR(10))
    END
    WHERE member_id IS NULL OR LTRIM(RTRIM(member_id)) = '';
  `);

  // 5) Ensure member_id is NOT NULL and UNIQUE CONSTRAINT (FK target requirement)
  await pool.request().query(`
    BEGIN TRY
      ALTER TABLE user_member ALTER COLUMN member_id NVARCHAR(20) NOT NULL;
    END TRY
    BEGIN CATCH
    END CATCH;

    IF NOT EXISTS (
      SELECT 1
      FROM sys.key_constraints
      WHERE parent_object_id = OBJECT_ID('user_member')
        AND type = 'UQ'
        AND name = 'UQ_user_member_member_id'
    )
      ALTER TABLE user_member
      ADD CONSTRAINT UQ_user_member_member_id UNIQUE (member_id);
  `);

  // 6) Trigger: auto-generate member_id after insert
  await pool.request().query(`
    IF OBJECT_ID('tr_user_member_generate_member_id', 'TR') IS NOT NULL
      DROP TRIGGER tr_user_member_generate_member_id;

    EXEC ('
      CREATE TRIGGER tr_user_member_generate_member_id ON user_member
      AFTER INSERT
      AS
      BEGIN
        SET NOCOUNT ON;

        UPDATE um
        SET member_id = CASE
          WHEN um.id < 1000 THEN RIGHT(''000'' + CAST(um.id AS VARCHAR(10)), 3)
          ELSE CAST(um.id AS VARCHAR(10))
        END
        FROM user_member um
        INNER JOIN inserted i ON um.id = i.id
        WHERE um.member_id IS NULL OR LTRIM(RTRIM(um.member_id)) = '''';
      END
    ');
  `);

  // 7) Normalize point_log/point_logs naming and user_id -> member_id
  await pool.request().query(`
    IF OBJECT_ID('point_log', 'U') IS NOT NULL AND OBJECT_ID('point_logs', 'U') IS NULL
      EXEC sp_rename 'point_log', 'point_logs';

    IF OBJECT_ID('point_logs', 'U') IS NULL
      CREATE TABLE point_logs (
        id INT IDENTITY(1,1) PRIMARY KEY,
        member_id NVARCHAR(20) NOT NULL,
        points INT NOT NULL,
        type NVARCHAR(50) NOT NULL,
        notes NVARCHAR(255) NULL,
        created_at DATETIME DEFAULT GETDATE()
      );

    IF OBJECT_ID('point_logs', 'U') IS NOT NULL
    BEGIN
      IF EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'point_logs' AND COLUMN_NAME = 'user_id'
      )
      AND NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'point_logs' AND COLUMN_NAME = 'member_id'
      )
        EXEC sp_rename 'point_logs.user_id', 'member_id', 'COLUMN';

      IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'point_logs' AND COLUMN_NAME = 'type'
      )
      BEGIN
        ALTER TABLE point_logs ADD type NVARCHAR(50) NULL;
        EXEC('UPDATE point_logs SET type = ''attendance'' WHERE type IS NULL');
        ALTER TABLE point_logs ALTER COLUMN type NVARCHAR(50) NOT NULL;
      END

      IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'point_logs' AND COLUMN_NAME = 'notes'
      )
        ALTER TABLE point_logs ADD notes NVARCHAR(255) NULL;

      IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'point_logs' AND COLUMN_NAME = 'created_at'
      )
        ALTER TABLE point_logs ADD created_at DATETIME DEFAULT GETDATE();

      IF EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'point_logs' AND COLUMN_NAME = 'member_id'
      )
      BEGIN
        BEGIN TRY
          ALTER TABLE point_logs ALTER COLUMN member_id NVARCHAR(20) NOT NULL;
        END TRY
        BEGIN CATCH
        END CATCH;
      END
    END
  `);

  // 7b) Fix CHECK constraint on point_logs.type to include 'question'
  await pool.request().query(`
    -- Drop old constraint if it only allows quiz and attendance
    IF EXISTS (
      SELECT 1 FROM sys.check_constraints
      WHERE parent_object_id = OBJECT_ID('point_logs')
        AND definition LIKE '%quiz%'
        AND definition NOT LIKE '%question%'
    )
    BEGIN
      DECLARE @cn NVARCHAR(200);
      SELECT @cn = name
      FROM sys.check_constraints
      WHERE parent_object_id = OBJECT_ID('point_logs')
        AND definition LIKE '%quiz%'
        AND definition NOT LIKE '%question%';
      EXEC('ALTER TABLE point_logs DROP CONSTRAINT [' + @cn + ']');
    END

    -- Add updated constraint if not exists
    IF NOT EXISTS (
      SELECT 1 FROM sys.check_constraints
      WHERE parent_object_id = OBJECT_ID('point_logs')
        AND name = 'CK_point_logs_type'
    )
      ALTER TABLE point_logs
      ADD CONSTRAINT CK_point_logs_type
      CHECK ([type] IN ('attendance', 'quiz', 'question'));
  `);

  // 8) Ensure FK point_logs.member_id -> user_member.member_id (only if data is valid)
  await pool.request().query(`
    IF OBJECT_ID('point_logs', 'U') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM point_logs pl
      LEFT JOIN user_member um ON um.member_id = pl.member_id
      WHERE um.member_id IS NULL
    )
    AND NOT EXISTS (
      SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_point_logs_user_member_member_id'
    )
      ALTER TABLE point_logs
      ADD CONSTRAINT FK_point_logs_user_member_member_id
      FOREIGN KEY (member_id) REFERENCES user_member(member_id);
  `);

  // 9) Ensure member_point aggregation table exists with id + member_id
  await pool.request().query(`
    IF OBJECT_ID('member_point', 'U') IS NULL
      CREATE TABLE member_point (
        id INT IDENTITY(1,1) PRIMARY KEY,
        member_id NVARCHAR(20) NOT NULL,
        points INT NOT NULL DEFAULT 0,
        updated_at DATETIME DEFAULT GETDATE()
      );
  `);

  // 9a) Rename legacy user_id -> member_id if needed
  await pool.request().query(`
    IF OBJECT_ID('member_point', 'U') IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'member_point' AND COLUMN_NAME = 'user_id'
    )
    AND NOT EXISTS (
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'member_point' AND COLUMN_NAME = 'member_id'
    )
      EXEC sp_rename 'member_point.user_id', 'member_id', 'COLUMN';
  `);

  // 9b) Rebuild member_point when legacy table has no identity id column
  await pool.request().query(`
    IF OBJECT_ID('member_point', 'U') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'member_point' AND COLUMN_NAME = 'id'
    )
    BEGIN
      CREATE TABLE member_point_new (
        id INT IDENTITY(1,1) PRIMARY KEY,
        member_id NVARCHAR(20) NOT NULL,
        points INT NOT NULL DEFAULT 0,
        updated_at DATETIME DEFAULT GETDATE()
      );

      IF EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'member_point' AND COLUMN_NAME = 'member_id'
      )
        EXEC ('
          INSERT INTO member_point_new (member_id, points, updated_at)
          SELECT member_id, points, ISNULL(updated_at, GETDATE())
          FROM member_point
        ');
      ELSE
        EXEC ('
          INSERT INTO member_point_new (member_id, points, updated_at)
          SELECT user_id, points, ISNULL(updated_at, GETDATE())
          FROM member_point
        ');

      DROP TABLE member_point;
      EXEC sp_rename 'member_point_new', 'member_point';
    END
  `);

  // 9c) Ensure member_point constraints
  await pool.request().query(`
    BEGIN TRY
      ALTER TABLE member_point ALTER COLUMN member_id NVARCHAR(20) NOT NULL;
    END TRY
    BEGIN CATCH
    END CATCH;

    IF NOT EXISTS (
      SELECT 1
      FROM sys.key_constraints
      WHERE parent_object_id = OBJECT_ID('member_point')
        AND type = 'UQ'
        AND name = 'UQ_member_point_member_id'
    )
      ALTER TABLE member_point ADD CONSTRAINT UQ_member_point_member_id UNIQUE (member_id);

    IF NOT EXISTS (
      SELECT 1
      FROM member_point mp
      LEFT JOIN user_member um ON um.member_id = mp.member_id
      WHERE um.member_id IS NULL
    )
    AND NOT EXISTS (
      SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_member_point_user_member_member_id'
    )
      ALTER TABLE member_point
      ADD CONSTRAINT FK_member_point_user_member_member_id
      FOREIGN KEY (member_id) REFERENCES user_member(member_id);
  `);

  // 10) Backfill member_point from point_logs
  await pool.request().query(`
    MERGE member_point AS target
    USING (
      SELECT pl.member_id, SUM(pl.points) AS total_points
      FROM point_logs pl
      INNER JOIN user_member um ON um.member_id = pl.member_id
      GROUP BY pl.member_id
    ) AS source
    ON target.member_id = source.member_id
    WHEN MATCHED THEN
      UPDATE SET points = source.total_points, updated_at = GETDATE()
    WHEN NOT MATCHED THEN
      INSERT (member_id, points, updated_at)
      VALUES (source.member_id, source.total_points, GETDATE());
  `);

  // 11) Trigger: keep member_point synchronized with point_logs
  await pool.request().query(`
    IF OBJECT_ID('tr_point_logs_sync_member_point', 'TR') IS NOT NULL
      DROP TRIGGER tr_point_logs_sync_member_point;

    EXEC ('
      CREATE TRIGGER tr_point_logs_sync_member_point ON point_logs
      AFTER INSERT, UPDATE, DELETE
      AS
      BEGIN
        SET NOCOUNT ON;

        DECLARE @affected TABLE (member_id NVARCHAR(20) PRIMARY KEY);

        INSERT INTO @affected(member_id)
        SELECT DISTINCT member_id FROM inserted WHERE member_id IS NOT NULL
        UNION
        SELECT DISTINCT member_id FROM deleted WHERE member_id IS NOT NULL;

        MERGE member_point AS target
        USING (
          SELECT a.member_id, COALESCE(SUM(pl.points), 0) AS total_points
          FROM @affected a
          INNER JOIN user_member um ON um.member_id = a.member_id
          LEFT JOIN point_logs pl ON pl.member_id = a.member_id
          GROUP BY a.member_id
        ) AS source
        ON target.member_id = source.member_id
        WHEN MATCHED THEN
          UPDATE SET points = source.total_points, updated_at = GETDATE()
        WHEN NOT MATCHED THEN
          INSERT (member_id, points, updated_at)
          VALUES (source.member_id, source.total_points, GETDATE());
      END
    ');
  `);

  // 12) Ensure attendance_member exists for face attendance records
  await pool.request().query(`
    IF OBJECT_ID('attendance_member', 'U') IS NULL
      CREATE TABLE attendance_member (
        id INT IDENTITY(1,1) PRIMARY KEY,
        user_id NVARCHAR(100) NOT NULL,
        member_id NVARCHAR(20) NOT NULL,
        name NVARCHAR(150) NOT NULL,
        attendance_date DATETIME NOT NULL DEFAULT GETDATE(),
        attendance_day AS CAST(attendance_date AS DATE) PERSISTED,
        points INT NOT NULL DEFAULT 10,
        created_at DATETIME DEFAULT GETDATE()
      );

    IF NOT EXISTS (
      SELECT 1 FROM sys.indexes
      WHERE object_id = OBJECT_ID('attendance_member') AND name = 'UX_attendance_member_member_day'
    )
      CREATE UNIQUE INDEX UX_attendance_member_member_day
      ON attendance_member(member_id, attendance_day);

    IF NOT EXISTS (
      SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_attendance_member_user_member_member_id'
    )
      ALTER TABLE attendance_member
      ADD CONSTRAINT FK_attendance_member_user_member_member_id
      FOREIGN KEY (member_id) REFERENCES user_member(member_id);
  `);

  console.log("✅ Migration complete: user_member, point_logs, member_point, attendance_member ready.");
  process.exit(0);
}

migrateUserMember().catch((error) => {
  console.error("❌ Migration failed:", error);
  process.exit(1);
});
