// server/index.ts  —  VISIATTEND v2
import "dotenv/config";
import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { getConnection, sql } from "./db/config.js";
import {
  authenticateToken,
  requireRole,
  requireAdmin,
  requireSuperAdmin,
  requireAnyRole,
  requireSelfOrAdmin,
} from "./middleware/rbac.js";
import { handleDemo } from "./routes/demo.js";

// ─── Helper: log activity ─────────────────────────────────────────────────────
async function logActivity(
  pool: any,
  userId: number | null,
  action: string,
  entityType: string,
  entityId: number | null,
  description: string,
  ip?: string
) {
  try {
    await pool.request()
      .input("u",   sql.Int,      userId)
      .input("a",   sql.NVarChar, action)
      .input("et",  sql.NVarChar, entityType)
      .input("ei",  sql.Int,      entityId)
      .input("d",   sql.NVarChar, description.slice(0, 500))
      .input("ip",  sql.NVarChar, ip || null)
      .query(`
        INSERT INTO activity_logs (user_id,action,entity_type,entity_id,description,ip_address,created_at)
        VALUES (@u,@a,@et,@ei,@d,@ip,GETDATE())
      `);
  } catch { /* non-fatal */ }
}

export function createServer() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "5mb" }));
  app.use(express.urlencoded({ extended: true }));

  // ══════════════════════════════════════════════════════════════════════════════
  // DEV auto-login
  // ══════════════════════════════════════════════════════════════════════════════
  app.get("/api/dev/auto-login", async (req, res) => {
    try {
      const { role = "super_admin" } = req.query;
      const pool = await getConnection();
      const result = await pool.request()
        .input("role", sql.NVarChar, role as string)
        .query("SELECT TOP 1 * FROM users WHERE role = @role AND is_active = 1");
      if (!result.recordset.length)
        return res.status(404).json({ error: "No user found for role: " + role });
      const user = result.recordset[0];
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET || "secret_key",
        { expiresIn: "24h" }
      );
      res.json({ accessToken: token, refreshToken: token, user });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // AUTH ROUTES  (public)
  // ══════════════════════════════════════════════════════════════════════════════
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password)
        return res.status(400).json({ success: false, message: "Email and password required" });

      const pool = await getConnection();
      const result = await pool.request()
        .input("email", sql.NVarChar, email)
        .query("SELECT * FROM users WHERE email = @email");

      if (!result.recordset.length)
        return res.status(401).json({ success: false, message: "Invalid email or password" });

      const user = result.recordset[0];
      if (!await bcrypt.compare(password, user.password_hash))
        return res.status(401).json({ success: false, message: "Invalid email or password" });
      if (!user.is_active)
        return res.status(401).json({ success: false, message: "Account is deactivated" });

      await pool.request().input("id", sql.Int, user.id)
        .query("UPDATE users SET last_login=GETDATE() WHERE id=@id");

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET || "secret_key",
        { expiresIn: "24h" }
      );

      await pool.request()
        .input("uid", sql.Int,      user.id)
        .input("at",  sql.NVarChar, token)
        .input("rt",  sql.NVarChar, token)
        .input("exp", sql.DateTime, new Date(Date.now() + 86400000))
        .input("ip",  sql.NVarChar, req.ip || null)
        .input("ua",  sql.NVarChar, req.headers["user-agent"] || null)
        .query(`
          INSERT INTO sessions (user_id,access_token,refresh_token,expires_at,ip_address,user_agent,created_at,last_activity)
          VALUES (@uid,@at,@rt,@exp,@ip,@ua,GETDATE(),GETDATE())
        `);

      await logActivity(pool, user.id, "LOGIN", "user", user.id,
        `${user.full_name} logged in as ${user.role}`, req.ip);

      res.json({
        success: true,
        data: {
          accessToken: token,
          refreshToken: token,
          user: { id: user.id, full_name: user.full_name, email: user.email, role: user.role, division: user.division },
        },
      });
    } catch (e: any) { console.error(e); res.status(500).json({ success: false, message: "Server error" }); }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { fullName, memberId, email, password, phoneNumber, division } = req.body;
      if (!fullName || !email || !password)
        return res.status(400).json({ success: false, message: "Name, email, password required" });

      const pool = await getConnection();
      const emailCheck = await pool.request().input("e", sql.NVarChar, email)
        .query("SELECT id FROM users WHERE email=@e");
      if (emailCheck.recordset.length)
        return res.status(400).json({ success: false, message: "Email already registered" });

      const finalId = memberId || `USR${Date.now().toString().slice(-6)}`;
      const idCheck = await pool.request().input("m", sql.NVarChar, finalId)
        .query("SELECT id FROM users WHERE member_id=@m");
      if (idCheck.recordset.length)
        return res.status(400).json({ success: false, message: "Member ID taken" });

      const hash = await bcrypt.hash(password, 10);
      await pool.request()
        .input("fn", sql.NVarChar, fullName)
        .input("mi", sql.NVarChar, finalId)
        .input("em", sql.NVarChar, email)
        .input("pw", sql.NVarChar, hash)
        .input("ph", sql.NVarChar, phoneNumber || null)
        .input("dv", sql.NVarChar, division || null)
        .query(`
          INSERT INTO users (full_name,member_id,email,password_hash,role,phone_number,division,is_active,email_verified,created_at)
          VALUES (@fn,@mi,@em,@pw,'user',@ph,@dv,1,0,GETDATE())
        `);

      res.status(201).json({ success: true, message: "Registration successful. Please login." });
    } catch (e: any) { console.error(e); res.status(500).json({ success: false, message: "Server error" }); }
  });

  app.post("/api/auth/logout", async (req, res) => {
    try {
      const token = req.headers["authorization"]?.split(" ")[1];
      const pool = await getConnection();
      if (token) await pool.request().input("t", sql.NVarChar, token)
        .query("DELETE FROM sessions WHERE access_token=@t");
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ success: false, message: "Server error" }); }
  });

  app.post("/api/auth/refresh", async (req, res) => {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) return res.status(400).json({ success: false, message: "Refresh token required" });
      const pool = await getConnection();
      const sess = await pool.request().input("rt", sql.NVarChar, refreshToken)
        .query(`
          SELECT s.*,u.id as uid,u.email,u.role FROM sessions s
          JOIN users u ON s.user_id=u.id
          WHERE s.refresh_token=@rt AND s.expires_at>GETDATE()
        `);
      if (!sess.recordset.length)
        return res.status(401).json({ success: false, message: "Invalid or expired refresh token" });

      const r = sess.recordset[0];
      const newToken = jwt.sign(
        { id: r.uid, email: r.email, role: r.role },
        process.env.JWT_SECRET || "secret_key",
        { expiresIn: "24h" }
      );
      await pool.request()
        .input("sid", sql.Int,      r.id)
        .input("at",  sql.NVarChar, newToken)
        .input("exp", sql.DateTime, new Date(Date.now() + 86400000))
        .query("UPDATE sessions SET access_token=@at,expires_at=@exp,last_activity=GETDATE() WHERE id=@sid");

      res.json({ accessToken: newToken });
    } catch (e: any) { res.status(500).json({ success: false, message: "Server error" }); }
  });

  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ success: false, message: "Email required" });
      const pool = await getConnection();
      const u = await pool.request().input("e", sql.NVarChar, email)
        .query("SELECT id FROM users WHERE email=@e");
      if (!u.recordset.length)
        return res.json({ success: true, message: "If email exists, reset code has been sent" });

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      await pool.request().input("uid", sql.Int, u.recordset[0].id)
        .query("DELETE FROM password_resets WHERE user_id=@uid");
      await pool.request()
        .input("uid", sql.Int,      u.recordset[0].id)
        .input("code",sql.NVarChar, code)
        .input("exp", sql.DateTime, new Date(Date.now() + 3600000))
        .query("INSERT INTO password_resets (user_id,reset_code,expires_at,created_at) VALUES (@uid,@code,@exp,GETDATE())");

      console.log(`[RESET] ${email} → ${code}`);
      res.json({ success: true, message: "Reset code sent" });
    } catch (e: any) { res.status(500).json({ success: false, message: "Server error" }); }
  });

  app.post("/api/auth/verify-reset-code", async (req, res) => {
    try {
      const { email, code } = req.body;
      const pool = await getConnection();
      const r = await pool.request()
        .input("e", sql.NVarChar, email).input("c", sql.NVarChar, code)
        .query(`
          SELECT pr.* FROM password_resets pr JOIN users u ON pr.user_id=u.id
          WHERE u.email=@e AND pr.reset_code=@c AND pr.is_used=0 AND pr.expires_at>GETDATE()
        `);
      if (!r.recordset.length)
        return res.status(400).json({ success: false, message: "Invalid or expired code" });
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ success: false, message: "Server error" }); }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { email, code, newPassword } = req.body;
      if (!email || !code || !newPassword)
        return res.status(400).json({ success: false, message: "All fields required" });
      if (newPassword.length < 8)
        return res.status(400).json({ success: false, message: "Password min 8 chars" });

      const pool = await getConnection();
      const r = await pool.request()
        .input("e", sql.NVarChar, email).input("c", sql.NVarChar, code)
        .query(`
          SELECT pr.id,pr.user_id FROM password_resets pr JOIN users u ON pr.user_id=u.id
          WHERE u.email=@e AND pr.reset_code=@c AND pr.is_used=0 AND pr.expires_at>GETDATE()
        `);
      if (!r.recordset.length)
        return res.status(400).json({ success: false, message: "Invalid or expired code" });

      const hash = await bcrypt.hash(newPassword, 10);
      await pool.request().input("uid", sql.Int, r.recordset[0].user_id).input("pw", sql.NVarChar, hash)
        .query("UPDATE users SET password_hash=@pw WHERE id=@uid");
      await pool.request().input("rid", sql.Int, r.recordset[0].id)
        .query("UPDATE password_resets SET is_used=1 WHERE id=@rid");
      await pool.request().input("uid", sql.Int, r.recordset[0].user_id)
        .query("DELETE FROM sessions WHERE user_id=@uid");

      res.json({ success: true, message: "Password reset successfully" });
    } catch (e: any) { res.status(500).json({ success: false, message: "Server error" }); }
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // USERS  (admin+)
  // ══════════════════════════════════════════════════════════════════════════════
  app.get("/api/users", authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { role, isActive, division, search } = req.query;
      const pool = await getConnection();
      const rq = pool.request();
      let where = "WHERE 1=1";

      // Non-super_admin cannot see super_admin accounts
      if (req.user.role !== "super_admin") {
        where += " AND u.role != 'super_admin'";
      }
      if (role && role !== "all") { rq.input("role", sql.NVarChar, role); where += " AND u.role=@role"; }
      if (isActive !== undefined) { rq.input("ia", sql.Bit, isActive === "true" ? 1 : 0); where += " AND u.is_active=@ia"; }
      if (division) { rq.input("div", sql.NVarChar, division); where += " AND u.division=@div"; }
      if (search) {
        rq.input("s", sql.NVarChar, `%${search}%`);
        where += " AND (u.full_name LIKE @s OR u.email LIKE @s OR u.member_id LIKE @s)";
      }

      const result = await rq.query(`
        SELECT u.id,u.full_name,u.member_id,u.email,u.role,u.phone_number,u.division,
               u.is_active,u.created_at,u.last_login,u.avatar_url
        FROM users u ${where}
        ORDER BY u.created_at DESC
      `);
      res.json({ success: true, data: result.recordset });
    } catch (e: any) { console.error(e); res.status(500).json({ success: false, message: "DB error" }); }
  });

  app.get("/api/users/:id", authenticateToken, requireSelfOrAdmin("id"), async (req: any, res) => {
    try {
      const pool = await getConnection();
      const result = await pool.request().input("id", sql.Int, req.params.id)
        .query(`
          SELECT id,full_name,member_id,email,role,phone_number,division,is_active,
                 created_at,last_login,avatar_url
          FROM users WHERE id=@id
        `);
      if (!result.recordset.length) return res.status(404).json({ success: false, message: "Not found" });
      res.json({ success: true, data: result.recordset[0] });
    } catch (e: any) { res.status(500).json({ success: false, message: "DB error" }); }
  });

  app.post("/api/users", authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { fullName, memberId, email, password, role, phoneNumber, division } = req.body;
      if (!fullName || !memberId || !email || !password)
        return res.status(400).json({ success: false, message: "Required fields missing" });

      // Only super_admin can create admin/super_admin
      if (["admin","super_admin"].includes(role) && req.user.role !== "super_admin")
        return res.status(403).json({ success: false, message: "Only super admin can create admin accounts" });

      const pool = await getConnection();
      const emailCheck = await pool.request().input("e", sql.NVarChar, email)
        .query("SELECT id FROM users WHERE email=@e");
      if (emailCheck.recordset.length)
        return res.status(400).json({ success: false, message: "Email already registered" });

      const idCheck = await pool.request().input("m", sql.NVarChar, memberId)
        .query("SELECT id FROM users WHERE member_id=@m");
      if (idCheck.recordset.length)
        return res.status(400).json({ success: false, message: "Member ID taken" });

      const hash = await bcrypt.hash(password, 10);
      const result = await pool.request()
        .input("fn", sql.NVarChar, fullName)
        .input("mi", sql.NVarChar, memberId)
        .input("em", sql.NVarChar, email)
        .input("pw", sql.NVarChar, hash)
        .input("r",  sql.NVarChar, role || "user")
        .input("ph", sql.NVarChar, phoneNumber || null)
        .input("dv", sql.NVarChar, division || null)
        .query(`
          INSERT INTO users (full_name,member_id,email,password_hash,role,phone_number,division,is_active,created_at)
          OUTPUT INSERTED.id,INSERTED.full_name,INSERTED.member_id,INSERTED.email,INSERTED.role
          VALUES (@fn,@mi,@em,@pw,@r,@ph,@dv,1,GETDATE())
        `);

      await logActivity(pool, req.user.id, "CREATE_USER", "user", result.recordset[0].id,
        `Created user: ${fullName} (${role})`, req.ip);

      res.status(201).json({ success: true, data: result.recordset[0] });
    } catch (e: any) { console.error(e); res.status(500).json({ success: false, message: "DB error" }); }
  });

  app.put("/api/users/:id", authenticateToken, requireSelfOrAdmin("id"), async (req: any, res) => {
    try {
      const { fullName, email, phoneNumber, division, role, avatarUrl } = req.body;
      const targetId = parseInt(req.params.id);
      const pool = await getConnection();

      // Only super_admin can change roles
      if (role !== undefined && req.user.role !== "super_admin")
        return res.status(403).json({ success: false, message: "Only super admin can change roles" });

      // Users can only edit limited fields on their own profile
      const isSelf = req.user.id === targetId;
      const isAdmin = ["super_admin", "admin"].includes(req.user.role);

      const setFields: string[] = [];
      const rq = pool.request().input("id", sql.Int, targetId);

      if (fullName && (isAdmin || isSelf)) { rq.input("fn", sql.NVarChar, fullName); setFields.push("full_name=@fn"); }
      if (email && isAdmin) { rq.input("em", sql.NVarChar, email); setFields.push("email=@em"); }
      if (phoneNumber !== undefined && (isAdmin || isSelf)) { rq.input("ph", sql.NVarChar, phoneNumber || null); setFields.push("phone_number=@ph"); }
      if (division !== undefined && isAdmin) { rq.input("dv", sql.NVarChar, division || null); setFields.push("division=@dv"); }
      if (role !== undefined && req.user.role === "super_admin") { rq.input("r", sql.NVarChar, role); setFields.push("role=@r"); }
      if (avatarUrl !== undefined && (isAdmin || isSelf)) { rq.input("av", sql.NVarChar, avatarUrl || null); setFields.push("avatar_url=@av"); }

      if (!setFields.length)
        return res.status(400).json({ success: false, message: "No fields to update" });

      setFields.push("updated_at=GETDATE()");
      await rq.query(`UPDATE users SET ${setFields.join(",")} WHERE id=@id`);

      await logActivity(pool, req.user.id, "UPDATE_USER", "user", targetId, `Updated user id:${targetId}`, req.ip);
      res.json({ success: true, message: "User updated" });
    } catch (e: any) { console.error(e); res.status(500).json({ success: false, message: "DB error" }); }
  });

  app.delete("/api/users/:id", authenticateToken, requireSuperAdmin, async (req: any, res) => {
    try {
      const pool = await getConnection();
      if (String(req.user.id) === req.params.id)
        return res.status(400).json({ success: false, message: "Cannot delete your own account" });
      const r = await pool.request().input("id", sql.Int, req.params.id)
        .query("DELETE FROM users WHERE id=@id");
      if (!r.rowsAffected[0]) return res.status(404).json({ success: false, message: "Not found" });
      await logActivity(pool, req.user.id, "DELETE_USER", "user", parseInt(req.params.id), `Deleted user id:${req.params.id}`, req.ip);
      res.json({ success: true, message: "User deleted" });
    } catch (e: any) { res.status(500).json({ success: false, message: "DB error" }); }
  });

  app.patch("/api/users/:id/toggle-status", authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const pool = await getConnection();
      const u = await pool.request().input("id", sql.Int, req.params.id)
        .query("SELECT is_active,role FROM users WHERE id=@id");
      if (!u.recordset.length) return res.status(404).json({ success: false, message: "Not found" });
      // Admin cannot deactivate super_admin
      if (u.recordset[0].role === "super_admin" && req.user.role !== "super_admin")
        return res.status(403).json({ success: false, message: "Cannot modify super admin" });

      const newStatus = u.recordset[0].is_active ? 0 : 1;
      await pool.request().input("id", sql.Int, req.params.id).input("s", sql.Bit, newStatus)
        .query("UPDATE users SET is_active=@s WHERE id=@id");
      await logActivity(pool, req.user.id, "TOGGLE_STATUS", "user", parseInt(req.params.id),
        `User id:${req.params.id} ${newStatus ? "activated" : "deactivated"}`, req.ip);
      res.json({ success: true, message: `User ${newStatus ? "activated" : "deactivated"}` });
    } catch (e: any) { res.status(500).json({ success: false, message: "DB error" }); }
  });

  // Admin reset another user's password
  app.post("/api/users/:id/reset-password", authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { newPassword } = req.body;
      if (!newPassword || newPassword.length < 8)
        return res.status(400).json({ success: false, message: "Password min 8 chars" });
      const pool = await getConnection();
      const hash = await bcrypt.hash(newPassword, 10);
      await pool.request().input("id", sql.Int, req.params.id).input("pw", sql.NVarChar, hash)
        .query("UPDATE users SET password_hash=@pw WHERE id=@id");
      await pool.request().input("uid", sql.Int, parseInt(req.params.id))
        .query("DELETE FROM sessions WHERE user_id=@uid");
      await logActivity(pool, req.user.id, "RESET_PASSWORD", "user", parseInt(req.params.id),
        `Admin reset password for user id:${req.params.id}`, req.ip);
      res.json({ success: true, message: "Password reset successfully" });
    } catch (e: any) { res.status(500).json({ success: false, message: "DB error" }); }
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // EVENTS  (read: all auth; write: admin+)
  // ══════════════════════════════════════════════════════════════════════════════
  app.get("/api/events", authenticateToken, requireAnyRole, async (req, res) => {
    try {
      const { isActive, eventType } = req.query;
      const pool = await getConnection();
      const rq = pool.request();
      let where = "WHERE 1=1";
      if (isActive !== undefined) { rq.input("ia", sql.Bit, isActive === "true" ? 1 : 0); where += " AND e.is_active=@ia"; }
      if (eventType && eventType !== "all") { rq.input("et", sql.NVarChar, eventType); where += " AND e.event_type=@et"; }
      const r = await rq.query(`
        SELECT e.*,u.full_name as preacher_name FROM events e
        LEFT JOIN users u ON e.preacher_id=u.id
        ${where} ORDER BY e.created_at DESC
      `);
      res.json({ success: true, data: r.recordset });
    } catch (e: any) { res.status(500).json({ success: false, message: "DB error" }); }
  });

  app.get("/api/events/:id", authenticateToken, requireAnyRole, async (req, res) => {
    try {
      const pool = await getConnection();
      const r = await pool.request().input("id", sql.Int, req.params.id)
        .query("SELECT e.*,u.full_name as preacher_name FROM events e LEFT JOIN users u ON e.preacher_id=u.id WHERE e.id=@id");
      if (!r.recordset.length) return res.status(404).json({ success: false, message: "Not found" });
      res.json({ success: true, data: r.recordset[0] });
    } catch (e: any) { res.status(500).json({ success: false, message: "DB error" }); }
  });

  app.post("/api/events", authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { eventCode, eventName, description, preacherId, season, eventType } = req.body;
      if (!eventCode || !eventName || !eventType)
        return res.status(400).json({ success: false, message: "eventCode, eventName, eventType required" });
      const pool = await getConnection();
      const dup = await pool.request().input("ec", sql.NVarChar, eventCode)
        .query("SELECT id FROM events WHERE event_code=@ec");
      if (dup.recordset.length)
        return res.status(400).json({ success: false, message: "Event code taken" });
      const r = await pool.request()
        .input("ec", sql.NVarChar, eventCode).input("en", sql.NVarChar, eventName)
        .input("d",  sql.NVarChar, description || null)
        .input("pi", sql.Int,      preacherId || null)
        .input("s",  sql.NVarChar, season || null)
        .input("et", sql.NVarChar, eventType)
        .query(`
          INSERT INTO events (event_code,event_name,description,preacher_id,season,event_type,is_active,created_at)
          OUTPUT INSERTED.*
          VALUES (@ec,@en,@d,@pi,@s,@et,1,GETDATE())
        `);
      await logActivity(pool, req.user.id, "CREATE_EVENT", "event", r.recordset[0].id,
        `Created event: ${eventName}`, req.ip);
      res.status(201).json({ success: true, data: r.recordset[0] });
    } catch (e: any) { res.status(500).json({ success: false, message: "DB error" }); }
  });

  app.put("/api/events/:id", authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { eventName, description, preacherId, eventType, isActive } = req.body;
      const pool = await getConnection();
      const exists = await pool.request().input("id", sql.Int, req.params.id)
        .query("SELECT id FROM events WHERE id=@id");
      if (!exists.recordset.length) return res.status(404).json({ success: false, message: "Not found" });

      const rq = pool.request().input("id", sql.Int, req.params.id);
      const sets: string[] = ["updated_at=GETDATE()"];
      if (eventName)             { rq.input("en",sql.NVarChar,eventName);        sets.push("event_name=@en"); }
      if (description!==undefined){ rq.input("d",sql.NVarChar,description||null); sets.push("description=@d"); }
      if (preacherId!==undefined) { rq.input("pi",sql.Int,preacherId||null);      sets.push("preacher_id=@pi"); }
      if (eventType)             { rq.input("et",sql.NVarChar,eventType);         sets.push("event_type=@et"); }
      if (isActive!==undefined)  { rq.input("ia",sql.Bit,isActive?1:0);           sets.push("is_active=@ia"); }

      await rq.query(`UPDATE events SET ${sets.join(",")} WHERE id=@id`);
      await logActivity(pool, req.user.id, "UPDATE_EVENT", "event", parseInt(req.params.id), `Updated event id:${req.params.id}`, req.ip);
      res.json({ success: true, message: "Event updated" });
    } catch (e: any) { res.status(500).json({ success: false, message: "DB error" }); }
  });

  app.delete("/api/events/:id", authenticateToken, requireSuperAdmin, async (req: any, res) => {
    try {
      const pool = await getConnection();
      const r = await pool.request().input("id", sql.Int, req.params.id)
        .query("DELETE FROM events WHERE id=@id");
      if (!r.rowsAffected[0]) return res.status(404).json({ success: false, message: "Not found" });
      await logActivity(pool, req.user.id, "DELETE_EVENT", "event", parseInt(req.params.id), `Deleted event id:${req.params.id}`, req.ip);
      res.json({ success: true, message: "Event deleted" });
    } catch (e: any) { res.status(500).json({ success: false, message: "DB error" }); }
  });

  app.get("/api/events/:id/members", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const pool = await getConnection();
      const r = await pool.request().input("eid", sql.Int, req.params.id)
        .query(`
          SELECT u.id,u.full_name,u.member_id,u.email,u.phone_number,u.division
          FROM users u JOIN event_enrollments ee ON u.id=ee.user_id
          WHERE ee.event_id=@eid AND ee.is_active=1
          ORDER BY u.full_name
        `);
      res.json({ success: true, data: r.recordset });
    } catch (e: any) { res.status(500).json({ success: false, message: "DB error" }); }
  });

  app.post("/api/events/:id/enroll", authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ success: false, message: "userId required" });
      const pool = await getConnection();
      const dup = await pool.request()
        .input("eid",sql.Int,req.params.id).input("uid",sql.Int,userId)
        .query("SELECT id FROM event_enrollments WHERE event_id=@eid AND user_id=@uid");
      if (dup.recordset.length)
        return res.status(400).json({ success: false, message: "Already enrolled" });
      await pool.request().input("eid",sql.Int,req.params.id).input("uid",sql.Int,userId)
        .query("INSERT INTO event_enrollments (event_id,user_id,enrolled_at,is_active) VALUES (@eid,@uid,GETDATE(),1)");
      res.json({ success: true, message: "Enrolled" });
    } catch (e: any) { res.status(500).json({ success: false, message: "DB error" }); }
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // ATTENDANCE  (specific routes FIRST, then /:id)
  // ══════════════════════════════════════════════════════════════════════════════
  app.get("/api/attendance/stats/today", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const pool = await getConnection();
      const today = new Date().toISOString().split("T")[0];
      const [statsR, membersR] = await Promise.all([
        pool.request().input("d", sql.Date, today).query(`
          SELECT
            ISNULL(COUNT(CASE WHEN status IN ('present','late') THEN 1 END),0) as checkedIn,
            ISNULL(COUNT(CASE WHEN status='absent' THEN 1 END),0) as absent
          FROM attendance WHERE attendance_date=@d
        `),
        pool.request().query("SELECT COUNT(*) as c FROM users WHERE role='user' AND is_active=1"),
      ]);
      const ci = statsR.recordset[0].checkedIn;
      const tot = membersR.recordset[0].c;
      res.json({ success: true, data: { checkedIn: ci, pending: Math.max(0, tot - ci), absent: statsR.recordset[0].absent } });
    } catch (e: any) { res.status(500).json({ success: false, message: "DB error" }); }
  });

  app.get("/api/attendance/trend", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { days = 7, eventId } = req.query;
      const pool = await getConnection();
      const rq = pool.request().input("days", sql.Int, Number(days));
      let ef = "";
      if (eventId) { rq.input("eid", sql.Int, Number(eventId)); ef = " AND event_id=@eid"; }
      const r = await rq.query(`
        SELECT CONVERT(NVARCHAR(10),attendance_date,23) as attendance_date,
               COUNT(*) as total,
               SUM(CASE WHEN status IN ('present','late') THEN 1 ELSE 0 END) as present
        FROM attendance
        WHERE attendance_date>=DATEADD(DAY,-@days,GETDATE()) ${ef}
        GROUP BY attendance_date ORDER BY attendance_date
      `);
      res.json({ success: true, data: r.recordset });
    } catch (e: any) { res.status(500).json({ success: false, message: "DB error" }); }
  });

  app.get("/api/attendance/leaderboard", authenticateToken, requireAnyRole, async (req: any, res) => {
    try {
      const { eventId, period = "month" } = req.query;
      const days = ({ week:7, month:30, semester:180 } as any)[period as string] || 30;
      const pool = await getConnection();
      const rq = pool.request().input("days", sql.Int, days);
      let ef = "";
      if (eventId) { rq.input("eid", sql.Int, Number(eventId)); ef = " AND a.event_id=@eid"; }
      const r = await rq.query(`
        SELECT u.id as user_id,u.full_name,u.member_id,u.division,
          COUNT(CASE WHEN a.status IN ('present','late') THEN 1 END) as total_present,
          COUNT(CASE WHEN a.status='late' THEN 1 END) as total_late,
          COUNT(*) as total_records,
          CAST(ROUND(
            CAST(COUNT(CASE WHEN a.status IN ('present','late') THEN 1 END) AS FLOAT)/
            NULLIF(COUNT(*),0)*100,2) AS DECIMAL(5,2)) as attendance_percentage
        FROM users u JOIN attendance a ON u.id=a.user_id
        WHERE a.attendance_date>=DATEADD(DAY,-@days,GETDATE())
          AND u.role='user' AND u.is_active=1 ${ef}
        GROUP BY u.id,u.full_name,u.member_id,u.division
        ORDER BY attendance_percentage DESC,total_present DESC
      `);
      res.json({ success: true, data: r.recordset });
    } catch (e: any) { res.status(500).json({ success: false, message: "DB error" }); }
  });

  // User: view own attendance history
  app.get("/api/attendance/my", authenticateToken, requireAnyRole, async (req: any, res) => {
    try {
      const { eventId, startDate, endDate, status } = req.query;
      const pool = await getConnection();
      const rq = pool.request().input("uid", sql.Int, req.user.id);
      let where = "WHERE a.user_id=@uid";
      if (eventId) { rq.input("eid",sql.Int,Number(eventId)); where+=" AND a.event_id=@eid"; }
      if (startDate) { rq.input("sd",sql.Date,startDate); where+=" AND a.attendance_date>=@sd"; }
      if (endDate) { rq.input("ed",sql.Date,endDate); where+=" AND a.attendance_date<=@ed"; }
      if (status && status!=="all") { rq.input("s",sql.NVarChar,status); where+=" AND a.status=@s"; }
      const r = await rq.query(`
        SELECT a.*,e.event_name,e.event_code
        FROM attendance a JOIN events e ON a.event_id=e.id
        ${where} ORDER BY a.attendance_date DESC
      `);
      res.json({ success: true, data: r.recordset });
    } catch (e: any) { res.status(500).json({ success: false, message: "DB error" }); }
  });

  // User: personal stats
  app.get("/api/attendance/my/stats", authenticateToken, requireAnyRole, async (req: any, res) => {
    try {
      const pool = await getConnection();
      const r = await pool.request().input("uid", sql.Int, req.user.id).query(`
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN status='present' THEN 1 END) as present,
          COUNT(CASE WHEN status='late' THEN 1 END) as late,
          COUNT(CASE WHEN status='absent' THEN 1 END) as absent,
          COUNT(CASE WHEN status='excused' THEN 1 END) as excused,
          COUNT(CASE WHEN status='sick' THEN 1 END) as sick,
          CAST(ROUND(
            CAST(COUNT(CASE WHEN status IN ('present','late') THEN 1 END) AS FLOAT)/
            NULLIF(COUNT(*),0)*100,2) AS DECIMAL(5,2)) as attendance_percentage
        FROM attendance WHERE user_id=@uid
      `);
      // Streak calculation
      const streakR = await pool.request().input("uid", sql.Int, req.user.id).query(`
        SELECT TOP 60 attendance_date,status
        FROM attendance WHERE user_id=@uid
        ORDER BY attendance_date DESC
      `);
      let streak = 0;
      for (const row of streakR.recordset) {
        if (["present","late"].includes(row.status)) streak++;
        else break;
      }
      res.json({ success: true, data: { ...r.recordset[0], streak } });
    } catch (e: any) { res.status(500).json({ success: false, message: "DB error" }); }
  });

  app.get("/api/attendance", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { eventId, startDate, endDate, status, userId, division } = req.query;
      const pool = await getConnection();
      const rq = pool.request();
      let where = "WHERE 1=1";
      if (userId) { rq.input("uid",sql.Int,Number(userId)); where+=" AND a.user_id=@uid"; }
      if (eventId) { rq.input("eid",sql.Int,Number(eventId)); where+=" AND a.event_id=@eid"; }
      if (startDate) { rq.input("sd",sql.Date,startDate); where+=" AND a.attendance_date>=@sd"; }
      if (endDate) { rq.input("ed",sql.Date,endDate); where+=" AND a.attendance_date<=@ed"; }
      if (status && status!=="all") { rq.input("s",sql.NVarChar,status); where+=" AND a.status=@s"; }
      if (division) { rq.input("div",sql.NVarChar,division); where+=" AND u.division=@div"; }
      const r = await rq.query(`
        SELECT a.*,u.full_name as user_name,u.member_id,u.division,e.event_name,e.event_code
        FROM attendance a
        JOIN users u ON a.user_id=u.id
        JOIN events e ON a.event_id=e.id
        ${where}
        ORDER BY a.attendance_date DESC,a.check_in_time DESC
      `);
      res.json({ success: true, data: r.recordset });
    } catch (e: any) { res.status(500).json({ success: false, message: "DB error" }); }
  });

  app.get("/api/attendance/:id", authenticateToken, requireAnyRole, async (req: any, res) => {
    try {
      const pool = await getConnection();
      const r = await pool.request().input("id", sql.Int, req.params.id).query(`
        SELECT a.*,u.full_name as user_name,e.event_name,e.event_code
        FROM attendance a JOIN users u ON a.user_id=u.id JOIN events e ON a.event_id=e.id
        WHERE a.id=@id
      `);
      if (!r.recordset.length) return res.status(404).json({ success: false, message: "Not found" });
      const rec = r.recordset[0];
      // User can only see own records
      if (req.user.role === "user" && rec.user_id !== req.user.id)
        return res.status(403).json({ success: false, message: "Access denied" });
      res.json({ success: true, data: rec });
    } catch (e: any) { res.status(500).json({ success: false, message: "DB error" }); }
  });

  app.post("/api/attendance", authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { userId, eventId, attendanceDate, checkInTime, checkOutTime, status, deviceInfo } = req.body;
      if (!userId || !eventId || !attendanceDate || !checkInTime || !status)
        return res.status(400).json({ success: false, message: "Required fields missing" });
      const pool = await getConnection();
      const dup = await pool.request()
        .input("uid",sql.Int,userId).input("eid",sql.Int,eventId).input("d",sql.Date,attendanceDate)
        .query("SELECT id FROM attendance WHERE user_id=@uid AND event_id=@eid AND attendance_date=@d");
      if (dup.recordset.length)
        return res.status(400).json({ success: false, message: "Attendance already recorded" });
      const r = await pool.request()
        .input("uid",sql.Int,userId).input("eid",sql.Int,eventId)
        .input("d",sql.Date,attendanceDate).input("ci",sql.DateTime,checkInTime)
        .input("co",sql.DateTime,checkOutTime||null).input("s",sql.NVarChar,status)
        .input("di",sql.NVarChar,deviceInfo||"Manual Entry - Admin Web")
        .query(`
          INSERT INTO attendance (user_id,event_id,attendance_date,check_in_time,check_out_time,status,device_info,created_at)
          OUTPUT INSERTED.*
          VALUES (@uid,@eid,@d,@ci,@co,@s,@di,GETDATE())
        `);
      await logActivity(pool,req.user.id,"MANUAL_ATTENDANCE","attendance",r.recordset[0].id,
        `Manual attendance: user ${userId}, event ${eventId}, ${status}`,req.ip);
      res.status(201).json({ success: true, data: r.recordset[0] });
    } catch (e: any) { res.status(500).json({ success: false, message: "DB error" }); }
  });

  // User self check-in via QR token
  app.post("/api/attendance/checkin", authenticateToken, requireAnyRole, async (req: any, res) => {
    try {
      const { qrToken, eventId, deviceInfo } = req.body;
      const pool = await getConnection();
      const today = new Date().toISOString().split("T")[0];

      let resolvedEventId = eventId;

      if (qrToken) {
        const tokenR = await pool.request().input("t", sql.NVarChar, qrToken)
          .query("SELECT * FROM qr_tokens WHERE token=@t AND expires_at>GETDATE()");
        if (!tokenR.recordset.length)
          return res.status(400).json({ success: false, message: "QR code expired or invalid" });
        resolvedEventId = tokenR.recordset[0].event_id;
      }

      if (!resolvedEventId)
        return res.status(400).json({ success: false, message: "Event ID or QR token required" });

      // Duplicate check
      const dup = await pool.request()
        .input("uid",sql.Int,req.user.id).input("eid",sql.Int,resolvedEventId).input("d",sql.Date,today)
        .query("SELECT id FROM attendance WHERE user_id=@uid AND event_id=@eid AND attendance_date=@d");
      if (dup.recordset.length)
        return res.status(400).json({ success: false, message: "Already checked in today" });

      // Get lateness threshold
      const settR = await pool.request().query(
        "SELECT setting_value FROM system_settings WHERE setting_key='late_threshold'"
      );
      const lateMin = parseInt(settR.recordset[0]?.setting_value || "15");

      // Determine status: for now, mark present (admin can adjust)
      const now = new Date();
      const status = "present"; // Could compare against event schedule start time + lateMin

      const r = await pool.request()
        .input("uid",sql.Int,req.user.id).input("eid",sql.Int,resolvedEventId)
        .input("d",sql.Date,today).input("ci",sql.DateTime,now)
        .input("s",sql.NVarChar,status)
        .input("di",sql.NVarChar,deviceInfo||"User Self Check-in")
        .query(`
          INSERT INTO attendance (user_id,event_id,attendance_date,check_in_time,status,device_info,created_at)
          OUTPUT INSERTED.*
          VALUES (@uid,@eid,@d,@ci,@s,@di,GETDATE())
        `);
      res.status(201).json({ success: true, data: r.recordset[0], message: "Check-in successful" });
    } catch (e: any) { console.error(e); res.status(500).json({ success: false, message: "DB error" }); }
  });

  app.put("/api/attendance/:id", authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { checkOutTime, status, notes } = req.body;
      const pool = await getConnection();
      const exists = await pool.request().input("id",sql.Int,req.params.id)
        .query("SELECT id FROM attendance WHERE id=@id");
      if (!exists.recordset.length) return res.status(404).json({ success: false, message: "Not found" });
      await pool.request()
        .input("id",sql.Int,req.params.id)
        .input("co",sql.DateTime,checkOutTime||null)
        .input("s",sql.NVarChar,status)
        .input("n",sql.NVarChar,notes||null)
        .query("UPDATE attendance SET check_out_time=@co,status=@s,notes=@n,updated_at=GETDATE() WHERE id=@id");
      await logActivity(pool,req.user.id,"UPDATE_ATTENDANCE","attendance",parseInt(req.params.id),
        `Updated attendance id:${req.params.id} → ${status}`,req.ip);
      res.json({ success: true, message: "Attendance updated" });
    } catch (e: any) { res.status(500).json({ success: false, message: "DB error" }); }
  });

  app.delete("/api/attendance/:id", authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const pool = await getConnection();
      const r = await pool.request().input("id",sql.Int,req.params.id)
        .query("DELETE FROM attendance WHERE id=@id");
      if (!r.rowsAffected[0]) return res.status(404).json({ success: false, message: "Not found" });
      await logActivity(pool,req.user.id,"DELETE_ATTENDANCE","attendance",parseInt(req.params.id),
        `Deleted attendance id:${req.params.id}`,req.ip);
      res.json({ success: true, message: "Deleted" });
    } catch (e: any) { res.status(500).json({ success: false, message: "DB error" }); }
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // QR TOKENS  (admin+)
  // ══════════════════════════════════════════════════════════════════════════════
  app.post("/api/qr/generate", authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { eventId, validDate, expiryMinutes = 60 } = req.body;
      if (!eventId) return res.status(400).json({ success: false, message: "eventId required" });
      const pool = await getConnection();
      const token = crypto.randomBytes(32).toString("hex");
      const vDate = validDate || new Date().toISOString().split("T")[0];
      const expires = new Date(Date.now() + Number(expiryMinutes) * 60000);
      await pool.request()
        .input("eid",sql.Int,eventId).input("tok",sql.NVarChar,token)
        .input("vd",sql.Date,vDate).input("exp",sql.DateTime,expires)
        .input("cb",sql.Int,req.user.id)
        .query(`
          INSERT INTO qr_tokens (event_id,token,valid_date,expires_at,created_by,created_at)
          VALUES (@eid,@tok,@vd,@exp,@cb,GETDATE())
        `);
      res.json({ success: true, data: { token, validDate: vDate, expiresAt: expires } });
    } catch (e: any) { res.status(500).json({ success: false, message: "DB error" }); }
  });

  app.get("/api/qr/:eventId", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const pool = await getConnection();
      const r = await pool.request().input("eid",sql.Int,req.params.eventId)
        .query("SELECT * FROM qr_tokens WHERE event_id=@eid AND expires_at>GETDATE() ORDER BY created_at DESC");
      res.json({ success: true, data: r.recordset });
    } catch (e: any) { res.status(500).json({ success: false, message: "DB error" }); }
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // SCHEDULES  (read: all auth; write: admin+)
  // ══════════════════════════════════════════════════════════════════════════════
  app.get("/api/schedules", authenticateToken, requireAnyRole, async (req, res) => {
    try {
      const { eventId, upcoming } = req.query;
      const pool = await getConnection();
      const rq = pool.request();
      let where = "WHERE 1=1";
      if (eventId) { rq.input("eid",sql.Int,Number(eventId)); where+=" AND s.event_id=@eid"; }
      if (upcoming === "true") { where+=" AND s.scheduled_date>=CAST(GETDATE() AS DATE)"; }
      const r = await rq.query(`
        SELECT s.*,e.event_name,e.event_code,e.event_type
        FROM schedules s JOIN events e ON s.event_id=e.id
        ${where} ORDER BY s.scheduled_date ASC
      `);
      res.json({ success: true, data: r.recordset });
    } catch (e: any) { res.status(500).json({ success: false, message: "DB error" }); }
  });

  app.post("/api/schedules", authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { eventId, scheduledDate, startTime, endTime, location, notes } = req.body;
      if (!eventId || !scheduledDate || !startTime)
        return res.status(400).json({ success: false, message: "eventId, scheduledDate, startTime required" });
      const pool = await getConnection();
      const r = await pool.request()
        .input("eid",sql.Int,eventId).input("d",sql.Date,scheduledDate)
        .input("st",sql.NVarChar,startTime).input("et",sql.NVarChar,endTime||null)
        .input("loc",sql.NVarChar,location||null).input("n",sql.NVarChar,notes||null)
        .input("cb",sql.Int,req.user.id)
        .query(`
          INSERT INTO schedules (event_id,scheduled_date,start_time,end_time,location,notes,created_by,created_at)
          OUTPUT INSERTED.*
          VALUES (@eid,@d,@st,@et,@loc,@n,@cb,GETDATE())
        `);
      res.status(201).json({ success: true, data: r.recordset[0] });
    } catch (e: any) { res.status(500).json({ success: false, message: "DB error" }); }
  });

  app.delete("/api/schedules/:id", authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const pool = await getConnection();
      await pool.request().input("id",sql.Int,req.params.id)
        .query("DELETE FROM schedules WHERE id=@id");
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ success: false, message: "DB error" }); }
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // ANNOUNCEMENTS  (read: all auth; write: admin+)
  // ══════════════════════════════════════════════════════════════════════════════
  app.get("/api/announcements", authenticateToken, requireAnyRole, async (req, res) => {
    try {
      const pool = await getConnection();
      const r = await pool.request().query(`
        SELECT a.*,u.full_name as author_name
        FROM announcements a LEFT JOIN users u ON a.author_id=u.id
        WHERE a.is_active=1
        ORDER BY a.pinned DESC,a.created_at DESC
      `);
      res.json({ success: true, data: r.recordset });
    } catch (e: any) { res.status(500).json({ success: false, message: "DB error" }); }
  });

  app.post("/api/announcements", authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { title, body, pinned = false } = req.body;
      if (!title || !body) return res.status(400).json({ success: false, message: "title and body required" });
      const pool = await getConnection();
      const r = await pool.request()
        .input("t",sql.NVarChar,title).input("b",sql.NVarChar,body)
        .input("p",sql.Bit,pinned?1:0).input("aid",sql.Int,req.user.id)
        .query(`
          INSERT INTO announcements (title,body,author_id,is_active,pinned,created_at,updated_at)
          OUTPUT INSERTED.*
          VALUES (@t,@b,@aid,1,@p,GETDATE(),GETDATE())
        `);
      res.status(201).json({ success: true, data: r.recordset[0] });
    } catch (e: any) { res.status(500).json({ success: false, message: "DB error" }); }
  });

  app.put("/api/announcements/:id", authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { title, body, pinned, isActive } = req.body;
      const pool = await getConnection();
      const sets: string[] = ["updated_at=GETDATE()"];
      const rq = pool.request().input("id",sql.Int,req.params.id);
      if (title!==undefined) { rq.input("t",sql.NVarChar,title); sets.push("title=@t"); }
      if (body!==undefined) { rq.input("b",sql.NVarChar,body); sets.push("body=@b"); }
      if (pinned!==undefined) { rq.input("p",sql.Bit,pinned?1:0); sets.push("pinned=@p"); }
      if (isActive!==undefined) { rq.input("ia",sql.Bit,isActive?1:0); sets.push("is_active=@ia"); }
      await rq.query(`UPDATE announcements SET ${sets.join(",")} WHERE id=@id`);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ success: false, message: "DB error" }); }
  });

  app.delete("/api/announcements/:id", authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const pool = await getConnection();
      await pool.request().input("id",sql.Int,req.params.id)
        .query("DELETE FROM announcements WHERE id=@id");
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ success: false, message: "DB error" }); }
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // DIVISIONS  (read: all auth; write: super_admin)
  // ══════════════════════════════════════════════════════════════════════════════
  app.get("/api/divisions", authenticateToken, requireAnyRole, async (_req, res) => {
    try {
      const pool = await getConnection();
      const r = await pool.request().query("SELECT * FROM divisions WHERE is_active=1 ORDER BY name");
      res.json({ success: true, data: r.recordset });
    } catch (e: any) { res.status(500).json({ success: false, message: "DB error" }); }
  });

  app.post("/api/divisions", authenticateToken, requireSuperAdmin, async (req: any, res) => {
    try {
      const { name, description, leaderId } = req.body;
      if (!name) return res.status(400).json({ success: false, message: "name required" });
      const pool = await getConnection();
      const r = await pool.request()
        .input("n",sql.NVarChar,name).input("d",sql.NVarChar,description||null)
        .input("l",sql.Int,leaderId||null)
        .query(`
          INSERT INTO divisions (name,description,leader_id,is_active,created_at)
          OUTPUT INSERTED.*
          VALUES (@n,@d,@l,1,GETDATE())
        `);
      res.status(201).json({ success: true, data: r.recordset[0] });
    } catch (e: any) { res.status(500).json({ success: false, message: "DB error" }); }
  });

  app.put("/api/divisions/:id", authenticateToken, requireSuperAdmin, async (req: any, res) => {
    try {
      const { name, description, leaderId, isActive } = req.body;
      const pool = await getConnection();
      const sets: string[] = [];
      const rq = pool.request().input("id",sql.Int,req.params.id);
      if (name)             { rq.input("n",sql.NVarChar,name);         sets.push("name=@n"); }
      if (description!==undefined) { rq.input("d",sql.NVarChar,description||null); sets.push("description=@d"); }
      if (leaderId!==undefined)    { rq.input("l",sql.Int,leaderId||null);          sets.push("leader_id=@l"); }
      if (isActive!==undefined)    { rq.input("ia",sql.Bit,isActive?1:0);           sets.push("is_active=@ia"); }
      if (!sets.length) return res.status(400).json({ success: false, message: "Nothing to update" });
      await rq.query(`UPDATE divisions SET ${sets.join(",")} WHERE id=@id`);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ success: false, message: "DB error" }); }
  });

  app.delete("/api/divisions/:id", authenticateToken, requireSuperAdmin, async (req: any, res) => {
    try {
      const pool = await getConnection();
      await pool.request().input("id",sql.Int,req.params.id)
        .query("UPDATE divisions SET is_active=0 WHERE id=@id");
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ success: false, message: "DB error" }); }
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // DASHBOARD
  // ══════════════════════════════════════════════════════════════════════════════
  app.get("/api/dashboard/stats", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const pool = await getConnection();
      const today = new Date().toISOString().split("T")[0];
      const [mR, eR, tR, rR] = await Promise.all([
        pool.request().query("SELECT COUNT(*) as c FROM users WHERE role='user' AND is_active=1"),
        pool.request().query("SELECT COUNT(*) as c FROM events WHERE is_active=1"),
        pool.request().input("d",sql.Date,today).query(`
          SELECT ISNULL(COUNT(CASE WHEN status IN ('present','late') THEN 1 END),0) as ci,
                 ISNULL(COUNT(CASE WHEN status='absent' THEN 1 END),0) as ab
          FROM attendance WHERE attendance_date=@d
        `),
        pool.request().query(`
          SELECT CAST(ROUND(
            CAST(COUNT(CASE WHEN status IN ('present','late') THEN 1 END) AS FLOAT)/
            NULLIF(COUNT(*),0)*100,1) AS DECIMAL(5,1)) as rate
          FROM attendance WHERE attendance_date>=DATEADD(MONTH,-1,GETDATE())
        `),
      ]);
      const total = mR.recordset[0].c;
      const ci = tR.recordset[0].ci;
      res.json({ success: true, data: {
        totalMembers: total, activeEvents: eR.recordset[0].c,
        todayAttendance: { checkedIn: ci, pending: Math.max(0,total-ci), absent: tR.recordset[0].ab },
        attendanceRate: rR.recordset[0].rate || 0,
      }});
    } catch (e: any) { res.status(500).json({ success: false, message: "DB error" }); }
  });

  app.get("/api/dashboard/activities", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { limit = 10 } = req.query;
      const pool = await getConnection();
      const r = await pool.request().input("lim",sql.Int,Number(limit)).query(`
        SELECT TOP (@lim) al.*,u.full_name as user_name
        FROM activity_logs al LEFT JOIN users u ON al.user_id=u.id
        ORDER BY al.created_at DESC
      `);
      res.json({ success: true, data: r.recordset });
    } catch (e: any) { res.status(500).json({ success: false, message: "DB error" }); }
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // REPORTS  (admin+)
  // ══════════════════════════════════════════════════════════════════════════════
  app.post("/api/reports/generate", authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { reportType, eventId, period, format } = req.body;
      const pool = await getConnection();
      const days = ({ week:7, month:30, semester:180, year:365 } as any)[period] || 30;
      const rq = pool.request().input("days",sql.Int,days);
      let ef = "";
      if (eventId && eventId !== "all") { rq.input("eid",sql.Int,Number(eventId)); ef=" AND a.event_id=@eid"; }

      const queries: Record<string,string> = {
        "lateness-report": `
          SELECT u.full_name,u.member_id,u.division,e.event_code,e.event_name,
            CONVERT(NVARCHAR(10),a.attendance_date,23) as attendance_date,
            CONVERT(NVARCHAR(5),a.check_in_time,108) as check_in_time, a.status
          FROM attendance a JOIN users u ON a.user_id=u.id JOIN events e ON a.event_id=e.id
          WHERE a.status='late' AND a.attendance_date>=DATEADD(DAY,-@days,GETDATE()) ${ef}
          ORDER BY a.attendance_date DESC
        `,
        "student-performance": `
          SELECT u.full_name,u.member_id,u.division,
            COUNT(*) as total_sessions,
            COUNT(CASE WHEN a.status IN('present','late') THEN 1 END) as attended,
            COUNT(CASE WHEN a.status='absent' THEN 1 END) as absent,
            CAST(ROUND(CAST(COUNT(CASE WHEN a.status IN('present','late') THEN 1 END) AS FLOAT)/
              NULLIF(COUNT(*),0)*100,1) AS DECIMAL(5,1)) as attendance_pct
          FROM attendance a JOIN users u ON a.user_id=u.id
          WHERE a.attendance_date>=DATEADD(DAY,-@days,GETDATE()) ${ef}
          GROUP BY u.id,u.full_name,u.member_id,u.division
          ORDER BY attendance_pct DESC
        `,
        "absence-analysis": `
          SELECT u.full_name,u.member_id,u.division,e.event_code,
            COUNT(CASE WHEN a.status='absent' THEN 1 END) as total_absent,
            COUNT(CASE WHEN a.status='excused' THEN 1 END) as total_excused,
            COUNT(CASE WHEN a.status='sick' THEN 1 END) as total_sick,
            COUNT(*) as total_sessions
          FROM attendance a JOIN users u ON a.user_id=u.id JOIN events e ON a.event_id=e.id
          WHERE a.attendance_date>=DATEADD(DAY,-@days,GETDATE()) ${ef}
          GROUP BY u.id,u.full_name,u.member_id,u.division,e.event_code
          ORDER BY total_absent DESC
        `,
      };
      const defaultQ = `
        SELECT u.full_name,u.member_id,u.division,e.event_code,e.event_name,
          CONVERT(NVARCHAR(10),a.attendance_date,23) as attendance_date,
          CONVERT(NVARCHAR(5),a.check_in_time,108) as check_in_time,
          CONVERT(NVARCHAR(5),a.check_out_time,108) as check_out_time,
          a.status, a.device_info, a.notes
        FROM attendance a JOIN users u ON a.user_id=u.id JOIN events e ON a.event_id=e.id
        WHERE a.attendance_date>=DATEADD(DAY,-@days,GETDATE()) ${ef}
        ORDER BY a.attendance_date DESC,u.full_name
      `;
      const result = await rq.query(queries[reportType] || defaultQ);
      await logActivity(pool,req.user.id,"GENERATE_REPORT","report",null,
        `Generated ${reportType} (${period}, ${format})`,req.ip);
      res.json({ success: true, data: {
        id: `RPT_${Date.now()}`, reportType, period, format,
        rows: result.recordset, generatedAt: new Date().toISOString(), count: result.recordset.length,
      }});
    } catch (e: any) { console.error(e); res.status(500).json({ success: false, message: "DB error" }); }
  });

  app.get("/api/reports", authenticateToken, requireAdmin, (_req, res) => {
    res.json({ success: true, data: [] });
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // SETTINGS
  // ══════════════════════════════════════════════════════════════════════════════
  app.get("/api/settings/profile", authenticateToken, requireAnyRole, async (req: any, res) => {
    try {
      const pool = await getConnection();
      const r = await pool.request().input("uid",sql.Int,req.user.id)
        .query("SELECT id,full_name,email,phone_number,role,member_id,division,avatar_url,created_at FROM users WHERE id=@uid");
      if (!r.recordset.length) return res.status(404).json({ success: false, message: "Not found" });
      res.json({ success: true, data: r.recordset[0] });
    } catch (e: any) { res.status(500).json({ success: false, message: "DB error" }); }
  });

  app.put("/api/settings/profile", authenticateToken, requireAnyRole, async (req: any, res) => {
    try {
      const { fullName, phoneNumber, avatarUrl } = req.body;
      const pool = await getConnection();
      await pool.request()
        .input("uid",sql.Int,req.user.id).input("fn",sql.NVarChar,fullName)
        .input("ph",sql.NVarChar,phoneNumber||null).input("av",sql.NVarChar,avatarUrl||null)
        .query("UPDATE users SET full_name=@fn,phone_number=@ph,avatar_url=@av,updated_at=GETDATE() WHERE id=@uid");
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ success: false, message: "DB error" }); }
  });

  app.post("/api/settings/change-password", authenticateToken, requireAnyRole, async (req: any, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword || newPassword.length < 8)
        return res.status(400).json({ success: false, message: "Invalid password data" });
      const pool = await getConnection();
      const u = await pool.request().input("uid",sql.Int,req.user.id)
        .query("SELECT password_hash FROM users WHERE id=@uid");
      if (!await bcrypt.compare(currentPassword, u.recordset[0].password_hash))
        return res.status(400).json({ success: false, message: "Current password incorrect" });
      const hash = await bcrypt.hash(newPassword, 10);
      await pool.request().input("uid",sql.Int,req.user.id).input("pw",sql.NVarChar,hash)
        .query("UPDATE users SET password_hash=@pw WHERE id=@uid");
      res.json({ success: true, message: "Password changed" });
    } catch (e: any) { res.status(500).json({ success: false, message: "DB error" }); }
  });

  app.get("/api/settings/system", authenticateToken, requireSuperAdmin, async (_req, res) => {
    try {
      const pool = await getConnection();
      const r = await pool.request().query("SELECT setting_key,setting_value,setting_type,description FROM system_settings");
      const settings: Record<string,any> = {};
      r.recordset.forEach((row: any) => {
        let v: any = row.setting_value;
        if (row.setting_type === "boolean") v = v === "true";
        else if (row.setting_type === "integer") v = parseInt(v);
        settings[row.setting_key] = v;
      });
      res.json({ success: true, data: settings });
    } catch (e: any) { res.status(500).json({ success: false, message: "DB error" }); }
  });

  app.put("/api/settings/system", authenticateToken, requireSuperAdmin, async (req: any, res) => {
    try {
      const pool = await getConnection();
      for (const [key, val] of Object.entries(req.body)) {
        await pool.request().input("k",sql.NVarChar,key).input("v",sql.NVarChar,String(val))
          .query("UPDATE system_settings SET setting_value=@v,updated_at=GETDATE() WHERE setting_key=@k");
      }
      await logActivity(pool,req.user.id,"UPDATE_SETTINGS","system",null,"System settings updated",req.ip);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ success: false, message: "DB error" }); }
  });

  app.get("/api/settings/activity-logs", authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
      const { limit = 50, offset = 0 } = req.query;
      const pool = await getConnection();
      const r = await pool.request().input("lim",sql.Int,Number(limit)).input("off",sql.Int,Number(offset))
        .query(`
          SELECT al.*,u.full_name as user_name
          FROM activity_logs al LEFT JOIN users u ON al.user_id=u.id
          ORDER BY al.created_at DESC
          OFFSET @off ROWS FETCH NEXT @lim ROWS ONLY
        `);
      res.json({ success: true, data: r.recordset });
    } catch (e: any) { res.status(500).json({ success: false, message: "DB error" }); }
  });

  // Admin can read settings (read-only)
  app.get("/api/settings/system/public", authenticateToken, requireAdmin, async (_req, res) => {
    try {
      const pool = await getConnection();
      const r = await pool.request().query(`
        SELECT setting_key,setting_value,setting_type
        FROM system_settings
        WHERE setting_key IN ('org_name','org_logo_url','ranking_enabled','ranking_period',
                              'allow_self_checkin','late_threshold','attendance_window')
      `);
      const s: Record<string,any> = {};
      r.recordset.forEach((row: any) => {
        let v: any = row.setting_value;
        if (row.setting_type==="boolean") v = v==="true";
        else if (row.setting_type==="integer") v = parseInt(v);
        s[row.setting_key] = v;
      });
      res.json({ success: true, data: s });
    } catch (e: any) { res.status(500).json({ success: false, message: "DB error" }); }
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // MISC
  // ══════════════════════════════════════════════════════════════════════════════
  app.get("/api/ping", (_req, res) => res.json({ message: process.env.PING_MESSAGE ?? "ping" }));
  app.get("/api/demo", handleDemo);

  app.use((req, res, next) => {
    if (req.path.startsWith("/api/"))
      return res.status(404).json({ error: `${req.method} ${req.path} not found` });
    next();
  });

  return app;
}