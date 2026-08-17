// server/db/migrate_regular_event.ts
// Run: npx tsx server/db/migrate_regular_event.ts
import { getConnection } from "./config.js";

async function migrateRegularEvent() {
  console.log("🔄 Creating Regular_Event table...");
  const pool = await getConnection();

  // Create Regular_Event table
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Regular_Event' AND xtype='U')
    BEGIN
      CREATE TABLE Regular_Event (
        id INT IDENTITY(1,1) PRIMARY KEY,
        event_code NVARCHAR(20) UNIQUE NOT NULL,
        event_name NVARCHAR(100) NOT NULL
      );
      
      CREATE INDEX idx_regular_event_code ON Regular_Event(event_code);
    END
  `);

  console.log("✅ Regular_Event table created successfully!");
  process.exit(0);
}

migrateRegularEvent().catch((e) => {
  console.error("❌ Migration failed:", e);
  process.exit(1);
});
