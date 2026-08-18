// server/db/migrate_event_schedule_v3.ts
// Run: npx tsx server/db/migrate_event_schedule_v3.ts
import { getConnection } from "./config.js";

async function run() {
  const pool = await getConnection();

  console.log("🔄 Running Event Schedule V3 Migration...");

  // 1. Rename Regular_Event to regular_event
  console.log("  Checking table Regular_Event name...");
  await pool.request().query(`
    IF EXISTS (SELECT * FROM sysobjects WHERE name='Regular_Event' AND xtype='U')
    BEGIN
      EXEC sp_rename 'Regular_Event', 'regular_event';
      PRINT 'Renamed Regular_Event to regular_event';
    END
  `);

  // 2. Drop unique constraint/index on date_event in event_schedule
  console.log("  Dropping unique constraints/indexes on date_event in event_schedule...");
  await pool.request().query(`
    DECLARE @ConstraintName NVARCHAR(256);
    SELECT @ConstraintName = tc.CONSTRAINT_NAME
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
    INNER JOIN INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE ccu ON tc.CONSTRAINT_NAME = ccu.CONSTRAINT_NAME
    WHERE tc.TABLE_NAME = 'event_schedule'
      AND tc.CONSTRAINT_TYPE = 'UNIQUE'
      AND ccu.COLUMN_NAME = 'date_event';
    
    IF @ConstraintName IS NOT NULL
    BEGIN
        EXEC('ALTER TABLE event_schedule DROP CONSTRAINT [' + @ConstraintName + ']');
        PRINT 'Dropped constraint: ' + @ConstraintName;
    END
  `);

  // 3. Add start_time, end_time, participant_access, event_type to event_schedule
  console.log("  Adding start_time, end_time, participant_access, event_type to event_schedule...");
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('event_schedule') AND name='start_time')
    BEGIN
      ALTER TABLE event_schedule ADD start_time NVARCHAR(5) NULL;
      ALTER TABLE event_schedule ADD end_time NVARCHAR(5) NULL;
      ALTER TABLE event_schedule ADD participant_access NVARCHAR(50) NULL;
      ALTER TABLE event_schedule ADD event_type NVARCHAR(20) NULL;
      
      -- Backfill defaults
      EXEC('UPDATE event_schedule SET start_time = ''00:00'', end_time = ''23:59'', participant_access = ''Everyone'', event_type = ''custom''');
      
      -- Set as NOT NULL
      ALTER TABLE event_schedule ALTER COLUMN start_time NVARCHAR(5) NOT NULL;
      ALTER TABLE event_schedule ALTER COLUMN end_time NVARCHAR(5) NOT NULL;
      ALTER TABLE event_schedule ALTER COLUMN participant_access NVARCHAR(50) NOT NULL;
      ALTER TABLE event_schedule ALTER COLUMN event_type NVARCHAR(20) NOT NULL;
      PRINT 'Added and backfilled time and access columns in event_schedule';
    END
  `);

  // 4. Update unique index on attendance_member
  console.log("  Updating unique indexes on attendance_member...");
  await pool.request().query(`
    IF EXISTS (
        SELECT 1 FROM sys.indexes 
        WHERE object_id = OBJECT_ID('attendance_member') AND name = 'UX_attendance_member_member_day'
    )
    BEGIN
        DROP INDEX UX_attendance_member_member_day ON attendance_member;
        PRINT 'Dropped index UX_attendance_member_member_day';
    END

    IF NOT EXISTS (
        SELECT 1 FROM sys.indexes 
        WHERE object_id = OBJECT_ID('attendance_member') AND name = 'UX_attendance_member_member_event'
    )
    BEGIN
        CREATE UNIQUE INDEX UX_attendance_member_member_event ON attendance_member(member_id, event_code);
        PRINT 'Created index UX_attendance_member_member_event';
    END
  `);

  // 5. Create event_participants table
  console.log("  Creating event_participants table...");
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='event_participants' AND xtype='U')
    BEGIN
        CREATE TABLE event_participants (
            id INT IDENTITY(1,1) PRIMARY KEY,
            event_id INT NOT NULL,
            member_id NVARCHAR(20) NOT NULL,
            access_type NVARCHAR(20) NOT NULL CHECK (access_type IN ('selected', 'excluded')),
            created_at DATETIME DEFAULT GETDATE(),
            FOREIGN KEY (event_id) REFERENCES event_schedule(id) ON DELETE CASCADE,
            FOREIGN KEY (member_id) REFERENCES user_member(member_id) ON DELETE CASCADE
        );
        CREATE INDEX idx_event_participants_event ON event_participants(event_id);
        PRINT 'Created table event_participants';
    END
  `);

  console.log("✅ V3 Migration complete!");
  process.exit(0);
}

run().catch((e) => {
  console.error("❌ Migration failed:", e);
  process.exit(1);
});
