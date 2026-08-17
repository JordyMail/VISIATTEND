// server/db/migrate_attendance_summary.ts
// Run: npx tsx server/db/migrate_attendance_summary.ts
import { getConnection } from "./config.js";

async function migrate() {
  console.log("🔄 Starting migration for attendance_summary table...");
  const pool = await getConnection();

  // 1) Drop old attendance_summary if it exists (removes legacy seed/data)
  console.log("  Dropping legacy attendance_summary table if exists...");
  await pool.request().query(`
    IF OBJECT_ID('attendance_summary', 'U') IS NOT NULL
      DROP TABLE attendance_summary;
  `);

  // 2) Create new attendance_summary table
  console.log("  Creating new attendance_summary table with member_id...");
  await pool.request().query(`
    CREATE TABLE attendance_summary (
      member_id NVARCHAR(20) PRIMARY KEY,
      total_hadir INT NOT NULL DEFAULT 0,
      CONSTRAINT FK_attendance_summary_user_member_member_id 
        FOREIGN KEY (member_id) REFERENCES user_member(member_id) ON DELETE CASCADE
    );
  `);

  // 3) Backfill total_hadir by counting occurrences in attendance_member
  console.log("  Backfilling total_hadir from attendance_member...");
  await pool.request().query(`
    INSERT INTO attendance_summary (member_id, total_hadir)
    SELECT am.member_id, COUNT(am.id)
    FROM attendance_member am
    INNER JOIN user_member um ON um.member_id = am.member_id
    GROUP BY am.member_id;
  `);

  // 4) Create trigger to keep attendance_summary synchronized with attendance_member inserts/updates/deletes
  console.log("  Creating sync trigger tr_attendance_member_sync_summary...");
  await pool.request().query(`
    IF OBJECT_ID('tr_attendance_member_sync_summary', 'TR') IS NOT NULL
      DROP TRIGGER tr_attendance_member_sync_summary;
  `);

  await pool.request().query(`
    EXEC ('
      CREATE TRIGGER tr_attendance_member_sync_summary ON attendance_member
      AFTER INSERT, UPDATE, DELETE
      AS
      BEGIN
        SET NOCOUNT ON;

        DECLARE @affected TABLE (member_id NVARCHAR(20) PRIMARY KEY);

        -- Get all member_ids that were inserted or deleted
        INSERT INTO @affected(member_id)
        SELECT DISTINCT member_id FROM inserted WHERE member_id IS NOT NULL
        UNION
        SELECT DISTINCT member_id FROM deleted WHERE member_id IS NOT NULL;

        -- Synchronize count of attendance_member records into attendance_summary
        MERGE attendance_summary AS target
        USING (
          SELECT a.member_id, COALESCE(COUNT(am.id), 0) AS total_hadir
          FROM @affected a
          INNER JOIN user_member um ON um.member_id = a.member_id
          LEFT JOIN attendance_member am ON am.member_id = a.member_id
          GROUP BY a.member_id
        ) AS source
        ON target.member_id = source.member_id
        WHEN MATCHED THEN
          UPDATE SET total_hadir = source.total_hadir
        WHEN NOT MATCHED THEN
          INSERT (member_id, total_hadir)
          VALUES (source.member_id, source.total_hadir);
      END
    ');
  `);

  console.log("✅ Migration complete: attendance_summary table and trigger created successfully.");
  process.exit(0);
}

migrate().catch((e) => {
  console.error("❌ Migration failed:", e);
  process.exit(1);
});
