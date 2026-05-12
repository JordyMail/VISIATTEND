// server/db/seed_v2.ts
import { getConnection, sql } from "./config.js";
import bcrypt from "bcrypt";

async function seedV2() {
  console.log("🌱 Seeding V2 data...");
  const pool = await getConnection();

  const hash = (pw: string) => bcrypt.hash(pw, 10);

  const accounts = [
    {
      full_name:   "Super Administrator",
      member_id:   "SA001",
      email:       "jordykastellomail@gmail.com",
      password:    "SuperAdmin123!",
      role:        "super_admin",
      phone:       "081111111111",
      division:    "System",
    },
    {
      full_name:   "Admin Operasional",
      member_id:   "ADM001",
      email:       "admin@gmail.com",
      password:    "Admin123!",
      role:        "admin",
      phone:       "082222222222",
      division:    "Ibadah",
    },
    {
      full_name:   "Jemaat User",
      member_id:   "USR001",
      email:       "usertest@gmail.com",
      password:    "User123!",
      role:        "user",
      phone:       "083333333333",
      division:    "Pemuda",
    },
  ];

  for (const acc of accounts) {
    const exists = await pool.request()
      .input("email", sql.NVarChar, acc.email)
      .query("SELECT id FROM users WHERE email = @email");

    if (exists.recordset.length > 0) {
      console.log(`  ⏭  ${acc.role} already exists: ${acc.email}`);
      continue;
    }

    const passwordHash = await hash(acc.password);
    await pool.request()
      .input("full_name",     sql.NVarChar, acc.full_name)
      .input("member_id",     sql.NVarChar, acc.member_id)
      .input("email",         sql.NVarChar, acc.email)
      .input("password_hash", sql.NVarChar, passwordHash)
      .input("role",          sql.NVarChar, acc.role)
      .input("phone",         sql.NVarChar, acc.phone)
      .input("division",      sql.NVarChar, acc.division)
      .query(`
        INSERT INTO users
          (full_name, member_id, email, password_hash, role, phone_number, division, is_active, email_verified, created_at)
        VALUES
          (@full_name, @member_id, @email, @password_hash, @role, @phone, @division, 1, 1, GETDATE())
      `);
    console.log(`  ✅ Created ${acc.role}: ${acc.email} / ${acc.password}`);
  }

  // Seed divisions
  const divisions = ["Worship", "Youth", "Komsel", "Pelayanan Anak", "Media & Kreatif", "Administrasi"];
  for (const name of divisions) {
    const exists = await pool.request()
      .input("name", sql.NVarChar, name)
      .query("SELECT id FROM divisions WHERE name = @name");
    if (exists.recordset.length === 0) {
      await pool.request()
        .input("name", sql.NVarChar, name)
        .query("INSERT INTO divisions (name, is_active, created_at) VALUES (@name, 1, GETDATE())");
    }
  }
  console.log("  ✅ Divisions seeded");

  // Seed events
  const events = [
    { code: "BS001", name: "Bible Study Mingguan",    type: "study",     season: "2024" },
    { code: "PD001", name: "Persekutuan Doa Bulanan", type: "meeting",   season: "2024" },
    { code: "YS001", name: "Youth Service",           type: "worship",   season: "2024" },
    { code: "MT001", name: "Meeting Pengurus",        type: "meeting",   season: "2024" },
    { code: "KS001", name: "Komsel",                  type: "fellowship",season: "2024" },
    { code: "LP001", name: "Latihan Pelayanan",       type: "outreach",  season: "2024" },
  ];

  const saUser = await pool.request()
    .query("SELECT TOP 1 id FROM users WHERE role = 'super_admin'");
  const saId = saUser.recordset[0]?.id || null;

  for (const e of events) {
    const exists = await pool.request()
      .input("code", sql.NVarChar, e.code)
      .query("SELECT id FROM events WHERE event_code = @code");
    if (exists.recordset.length === 0) {
      await pool.request()
        .input("code",   sql.NVarChar, e.code)
        .input("name",   sql.NVarChar, e.name)
        .input("type",   sql.NVarChar, e.type)
        .input("season", sql.NVarChar, e.season)
        .input("pid",    sql.Int,      saId)
        .query(`
          INSERT INTO events (event_code, event_name, event_type, season, preacher_id, is_active, created_at)
          VALUES (@code, @name, @type, @season, @pid, 1, GETDATE())
        `);
    }
  }
  console.log("  ✅ Events seeded");

  // Seed sample announcement
  const hasAnn = await pool.request().query("SELECT COUNT(*) as c FROM announcements");
  if (hasAnn.recordset[0].c === 0 && saId) {
    await pool.request()
      .input("title",  sql.NVarChar, "Selamat Datang di VISIATTEND!")
      .input("body",   sql.NVarChar, "Sistem absensi digital VISIATTEND kini aktif. Harap scan QR atau tekan tombol hadir pada setiap kegiatan.")
      .input("author", sql.Int,      saId)
      .query(`
        INSERT INTO announcements (title, body, author_id, is_active, pinned, created_at, updated_at)
        VALUES (@title, @body, @author, 1, 1, GETDATE(), GETDATE())
      `);
    console.log("  ✅ Sample announcement created");
  }

  console.log("\n✅ V2 seeding complete!\n");
  console.log("Login credentials:");
  console.log("  Super Admin : jordykastellomail@gmail.com / SuperAdmin123!");
  console.log("  Admin       : admin@gmail.com / Admin123!");
  console.log("  User        : usertest@gmail.com / User123!");
  process.exit(0);
}

seedV2().catch((e) => { console.error("❌", e); process.exit(1); });