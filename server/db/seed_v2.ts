// server/db/seed_v2.ts
// Run: npx tsx server/db/seed_v2.ts
// Creates ONLY the super_admin technical account.
// All other users (admin, regular users) are created through the app UI by super_admin.
import { getConnection, sql } from "./config.js";
import bcrypt from "bcrypt";

async function seedV2() {
  console.log("🌱  VISIATTEND V2 Seed starting...");
  const pool = await getConnection();

  // ── Super Admin (system account) ─────────────────────────────────────────────
  const saEmail = process.env.SA_EMAIL || "superadmin@visiattend.com";
  const saPassword = process.env.SA_PASSWORD || "SuperAdmin@2024!";
  const saName = process.env.SA_NAME || "Super Administrator";

  const exists = await pool.request()
    .input("e", sql.NVarChar, saEmail)
    .query("SELECT id FROM users WHERE email=@e");

  if (exists.recordset.length > 0) {
    console.log(`  ⏭  Super admin already exists: ${saEmail}`);
  } else {
    const hash = await bcrypt.hash(saPassword, 12);
    await pool.request()
      .input("fn",  sql.NVarChar, saName)
      .input("mid", sql.NVarChar, "SA-001")
      .input("em",  sql.NVarChar, saEmail)
      .input("pw",  sql.NVarChar, hash)
      .input("jab", sql.NVarChar, "preacher") // can be changed by super_admin later
      .query(`
        INSERT INTO users
          (full_name, member_id, email, password_hash, role, jabatan,
           is_active, email_verified, created_at)
        VALUES
          (@fn, @mid, @em, @pw, 'super_admin', @jab, 1, 1, GETDATE())
      `);
    console.log(`  ✅  Super admin created: ${saEmail}`);
    console.log(`  🔑  Password: ${saPassword}`);
    console.log(`  ⚠️   Change this password immediately after first login!\n`);
  }

  // ── Verify system_settings populated ─────────────────────────────────────────
  const settCount = await pool.request()
    .query("SELECT COUNT(*) as c FROM system_settings");
  console.log(`  ℹ️   System settings rows: ${settCount.recordset[0].c}`);

  console.log("\n✅  Seed complete.");
  console.log("──────────────────────────────────────────");
  console.log("  Next steps:");
  console.log("  1. Login as super_admin");
  console.log("  2. Create events (Bible Study, Komsel, etc.)");
  console.log("  3. Create admin accounts for operational staff");
  console.log("  4. Admin creates user accounts for congregation members");
  console.log("──────────────────────────────────────────\n");
  process.exit(0);
}

seedV2().catch((e) => { console.error("❌ Seed failed:", e); process.exit(1); });