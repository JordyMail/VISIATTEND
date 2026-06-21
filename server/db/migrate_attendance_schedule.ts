// server/db/migrate_attendance_schedule.ts
// Run: npx tsx server/db/migrate_attendance_schedule.ts
import { getConnection } from "./config.js";

async function migrate() {
  console.log("🔄 Creating attendance_schedules table...");
  const pool = await getConnection();

  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='attendance_schedules' AND xtype='U')
    CREATE TABLE attendance_schedules (
      id INT IDENTITY(1,1) PRIMARY KEY,
      schedule_date DATE NOT NULL UNIQUE,
      created_by INT NULL,
      created_at DATETIME DEFAULT GETDATE()
    );
  `);

  console.log("✅ Migration complete: attendance_schedules table ready.");
  process.exit(0);
}

migrate().catch((e) => {
  console.error("❌ Migration failed:", e);
  process.exit(1);
});
