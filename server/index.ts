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
  requireSuperAdmin,
  requireAdmin,
  requireAnyRole,
  requireSelfOrAdmin,
  ROLE_PERMISSIONS,
} from "./middleware/rbac.js";
import { handleDemo } from "./routes/demo.js";
import { QuestionRepository } from './db/repositories/QuestionRepository';
import { handleGetLeaderboard } from "./routes/attendance.js";
import { handleAwardQuestionPoints, handleGetUserDashboard, handleGetUserDashboardQuestions, handleAnswerUserDashboardQuestion } from "./routes/userDashboard.js";
import { handleGetMemberLeaderboard } from "./routes/memberLeaderboard.js";
import {
  handlePreviewDetection,
  handleCaptureRegistration,
  handleFinalizeRegistration,
  handleVerifyAttendance,
} from "./routes/faceAi.js";
import {
  handleGetRegularEvents,
  handleCreateRegularEvent,
  handleUpdateRegularEvent,
  handleDeleteRegularEvent,
} from "./routes/regularEvent.js";
import { getActiveEvent } from "./utils/timezone.js";
import nodemailer from "nodemailer";

// ─── Email transporter ────────────────────────────────────────────────────────
const mailer = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER || "visiattend.system@gmail.com",
    pass: process.env.MAIL_PASS || "",
  },
});

// ─── Activity logger ──────────────────────────────────────────────────────────
async function log(
  pool: any,
  userId: number | null,
  action: string,
  entityType: string,
  entityId: number | null,
  desc: string,
  ip?: string
) {
  try {
    await pool
      .request()
      .input("u", sql.Int, userId)
      .input("a", sql.NVarChar, action)
      .input("et", sql.NVarChar, entityType)
      .input("ei", sql.Int, entityId)
      .input("d", sql.NVarChar, desc.slice(0, 500))
      .input("ip", sql.NVarChar, ip || null)
      .query(
        `INSERT INTO activity_logs (user_id,action,entity_type,entity_id,description,ip_address,created_at)
         VALUES (@u,@a,@et,@ei,@d,@ip,GETDATE())`
      );
  } catch {
    /* non-fatal */
  }
}

export function createServer() {
  const app = express();

  app.use(
    cors({
      origin: true,
      credentials: true,
    })
  );
  app.use(express.json({ limit: "5mb" }));
  app.use(express.urlencoded({ extended: true }));

  // ════════════════════════════════════════════════════════════════════════════
  // PUBLIC — AUTH
  // ════════════════════════════════════════════════════════════════════════════

  // POST /api/auth/login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password)
        return res
          .status(400)
          .json({ success: false, message: "Email and password required" });

      const pool = await getConnection();
      const result = await pool
        .request()
        .input("e", sql.NVarChar, email.toLowerCase().trim())
        .query("SELECT * FROM users WHERE email=@e");

      if (!result.recordset.length)
        return res
          .status(401)
          .json({ success: false, message: "Invalid email or password" });

      const user = result.recordset[0];
      if (!user.is_active)
        return res.status(401).json({
          success: false,
          message: "Account is deactivated. Please contact admin.",
        });

      const passwordMatch = await bcrypt.compare(password, user.password_hash);
      if (!passwordMatch)
        return res
          .status(401)
          .json({ success: false, message: "Invalid email or password" });

      // Update last login
      await pool
        .request()
        .input("id", sql.Int, user.id)
        .query("UPDATE users SET last_login=GETDATE() WHERE id=@id");

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET || "secret_key_change_in_production",
        { expiresIn: "24h" }
      );

      // Store session
      await pool
        .request()
        .input("uid", sql.Int, user.id)
        .input("at", sql.NVarChar, token)
        .input("rt", sql.NVarChar, token)
        .input("exp", sql.DateTime, new Date(Date.now() + 86_400_000))
        .input("ip", sql.NVarChar, req.ip || null)
        .input(
          "ua",
          sql.NVarChar,
          (req.headers["user-agent"] || "").slice(0, 255)
        )
        .query(
          `INSERT INTO sessions (user_id,access_token,refresh_token,expires_at,ip_address,user_agent,created_at,last_activity)
           VALUES (@uid,@at,@rt,@exp,@ip,@ua,GETDATE(),GETDATE())`
        );

      await log(
        pool,
        user.id,
        "LOGIN",
        "user",
        user.id,
        `${user.full_name} logged in as ${user.role}`,
        req.ip
      );

      res.json({
        success: true,
        data: {
          accessToken: token,
          refreshToken: token,
          user: {
            id: user.id,
            full_name: user.full_name,
            email: user.email,
            role: user.role,
            jabatan: user.jabatan,
            division: user.division,
            avatar_url: user.avatar_url,
            permissions:
              ROLE_PERMISSIONS[user.role as keyof typeof ROLE_PERMISSIONS] ||
              [],
          },
        },
      });
    } catch (e: any) {
      console.error("[LOGIN]", e);
      res.status(500).json({ success: false, message: "Server error" });
    }
  });

  // GET /api/auth/me
  app.get(
    "/api/auth/me",
    authenticateToken,
    async (req: any, res) => {
      try {
        const pool = await getConnection();
        const r = await pool
          .request()
          .input("id", sql.Int, req.user.id)
          .query(
            "SELECT id,full_name,email,role,jabatan,division,avatar_url,member_id,phone_number,created_at FROM users WHERE id=@id"
          );
        if (!r.recordset.length)
          return res
            .status(404)
            .json({ success: false, message: "User not found" });
        const user = r.recordset[0];
        res.json({
          success: true,
          data: {
            ...user,
            permissions:
              ROLE_PERMISSIONS[user.role as keyof typeof ROLE_PERMISSIONS] ||
              [],
          },
        });
      } catch {
        res.status(500).json({ success: false, message: "Server error" });
      }
    }
  );

  // POST /api/auth/register
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { fullName, email, password, phoneNumber, jabatan, division } =
        req.body;
      if (!fullName || !email || !password)
        return res
          .status(400)
          .json({
            success: false,
            message: "Name, email, and password required",
          });
      if (password.length < 8)
        return res.status(400).json({
          success: false,
          message: "Password must be at least 8 characters",
        });

      const pool = await getConnection();
      const emailCheck = await pool
        .request()
        .input("e", sql.NVarChar, email.toLowerCase().trim())
        .query("SELECT id FROM users WHERE email=@e");
      if (emailCheck.recordset.length)
        return res
          .status(400)
          .json({ success: false, message: "Email already registered" });

      const maxR = await pool
        .request()
        .query(
          "SELECT MAX(TRY_CAST(SUBSTRING(member_id, 4, LEN(member_id) - 3) AS INT)) as maxVal FROM users WHERE member_id LIKE 'USR%'"
        );
      const nextNum = (maxR.recordset[0].maxVal ?? 0) + 1;
      const memberId = `USR${String(nextNum).padStart(4, "0")}`;

      const hash = await bcrypt.hash(password, 12);
      await pool
        .request()
        .input("fn", sql.NVarChar, fullName)
        .input("mid", sql.NVarChar, memberId)
        .input("em", sql.NVarChar, email.toLowerCase().trim())
        .input("pw", sql.NVarChar, hash)
        .input("ph", sql.NVarChar, phoneNumber || null)
        .input("jab", sql.NVarChar, jabatan || "peserta")
        .input("div", sql.NVarChar, division || null)
        .query(
          `INSERT INTO users (full_name,member_id,email,password_hash,role,jabatan,phone_number,division,is_active,email_verified,created_at)
           VALUES (@fn,@mid,@em,@pw,'user',@jab,@ph,@div,1,0,GETDATE())`
        );

      res.status(201).json({
        success: true,
        message: "Registration successful. You can now login.",
      });
    } catch (e: any) {
      console.error("[REGISTER]", e);
      res.status(500).json({ success: false, message: "Server error" });
    }
  });

  // POST /api/auth/logout
  app.post("/api/auth/logout", async (req, res) => {
    try {
      const token = req.headers["authorization"]?.split(" ")[1];
      if (token) {
        const pool = await getConnection();
        await pool
          .request()
          .input("t", sql.NVarChar, token)
          .query("DELETE FROM sessions WHERE access_token=@t");
      }
      res.json({ success: true, message: "Logged out" });
    } catch {
      res.status(500).json({ success: false, message: "Server error" });
    }
  });

  // POST /api/auth/refresh
  app.post("/api/auth/refresh", async (req, res) => {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken)
        return res
          .status(400)
          .json({ success: false, message: "Refresh token required" });
      const pool = await getConnection();
      const s = await pool
        .request()
        .input("rt", sql.NVarChar, refreshToken)
        .query(
          `SELECT s.*,u.id as uid,u.email,u.role FROM sessions s
           JOIN users u ON s.user_id=u.id
           WHERE s.refresh_token=@rt AND s.expires_at>GETDATE()`
        );
      if (!s.recordset.length)
        return res.status(401).json({
          success: false,
          message: "Invalid or expired refresh token",
        });

      const r = s.recordset[0];
      const newToken = jwt.sign(
        { id: r.uid, email: r.email, role: r.role },
        process.env.JWT_SECRET || "secret_key_change_in_production",
        { expiresIn: "24h" }
      );
      await pool
        .request()
        .input("sid", sql.Int, r.id)
        .input("at", sql.NVarChar, newToken)
        .input("exp", sql.DateTime, new Date(Date.now() + 86_400_000))
        .query(
          "UPDATE sessions SET access_token=@at,expires_at=@exp,last_activity=GETDATE() WHERE id=@sid"
        );

      res.json({ accessToken: newToken });
    } catch {
      res.status(500).json({ success: false, message: "Server error" });
    }
  });

  // POST /api/auth/forgot-password
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email)
        return res
          .status(400)
          .json({ success: false, message: "Email required" });
      const pool = await getConnection();
      const u = await pool
        .request()
        .input("e", sql.NVarChar, email.toLowerCase().trim())
        .query("SELECT id,full_name FROM users WHERE email=@e");

      if (!u.recordset.length)
        return res.json({
          success: true,
          message: "If the email exists, a reset code has been sent",
        });

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      await pool
        .request()
        .input("uid", sql.Int, u.recordset[0].id)
        .query("DELETE FROM password_resets WHERE user_id=@uid");
      await pool
        .request()
        .input("uid", sql.Int, u.recordset[0].id)
        .input("code", sql.NVarChar, code)
        .query(
          "INSERT INTO password_resets (user_id,reset_code,expires_at,created_at) VALUES (@uid,@code,DATEADD(hour, 1, GETDATE()),GETDATE())"
        );

      console.log(`[RESET CODE] ${email} → ${code}`);

      // Send reset email with verification code
      try {
        await mailer.sendMail({
          from: `"VISIATTEND System" <${process.env.MAIL_USER || "visianttend.system@gmail.com"}>`,
          to: String(email).trim(),
          subject: "Verifikasi Reset Password — VISIATTEND",
          html: `
            <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
              <div style="background:linear-gradient(135deg,#7c4dff,#5da2ff);padding:32px 28px;text-align:center">
                <h1 style="color:#fff;margin:0;font-size:24px">VISIATTEND</h1>
                <p style="color:rgba(255,255,255,0.85);margin:6px 0 0">Verifikasi Reset Password</p>
              </div>
              <div style="padding:28px">
                <p style="color:#374151">Halo <strong>${u.recordset[0].full_name}</strong>,</p>
                <p style="color:#374151">Kami menerima permintaan untuk mereset password akun VISIATTEND Anda. Silakan gunakan kode verifikasi di bawah ini untuk melanjutkan:</p>
                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:18px;margin:20px 0;text-align:center;letter-spacing:4px;font-size:28px;font-weight:bold;color:#7c4dff;font-family:monospace">
                  ${code}
                </div>
                <p style="color:#374151">Kode ini akan kedaluwarsa dalam waktu 1 jam. Jika Anda tidak melakukan permintaan ini, abaikan email ini dan password Anda akan tetap aman.</p>
              </div>
              <div style="background:#f1f5f9;padding:16px 28px;text-align:center">
                <p style="color:#9ca3af;font-size:12px;margin:0">&copy; 2026 VISIATTEND System. Jangan bagikan kode ini kepada siapa pun.</p>
              </div>
            </div>
          `,
        });
      } catch (mailErr) {
        console.error("[RESET CODE] Email send failed:", mailErr);
      }

      res.json({ success: true, message: "Reset code sent to your email" });
    } catch (e: any) {
      res.status(500).json({ success: false, message: "Server error" });
    }
  });

  // POST /api/auth/verify-reset-code
  app.post("/api/auth/verify-reset-code", async (req, res) => {
    try {
      const { email, code } = req.body;
      if (!email || !code)
        return res
          .status(400)
          .json({ success: false, message: "Email and code required" });
      const pool = await getConnection();
      const r = await pool
        .request()
        .input("e", sql.NVarChar, email.toLowerCase().trim())
        .input("c", sql.NVarChar, code)
        .query(
          `SELECT pr.id FROM password_resets pr JOIN users u ON pr.user_id=u.id
           WHERE u.email=@e AND pr.reset_code=@c AND pr.is_used=0 AND pr.expires_at>GETDATE()`
        );
      if (!r.recordset.length)
        return res
          .status(400)
          .json({ success: false, message: "Invalid or expired code" });
      res.json({ success: true, message: "Code verified" });
    } catch {
      res.status(500).json({ success: false, message: "Server error" });
    }
  });

  // POST /api/auth/reset-password
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { email, code, newPassword } = req.body;
      if (!email || !code || !newPassword)
        return res
          .status(400)
          .json({ success: false, message: "All fields required" });
      if (newPassword.length < 8)
        return res.status(400).json({
          success: false,
          message: "Password must be at least 8 characters",
        });
      const pool = await getConnection();
      const r = await pool
        .request()
        .input("e", sql.NVarChar, email.toLowerCase().trim())
        .input("c", sql.NVarChar, code)
        .query(
          `SELECT pr.id,pr.user_id FROM password_resets pr JOIN users u ON pr.user_id=u.id
           WHERE u.email=@e AND pr.reset_code=@c AND pr.is_used=0 AND pr.expires_at>GETDATE()`
        );
      if (!r.recordset.length)
        return res
          .status(400)
          .json({ success: false, message: "Invalid or expired code" });
      const { id: rid, user_id: uid } = r.recordset[0];
      const hash = await bcrypt.hash(newPassword, 12);
      await pool
        .request()
        .input("uid", sql.Int, uid)
        .input("pw", sql.NVarChar, hash)
        .query(
          "UPDATE users SET password_hash=@pw,updated_at=GETDATE() WHERE id=@uid"
        );
      await pool
        .request()
        .input("rid", sql.Int, rid)
        .query("UPDATE password_resets SET is_used=1 WHERE id=@rid");
      await pool
        .request()
        .input("uid", sql.Int, uid)
        .query("DELETE FROM sessions WHERE user_id=@uid");
      res.json({ success: true, message: "Password reset successfully" });
    } catch {
      res.status(500).json({ success: false, message: "Server error" });
    }
  });

  // ════════════════════════════════════════════════════════════════════════════
  // USERS
  // ════════════════════════════════════════════════════════════════════════════

  app.get(
    "/api/users",
    authenticateToken,
    requireAdmin,
    async (req: any, res) => {
      try {
        const { role, isActive, division, jabatan, search } = req.query;
        const pool = await getConnection();
        const rq = pool.request();

        const parts = ["1=1"];
        if (req.user.role !== "super_admin")
          parts.push("u.role != 'super_admin'");
        if (role && role !== "all") {
          rq.input("role", sql.NVarChar, role);
          parts.push("u.role=@role");
        }
        if (isActive !== undefined) {
          rq.input("ia", sql.Bit, isActive === "true" ? 1 : 0);
          parts.push("u.is_active=@ia");
        }
        if (division) {
          rq.input("div", sql.NVarChar, division);
          parts.push("u.division=@div");
        }
        if (jabatan) {
          rq.input("jab", sql.NVarChar, jabatan);
          parts.push("u.jabatan=@jab");
        }
        if (search) {
          rq.input("s", sql.NVarChar, `%${search}%`);
          parts.push(
            "(u.full_name LIKE @s OR u.email LIKE @s OR u.member_id LIKE @s OR u.division LIKE @s)"
          );
        }

        const where = "WHERE " + parts.join(" AND ");
        const result = await rq.query(
          `SELECT u.id,u.full_name,u.member_id,u.email,u.role,u.jabatan,u.division,
                  u.phone_number,u.is_active,u.created_at,u.last_login,u.avatar_url
           FROM users u ${where}
           ORDER BY u.created_at DESC`
        );
        res.json({ success: true, data: result.recordset });
      } catch (e: any) {
        console.error("[GET USERS]", e);
        res.status(500).json({ success: false, message: "DB error" });
      }
    }
  );

  app.get(
    "/api/users/:id",
    authenticateToken,
    requireSelfOrAdmin("id"),
    async (req, res) => {
      try {
        const pool = await getConnection();
        const r = await pool
          .request()
          .input("id", sql.Int, req.params.id)
          .query(
            "SELECT id,full_name,member_id,email,role,jabatan,division,phone_number,is_active,created_at,last_login,avatar_url FROM users WHERE id=@id"
          );
        if (!r.recordset.length)
          return res
            .status(404)
            .json({ success: false, message: "User not found" });
        res.json({ success: true, data: r.recordset[0] });
      } catch {
        res.status(500).json({ success: false, message: "DB error" });
      }
    }
  );

  app.post(
    "/api/users",
    authenticateToken,
    requireAdmin,
    async (req: any, res) => {
      try {
        const {
          fullName,
          memberId,
          email,
          password,
          role,
          jabatan,
          phoneNumber,
          division,
        } = req.body;
        if (!fullName || !email || !password)
          return res.status(400).json({
            success: false,
            message: "Name, email, and password required",
          });
        if (password.length < 8)
          return res.status(400).json({
            success: false,
            message: "Password must be at least 8 characters",
          });

        const targetRole = role || "user";
        if (targetRole !== "user" && req.user.role !== "super_admin")
          return res.status(403).json({
            success: false,
            message: "Only super admin can create admin accounts",
          });

        const pool = await getConnection();
        const emailCheck = await pool
          .request()
          .input("e", sql.NVarChar, email.toLowerCase().trim())
          .query("SELECT id FROM users WHERE email=@e");
        if (emailCheck.recordset.length)
          return res
            .status(400)
            .json({ success: false, message: "Email already registered" });

        let finalMemberId = memberId;
        if (finalMemberId) {
          const midCheck = await pool
            .request()
            .input("m", sql.NVarChar, finalMemberId)
            .query("SELECT id FROM users WHERE member_id=@m");
          if (midCheck.recordset.length)
            return res
              .status(400)
              .json({ success: false, message: "Member ID already exists" });
        } else {
          const prefix = targetRole === "admin" ? "ADM" : "USR";
          const maxR = await pool
            .request()
            .input("prefixLike", sql.NVarChar, prefix + "%")
            .query(
              "SELECT MAX(TRY_CAST(SUBSTRING(member_id, 4, LEN(member_id) - 3) AS INT)) as maxVal FROM users WHERE member_id LIKE @prefixLike"
            );
          const nextNum = (maxR.recordset[0].maxVal ?? 0) + 1;
          finalMemberId = `${prefix}${String(nextNum).padStart(4, "0")}`;
        }

        const hash = await bcrypt.hash(password, 12);
        const result = await pool
          .request()
          .input("fn", sql.NVarChar, fullName)
          .input("mid", sql.NVarChar, finalMemberId)
          .input("em", sql.NVarChar, email.toLowerCase().trim())
          .input("pw", sql.NVarChar, hash)
          .input("r", sql.NVarChar, targetRole)
          .input("jab", sql.NVarChar, jabatan || "peserta")
          .input("ph", sql.NVarChar, phoneNumber || null)
          .input("div", sql.NVarChar, division || null)
          .query(
            `INSERT INTO users (full_name,member_id,email,password_hash,role,jabatan,phone_number,division,is_active,email_verified,created_at)
             OUTPUT INSERTED.id,INSERTED.full_name,INSERTED.member_id,INSERTED.email,INSERTED.role,INSERTED.jabatan
             VALUES (@fn,@mid,@em,@pw,@r,@jab,@ph,@div,1,0,GETDATE())`
          );

        await log(
          pool,
          req.user.id,
          "CREATE_USER",
          "user",
          result.recordset[0].id,
          `Created ${targetRole}: ${fullName}`,
          req.ip
        );

        res
          .status(201)
          .json({
            success: true,
            message: "User created successfully",
            data: result.recordset[0],
          });
      } catch (e: any) {
        console.error("[CREATE USER]", e);
        res.status(500).json({ success: false, message: "DB error" });
      }
    }
  );

  app.put(
    "/api/users/:id",
    authenticateToken,
    requireSelfOrAdmin("id"),
    async (req: any, res) => {
      try {
        const targetId = parseInt(req.params.id);
        const isSelf = req.user.id === targetId;
        const isAdmin = ["super_admin", "admin"].includes(req.user.role);
        const isSA = req.user.role === "super_admin";

        const {
          fullName,
          email,
          phoneNumber,
          division,
          jabatan,
          role,
          avatarUrl,
          isActive,
        } = req.body;

        if (role !== undefined && !isSA)
          return res.status(403).json({
            success: false,
            message: "Only super admin can change roles",
          });

        const pool = await getConnection();
        const target = await pool
          .request()
          .input("id", sql.Int, targetId)
          .query("SELECT role FROM users WHERE id=@id");
        if (!target.recordset.length)
          return res
            .status(404)
            .json({ success: false, message: "User not found" });

        if (
          target.recordset[0].role === "super_admin" &&
          req.user.role === "admin"
        )
          return res.status(403).json({
            success: false,
            message: "Cannot modify super admin account",
          });

        const rq = pool.request().input("id", sql.Int, targetId);
        const sets: string[] = ["updated_at=GETDATE()"];

        if (fullName !== undefined && (isAdmin || isSelf)) {
          rq.input("fn", sql.NVarChar, fullName);
          sets.push("full_name=@fn");
        }
        if (email !== undefined && isAdmin) {
          rq.input("em", sql.NVarChar, email.toLowerCase().trim());
          sets.push("email=@em");
        }
        if (phoneNumber !== undefined && (isAdmin || isSelf)) {
          rq.input("ph", sql.NVarChar, phoneNumber || null);
          sets.push("phone_number=@ph");
        }
        if (division !== undefined && isAdmin) {
          rq.input("div", sql.NVarChar, division || null);
          sets.push("division=@div");
        }
        if (jabatan !== undefined && isAdmin) {
          rq.input("jab", sql.NVarChar, jabatan || null);
          sets.push("jabatan=@jab");
        }
        if (role !== undefined && isSA) {
          rq.input("r", sql.NVarChar, role);
          sets.push("role=@r");
        }
        if (avatarUrl !== undefined && (isAdmin || isSelf)) {
          rq.input("av", sql.NVarChar, avatarUrl || null);
          sets.push("avatar_url=@av");
        }
        if (isActive !== undefined && isAdmin) {
          rq.input("ia", sql.Bit, isActive ? 1 : 0);
          sets.push("is_active=@ia");
        }

        if (sets.length === 1)
          return res
            .status(400)
            .json({ success: false, message: "No fields to update" });

        await rq.query(
          `UPDATE users SET ${sets.join(",")} WHERE id=@id`
        );
        await log(
          pool,
          req.user.id,
          "UPDATE_USER",
          "user",
          targetId,
          `Updated user id:${targetId}`,
          req.ip
        );
        res.json({ success: true, message: "User updated successfully" });
      } catch (e: any) {
        console.error("[UPDATE USER]", e);
        res.status(500).json({ success: false, message: "DB error" });
      }
    }
  );

  app.delete(
    "/api/users/:id",
    authenticateToken,
    requireSuperAdmin,
    async (req: any, res) => {
      try {
        if (String(req.user.id) === req.params.id)
          return res
            .status(400)
            .json({
              success: false,
              message: "Cannot delete your own account",
            });
        const pool = await getConnection();
        const r = await pool
          .request()
          .input("id", sql.Int, req.params.id)
          .query("DELETE FROM users WHERE id=@id");
        if (!r.rowsAffected[0])
          return res
            .status(404)
            .json({ success: false, message: "User not found" });
        await log(
          pool,
          req.user.id,
          "DELETE_USER",
          "user",
          parseInt(req.params.id),
          `Deleted user id:${req.params.id}`,
          req.ip
        );
        res.json({ success: true, message: "User deleted" });
      } catch {
        res.status(500).json({ success: false, message: "DB error" });
      }
    }
  );

  app.patch(
    "/api/users/:id/toggle-status",
    authenticateToken,
    requireAdmin,
    async (req: any, res) => {
      try {
        const pool = await getConnection();
        const u = await pool
          .request()
          .input("id", sql.Int, req.params.id)
          .query("SELECT is_active,role FROM users WHERE id=@id");
        if (!u.recordset.length)
          return res
            .status(404)
            .json({ success: false, message: "User not found" });
        if (
          u.recordset[0].role === "super_admin" &&
          req.user.role !== "super_admin"
        )
          return res
            .status(403)
            .json({ success: false, message: "Cannot modify super admin" });
        if (String(req.user.id) === req.params.id)
          return res.status(400).json({
            success: false,
            message: "Cannot deactivate your own account",
          });

        const newStatus = u.recordset[0].is_active ? 0 : 1;
        await pool
          .request()
          .input("id", sql.Int, req.params.id)
          .input("s", sql.Bit, newStatus)
          .query("UPDATE users SET is_active=@s WHERE id=@id");
        await log(
          pool,
          req.user.id,
          "TOGGLE_USER_STATUS",
          "user",
          parseInt(req.params.id),
          `User ${req.params.id} ${newStatus ? "activated" : "deactivated"}`,
          req.ip
        );
        res.json({
          success: true,
          message: `User ${newStatus ? "activated" : "deactivated"}`,
        });
      } catch {
        res.status(500).json({ success: false, message: "DB error" });
      }
    }
  );

  app.post(
    "/api/users/:id/reset-password",
    authenticateToken,
    requireAdmin,
    async (req: any, res) => {
      try {
        const { newPassword } = req.body;
        if (!newPassword || newPassword.length < 8)
          return res.status(400).json({
            success: false,
            message: "Password must be at least 8 characters",
          });

        const pool = await getConnection();
        const target = await pool
          .request()
          .input("id", sql.Int, req.params.id)
          .query("SELECT role FROM users WHERE id=@id");
        if (!target.recordset.length)
          return res
            .status(404)
            .json({ success: false, message: "User not found" });
        if (
          target.recordset[0].role === "super_admin" &&
          req.user.role !== "super_admin"
        )
          return res.status(403).json({
            success: false,
            message: "Cannot reset super admin password",
          });

        const hash = await bcrypt.hash(newPassword, 12);
        await pool
          .request()
          .input("id", sql.Int, req.params.id)
          .input("pw", sql.NVarChar, hash)
          .query(
            "UPDATE users SET password_hash=@pw,updated_at=GETDATE() WHERE id=@id"
          );
        await pool
          .request()
          .input("uid", sql.Int, parseInt(req.params.id))
          .query("DELETE FROM sessions WHERE user_id=@uid");
        await log(
          pool,
          req.user.id,
          "RESET_PASSWORD",
          "user",
          parseInt(req.params.id),
          `Admin reset password for user id:${req.params.id}`,
          req.ip
        );
        res.json({
          success: true,
          message: "Password reset. User sessions cleared.",
        });
      } catch {
        res.status(500).json({ success: false, message: "DB error" });
      }
    }
  );

  // ════════════════════════════════════════════════════════════════════════════
  // ATTENDANCE SCHEDULE  (backed by event_schedule)
  // ════════════════════════════════════════════════════════════════════════════

  // GET all event dates (used by attendance flow to know valid attendance days)
  app.get("/api/attendance-schedule", authenticateToken, requireAnyRole, async (_req, res) => {
    try {
      const pool = await getConnection();
      const r = await pool.request().query(
        `SELECT date_event FROM event_schedule ORDER BY date_event ASC`
      );
      const dates: string[] = r.recordset.map((row: any) => {
        const d = new Date(row.date_event);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      });
      res.json({ success: true, data: dates });
    } catch {
      res.status(500).json({ success: false, message: "DB error" });
    }
  });

  // GET check if today has an event (public — used by attendance landing flow)
  app.get("/api/attendance-schedule/today", async (_req, res) => {
    try {
      const pool = await getConnection();
      const activeEvent = await getActiveEvent(pool);
      res.json({ 
        success: true, 
        isOpen: activeEvent !== null,
        activeEvent: activeEvent
      });
    } catch (e: any) {
      console.error("[GET TODAY SCHEDULE]", e);
      res.status(500).json({ success: false, message: "DB error" });
    }
  });

  // ════════════════════════════════════════════════════════════════════════════
  // USER MEMBER REGISTRATION (PUBLIC)
  // ════════════════════════════════════════════════════════════════════════════

  app.post("/api/user-members", async (req, res) => {
    try {
      const { name, email, category, phone, birthday } = req.body ?? {};

      if (!name || !email || !category || !phone || !birthday) {
        return res.status(400).json({ success: false, message: "name, email, category, phone, birthday required" });
      }

      const pool = await getConnection();

      // ── 1. Check if email already exists in users table ──────────────────
      const emailCheck = await pool
        .request()
        .input("emailCheck", sql.NVarChar, String(email).trim().toLowerCase())
        .query("SELECT id FROM users WHERE email = @emailCheck");
      if (emailCheck.recordset.length) {
        return res.status(400).json({ success: false, message: "Email sudah terdaftar" });
      }

      // ── 2. Generate member_id (USR + max numeric suffix + 1) ─────────────
      const maxR = await pool.request().query(`
        SELECT MAX(TRY_CAST(SUBSTRING(member_id, 4, LEN(member_id) - 3) AS INT)) as maxVal
        FROM users
        WHERE member_id LIKE 'USR%'
      `);
      const nextNum = (maxR.recordset[0].maxVal ?? 0) + 1;
      const memberId = `USR${String(nextNum).padStart(4, "0")}`;

      // ── 3. Generate random plain-text password ───────────────────────────
      const plainPassword = crypto.randomBytes(5).toString("hex"); // e.g. "a3f9b2c1d4"
      const passwordHash = await bcrypt.hash(plainPassword, 12);

      // ── 4. Insert into user_member ───────────────────────────────────────
      await pool
        .request()
        .input("umName",     sql.NVarChar, String(name).trim())
        .input("umEmail",    sql.NVarChar, String(email).trim().toLowerCase())
        .input("umCategory", sql.NVarChar, String(category).trim())
        .input("umPhone",    sql.NVarChar, String(phone).trim())
        .input("umBirthday", sql.Date,     new Date(String(birthday)))
        .input("umMemberId", sql.NVarChar, memberId)
        .query(`
          INSERT INTO user_member (name, email, category, phone, birthday, member_id)
          VALUES (@umName, @umEmail, @umCategory, @umPhone, @umBirthday, @umMemberId);
        `);

      // Fetch the inserted row AFTER the trigger has run (trigger may update member_id)
      const umFetch = await pool
        .request()
        .input("fetchEmail", sql.NVarChar, String(email).trim().toLowerCase())
        .query(`SELECT * FROM user_member WHERE email = @fetchEmail`);

      const newMember = umFetch.recordset[0];

      // ── 5. Insert into users (joined via member_id) ──────────────────────
      await pool
        .request()
        .input("uName",     sql.NVarChar, String(name).trim())
        .input("uMemberId", sql.NVarChar, memberId)
        .input("uEmail",    sql.NVarChar, String(email).trim().toLowerCase())
        .input("uHash",     sql.NVarChar, passwordHash)
        .input("uPhone",    sql.NVarChar, String(phone).trim())
        .query(`
          INSERT INTO users
            (full_name, member_id, email, password_hash, role, phone_number, is_active, email_verified, created_at)
          VALUES
            (@uName, @uMemberId, @uEmail, @uHash, 'user', @uPhone, 1, 0, GETDATE());
        `);

      // ── 6. Send welcome email with credentials ───────────────────────────
      try {
        await mailer.sendMail({
          from: `"VISIATTEND System" <${process.env.MAIL_USER || "visiattend.system@gmail.com"}>`,
          to: String(email).trim(),
          subject: "Selamat datang di VISIATTEND — Akun Anda telah dibuat",
          html: `
            <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
              <div style="background:linear-gradient(135deg,#7c4dff,#5da2ff);padding:32px 28px;text-align:center">
                <h1 style="color:#fff;margin:0;font-size:24px">VISIATTEND</h1>
                <p style="color:rgba(255,255,255,0.85);margin:6px 0 0">Akun Anda telah berhasil didaftarkan</p>
              </div>
              <div style="padding:28px">
                <p style="color:#374151">Halo <strong>${String(name).trim()}</strong>,</p>
                <p style="color:#374151">Berikut adalah informasi login Anda untuk mengakses sistem VISIATTEND:</p>
                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:18px;margin:20px 0">
                  <table style="width:100%;border-collapse:collapse">
                    <tr><td style="color:#6b7280;padding:4px 0;width:100px">Member ID</td><td style="color:#111827;font-weight:600">${memberId}</td></tr>
                    <tr><td style="color:#6b7280;padding:4px 0">Email</td><td style="color:#111827;font-weight:600">${String(email).trim().toLowerCase()}</td></tr>
                    <tr><td style="color:#6b7280;padding:4px 0">Password</td><td style="color:#111827;font-weight:600;font-family:monospace;font-size:16px">${plainPassword}</td></tr>
                  </table>
                </div>
                <p style="color:#374151">Silakan login di halaman <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" style="color:#7c4dff">Login VISIATTEND</a> menggunakan email dan password di atas.</p>
                <p style="color:#9ca3af;font-size:12px;margin-top:24px">Demi keamanan, disarankan untuk mengganti password setelah login pertama kali.</p>
              </div>
              <div style="background:#f1f5f9;padding:16px 28px;text-align:center">
                <p style="color:#9ca3af;font-size:12px;margin:0">&copy; 2026 VISIATTEND System. Jangan bagikan email ini kepada orang lain.</p>
              </div>
            </div>
          `,
        });
      } catch (mailErr) {
        console.error("[USER-MEMBER] Email send failed:", mailErr);
        // Don't fail the request — account is created, email is best-effort
      }

      res.status(201).json({
        success: true,
        data: newMember,
        message: "Akun berhasil dibuat. Cek email untuk mendapatkan password login.",
      });
    } catch (err: any) {
      console.error("[USER-MEMBER]", err);
      // Handle duplicate email in user_member as well
      if (err?.message?.includes("UNIQUE") || err?.number === 2627 || err?.number === 2601) {
        return res.status(400).json({ success: false, message: "Email sudah terdaftar" });
      }
      res.status(500).json({ success: false, message: "DB error" });
    }
  });

  // ════════════════════════════════════════════════════════════════════════════
  // EVENTS  (table: event_schedule)
  // ════════════════════════════════════════════════════════════════════════════

  // GET /api/events
  app.get("/api/events", async (_req, res) => {
    try {
      const pool = await getConnection();
      const r = await pool.request().query(
        `SELECT * FROM event_schedule ORDER BY date_event DESC`
      );
      res.json({ success: true, data: r.recordset });
    } catch {
      res.status(500).json({ success: false, message: "DB error" });
    }
  });

  // GET /api/events/:id
  app.get("/api/events/:id", authenticateToken, requireAnyRole, async (req, res) => {
    try {
      const pool = await getConnection();
      const r = await pool.request()
        .input("id", sql.Int, req.params.id)
        .query("SELECT * FROM event_schedule WHERE id=@id");
      if (!r.recordset.length)
        return res.status(404).json({ success: false, message: "Event not found" });
      
      const event = r.recordset[0];
      
      // Fetch selected/excluded member IDs for this event
      const pR = await pool.request()
        .input("eventId", sql.Int, event.id)
        .query("SELECT member_id FROM event_participants WHERE event_id=@eventId");
      
      event.selectedMemberIds = pR.recordset.map((row: any) => row.member_id);
      
      res.json({ success: true, data: event });
    } catch (e: any) {
      console.error("[GET EVENT BY ID]", e);
      res.status(500).json({ success: false, message: "DB error" });
    }
  });

  // POST /api/events (Batch Save for a Date)
  app.post("/api/events", authenticateToken, requireAdmin, async (req: any, res) => {
    const transaction = new sql.Transaction(await getConnection());
    try {
      const { eventDate, events } = req.body;
      if (!eventDate || !Array.isArray(events)) {
        return res.status(400).json({ success: false, message: "eventDate and events array required" });
      }

      // Validasi 1: Maksimal 4 event per tanggal
      if (events.length > 4) {
        return res.status(400).json({ success: false, message: "Maksimal 4 event dalam satu hari" });
      }

      // Validasi 2: Format & isi setiap event, serta start_time < end_time
      for (let i = 0; i < events.length; i++) {
        const ev = events[i];
        if (!ev.eventName || !ev.eventName.trim()) {
          return res.status(400).json({ success: false, message: `Event ke-${i+1} harus memiliki nama` });
        }
        if (!ev.startTime || !ev.endTime) {
          return res.status(400).json({ success: false, message: `Event "${ev.eventName}" harus memiliki Start Time dan End Time` });
        }
        if (ev.startTime >= ev.endTime) {
          return res.status(400).json({ success: false, message: `Event "${ev.eventName}": Start Time harus lebih awal daripada End Time` });
        }
      }

      // Validasi 3: Cek apakah ada event yang bertabrakan (overlap)
      const sortedEvents = [...events].sort((a, b) => a.startTime.localeCompare(b.startTime));
      for (let i = 0; i < sortedEvents.length - 1; i++) {
        const current = sortedEvents[i];
        const next = sortedEvents[i + 1];
        if (current.endTime > next.startTime) {
          return res.status(400).json({
            success: false,
            message: `Waktu event bertabrakan: "${current.eventName}" (${current.startTime}-${current.endTime}) bertabrakan dengan "${next.eventName}" (${next.startTime}-${next.endTime})`
          });
        }
      }

      // Mulai transaksi database
      await transaction.begin();

      const request = new sql.Request(transaction);
      
      // Ambil semua event yang ada untuk tanggal tersebut di database
      const existingEventsResult = await request
        .input("de", sql.Date, eventDate)
        .query("SELECT id, event_code FROM event_schedule WHERE date_event=@de");
      
      const existingEvents = existingEventsResult.recordset;

      // Filter event untuk dihapus (ada di DB tapi tidak dikirim dari UI)
      const incomingIds = events.map(e => e.id).filter(id => id !== undefined);
      const eventsToDelete = existingEvents.filter(e => !incomingIds.includes(e.id));

      for (const evToDelete of eventsToDelete) {
        // Hapus detail peserta first (FK cascade)
        await new sql.Request(transaction)
          .input("eventId", sql.Int, evToDelete.id)
          .query("DELETE FROM event_participants WHERE event_id=@eventId");

        // Hapus event
        await new sql.Request(transaction)
          .input("eventId", sql.Int, evToDelete.id)
          .query("DELETE FROM event_schedule WHERE id=@eventId");

        await log(transaction, req.user.id, "DELETE_EVENT", "event", evToDelete.id, `Deleted event with code: ${evToDelete.event_code}`, req.ip);
      }

      // Insert atau update event
      const dateDigits = String(eventDate).replace(/-/g, "");

      for (let i = 0; i < events.length; i++) {
        const ev = events[i];
        const cleanName = ev.eventName.trim();
        const cleanDesc = ev.description ? ev.description.trim() : null;
        const cleanStart = ev.startTime; // format "HH:MM"
        const cleanEnd = ev.endTime;     // format "HH:MM"
        const access = ev.participantAccess || "Everyone";
        const evType = ev.eventType || "custom";

        let eventId = ev.id;
        let eventCode = ev.eventCode;

        if (eventId) {
          // UPDATE
          await new sql.Request(transaction)
            .input("id", sql.Int, eventId)
            .input("en", sql.NVarChar, cleanName)
            .input("d", sql.NVarChar, cleanDesc)
            .input("st", sql.NVarChar, cleanStart)
            .input("et", sql.NVarChar, cleanEnd)
            .input("pa", sql.NVarChar, access)
            .input("evt", sql.NVarChar, evType)
            .query(`
              UPDATE event_schedule 
              SET event_name=@en, description=@d, start_time=@st, end_time=@et, participant_access=@pa, event_type=@evt, updated_at=GETDATE()
              WHERE id=@id
            `);
          await log(transaction, req.user.id, "UPDATE_EVENT", "event", eventId, `Updated event: ${cleanName}`, req.ip);
        } else {
          // INSERT
          // Generate unique event code: EVT-YYYYMMDD-HHMM
          const codeTime = cleanStart.replace(/:/g, "");
          const generatedCode = `EVT-${dateDigits}-${codeTime}`;
          
          const insertResult = await new sql.Request(transaction)
            .input("ec", sql.NVarChar, generatedCode)
            .input("en", sql.NVarChar, cleanName)
            .input("d", sql.NVarChar, cleanDesc)
            .input("de", sql.Date, eventDate)
            .input("st", sql.NVarChar, cleanStart)
            .input("et", sql.NVarChar, cleanEnd)
            .input("pa", sql.NVarChar, access)
            .input("evt", sql.NVarChar, evType)
            .query(`
              INSERT INTO event_schedule (event_code, event_name, description, date_event, start_time, end_time, participant_access, event_type, created_at, updated_at)
              OUTPUT INSERTED.id
              VALUES (@ec, @en, @d, @de, @st, @et, @pa, @evt, GETDATE(), GETDATE())
            `);
          
          eventId = insertResult.recordset[0].id;
          eventCode = generatedCode;
          await log(transaction, req.user.id, "CREATE_EVENT", "event", eventId, `Created event: ${cleanName} (${generatedCode})`, req.ip);
        }

        // Hapus access list lama di event_participants untuk event ini
        await new sql.Request(transaction)
          .input("eventId", sql.Int, eventId)
          .query("DELETE FROM event_participants WHERE event_id=@eventId");

        // Insert new access list jika access Selected Members atau Excluded Members
        if ((access === "Selected Members" || access === "Excluded Members") && Array.isArray(ev.selectedMemberIds)) {
          const typeMap = access === "Selected Members" ? "selected" : "excluded";
          for (const memberId of ev.selectedMemberIds) {
            await new sql.Request(transaction)
              .input("eventId", sql.Int, eventId)
              .input("memberId", sql.NVarChar, memberId)
              .input("type", sql.NVarChar, typeMap)
              .query(`
                INSERT INTO event_participants (event_id, member_id, access_type, created_at)
                VALUES (@eventId, @memberId, @type, GETDATE())
              `);
          }
        }
      }

      await transaction.commit();
      res.json({ success: true, message: "Events saved successfully" });

    } catch (e: any) {
      console.error("[POST EVENTS BATCH]", e);
      try {
        await transaction.rollback();
      } catch (err) {
        console.error("Rollback error:", err);
      }
      res.status(500).json({ success: false, message: e.message || "DB error" });
    }
  });

  // PUT /api/events/:id (Legacy - deprecated in favor of batch save, but kept for compatibility)
  app.put("/api/events/:id", authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { eventName, description } = req.body;
      const pool = await getConnection();
      const rq = pool.request().input("id", sql.Int, req.params.id);
      const sets = ["updated_at=GETDATE()"];
      if (eventName !== undefined) { rq.input("en", sql.NVarChar, eventName); sets.push("event_name=@en"); }
      if (description !== undefined) { rq.input("d", sql.NVarChar, description || null); sets.push("description=@d"); }
      if (sets.length === 1)
        return res.status(400).json({ success: false, message: "No fields to update" });
      await rq.query(`UPDATE event_schedule SET ${sets.join(",")} WHERE id=@id`);
      await log(pool, req.user.id, "UPDATE_EVENT", "event", parseInt(req.params.id), `Updated event ${req.params.id}`, req.ip);
      res.json({ success: true, message: "Event updated" });
    } catch {
      res.status(500).json({ success: false, message: "DB error" });
    }
  });

  // DELETE /api/events/:id
  app.delete("/api/events/:id", authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const pool = await getConnection();
      // Remove participants first (FK)
      await pool.request()
        .input("id", sql.Int, req.params.id)
        .query("DELETE FROM event_participants WHERE event_id=@id");
      const r = await pool.request()
        .input("id", sql.Int, req.params.id)
        .query("DELETE FROM event_schedule WHERE id=@id");
      if (!r.rowsAffected[0])
        return res.status(404).json({ success: false, message: "Event not found" });
      await log(pool, req.user.id, "DELETE_EVENT", "event", parseInt(req.params.id), `Deleted event ${req.params.id}`, req.ip);
      res.json({ success: true, message: "Event deleted" });
    } catch {
      res.status(500).json({ success: false, message: "DB error" });
    }
  });

  // ════════════════════════════════════════════════════════════════════════════
  // ATTENDANCE  — CRITICAL: specific routes MUST come BEFORE /:id
  // ════════════════════════════════════════════════════════════════════════════

  // GET /api/attendance/stats/today (admin only)
  app.get(
    "/api/attendance/stats/today",
    authenticateToken,
    requireAdmin,
    async (_req, res) => {
      try {
        const pool = await getConnection();
        const today = new Date().toISOString().split("T")[0];
        const [sR, mR] = await Promise.all([
          pool
            .request()
            .input("d", sql.Date, today)
            .query(
              `SELECT ISNULL(COUNT(CASE WHEN status IN ('present','late') THEN 1 END),0) as ci,
                      ISNULL(COUNT(CASE WHEN status='absent' THEN 1 END),0) as ab
               FROM attendance WHERE attendance_date=@d`
            ),
          pool
            .request()
            .query(
              "SELECT COUNT(*) as c FROM users WHERE role='user' AND is_active=1"
            ),
        ]);
        const ci = sR.recordset[0].ci;
        const tot = mR.recordset[0].c;
        res.json({
          success: true,
          data: {
            checkedIn: ci,
            pending: Math.max(0, tot - ci),
            absent: sR.recordset[0].ab,
          },
        });
      } catch {
        res.status(500).json({ success: false, message: "DB error" });
      }
    }
  );

  // GET /api/attendance/public-overview (public attendance landing/dashboard)
  app.get(
    "/api/attendance/public-overview",
    async (_req, res) => {
      try {
        const pool = await getConnection();
        const today = new Date().toISOString().split("T")[0];

        const [memberCountResult, eventCountResult, attendanceCountResult] = await Promise.all([
          pool.request().query("SELECT COUNT(*) as c FROM user_member"),
          pool.request().query("SELECT COUNT(*) as c FROM event_schedule"),
          pool.request()
            .input("d", sql.Date, today)
            .query("SELECT COUNT(*) as c FROM attendance_member WHERE CAST(attendance_date AS DATE)=@d"),
        ]);

        const totalMembers = Number(memberCountResult.recordset[0]?.c ?? 0);
        const checkedIn = Number(attendanceCountResult.recordset[0]?.c ?? 0);
        const activeEvents = Number(eventCountResult.recordset[0]?.c ?? 0);
        const pending = Math.max(totalMembers - checkedIn, 0);
        const attendanceRate = totalMembers > 0 ? Number(((checkedIn / totalMembers) * 100).toFixed(1)) : 0;

        res.json({
          success: true,
          data: {
            totalMembers,
            activeEvents,
            todayAttendance: {
              checkedIn,
              pending,
              absent: 0,
            },
            attendanceRate,
          },
        });
      } catch (e: any) {
        console.error("[ATTENDANCE PUBLIC OVERVIEW]", e);
        res.status(500).json({ success: false, message: "DB error" });
      }
    }
  );

  // GET /api/attendance/trend (admin only)
  app.get(
    "/api/attendance/trend",
    authenticateToken,
    requireAdmin,
    async (req, res) => {
      try {
        const { days = 7, eventId } = req.query;
        const pool = await getConnection();
        const rq = pool.request().input("days", sql.Int, Number(days));
        let ef = "";
        if (eventId) {
          rq.input("eid", sql.Int, Number(eventId));
          ef = " AND event_id=@eid";
        }
        const r = await rq.query(
          `SELECT CONVERT(NVARCHAR(10),attendance_date,23) as attendance_date,
                  COUNT(*) as total,
                  SUM(CASE WHEN status IN('present','late') THEN 1 ELSE 0 END) as present
           FROM attendance
           WHERE attendance_date>=DATEADD(DAY,-@days,GETDATE()) ${ef}
           GROUP BY attendance_date ORDER BY attendance_date`
        );
        res.json({ success: true, data: r.recordset });
      } catch {
        res.status(500).json({ success: false, message: "DB error" });
      }
    }
  );

  // GET /api/attendance/leaderboard (any role)
app.get(
  "/api/attendance/leaderboard",
  authenticateToken,
  requireAnyRole,
  async (req, res) => {
    try {
      const { eventId, period = "month" } = req.query;
      const days =
        ({ week: 7, month: 30, semester: 180 } as any)[period as string] ||
        30;
      const pool = await getConnection();
      const rq = pool.request().input("days", sql.Int, days);
      let ef = "";
      if (eventId) {
        rq.input("eid", sql.Int, Number(eventId));
        ef = " AND a.event_id=@eid";
      }
      
      // Query dengan gabungan poin dari questions
      const r = await rq.query(`
        SELECT 
          u.id as user_id,
          u.full_name,
          u.member_id,
          u.jabatan,
          u.division,
          u.avatar_url,
          COUNT(CASE WHEN a.status IN('present','late') THEN 1 END) as total_present,
          COUNT(CASE WHEN a.status='late' THEN 1 END) as total_late,
          COUNT(*) as total_records,
          CAST(ROUND(CAST(COUNT(CASE WHEN a.status IN('present','late') THEN 1 END) AS FLOAT)/
            NULLIF(COUNT(*),0)*100,2) AS DECIMAL(5,2)) as attendance_percentage,
          ISNULL(mp.points, 0) as question_points,
          (SELECT COUNT(*) FROM user_answers ua WHERE ua.member_id = u.member_id) as questions_answered,
          (SELECT COUNT(*) FROM user_answers ua WHERE ua.member_id = u.member_id AND ua.is_correct = 1) as correct_answers,
          0 as streak_count,
          -- Combined score: attendance percentage + bonus points from questions
          CAST(ROUND(CAST(COUNT(CASE WHEN a.status IN('present','late') THEN 1 END) AS FLOAT)/
            NULLIF(COUNT(*),0)*100,2) AS DECIMAL(5,2)) + 
          ISNULL(mp.points, 0) * 0.1 as combined_score
        FROM users u 
        LEFT JOIN attendance a ON u.id = a.user_id
          AND a.attendance_date >= DATEADD(DAY, -@days, GETDATE())
          ${ef}
        LEFT JOIN member_point mp ON u.member_id = mp.member_id
        WHERE u.is_active = 1 
          AND u.role = 'user'
        GROUP BY u.id, u.full_name, u.member_id, u.jabatan, u.division, u.avatar_url, mp.points
        ORDER BY combined_score DESC, attendance_percentage DESC, total_present DESC
      `);
      
      res.json({ success: true, data: r.recordset });
    } catch (error: any) {
      console.error('[LEADERBOARD ERROR]', error);
      res.status(500).json({ success: false, message: "DB error" });
    }
  }
);

  // GET /api/attendance/my (user's own records)
  app.get(
    "/api/attendance/my",
    authenticateToken,
    requireAnyRole,
    async (req: any, res) => {
      try {
        const { eventId, startDate, endDate, status } = req.query;
        const pool = await getConnection();
        const rq = pool.request().input("uid", sql.Int, req.user.id);
        const parts = ["a.user_id=@uid"];
        if (eventId) {
          rq.input("eid", sql.Int, Number(eventId));
          parts.push("a.event_id=@eid");
        }
        if (startDate) {
          rq.input("sd", sql.Date, startDate);
          parts.push("a.attendance_date>=@sd");
        }
        if (endDate) {
          rq.input("ed", sql.Date, endDate);
          parts.push("a.attendance_date<=@ed");
        }
        if (status && status !== "all") {
          rq.input("s", sql.NVarChar, status);
          parts.push("a.status=@s");
        }
        const r = await rq.query(
          `SELECT a.*,e.event_name,e.event_code
           FROM attendance a JOIN event_schedule e ON a.event_id=e.id
           WHERE ${parts.join(" AND ")} ORDER BY a.attendance_date DESC`
        );
        res.json({ success: true, data: r.recordset });
      } catch {
        res.status(500).json({ success: false, message: "DB error" });
      }
    }
  );

  app.get('/api/user/question-stats', authenticateToken, requireAnyRole, async (req: any, res) => {
  try {
    const stats = await questionRepo.getUserPoints(req.user.id);
    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

  // GET /api/attendance/my/stats
  app.get(
    "/api/attendance/my/stats",
    authenticateToken,
    requireAnyRole,
    async (req: any, res) => {
      try {
        const pool = await getConnection();
        
        // 1. Resolve member_id from users
        const memberRes = await pool
          .request()
          .input("uid", sql.Int, req.user.id)
          .query(`SELECT member_id FROM users WHERE id = @uid`);
        
        if (!memberRes.recordset.length || !memberRes.recordset[0].member_id) {
          res.json({
            success: true,
            data: { total: 0, present: 0, points: 0, attendance_percentage: 0, streak: 0 }
          });
          return;
        }
        const memberId = memberRes.recordset[0].member_id;

        // 2. Fetch total_hadir, points, and total active schedules in parallel
        const [summaryRes, pointRes, totalSchedulesRes] = await Promise.all([
          pool.request()
            .input("member_id", sql.NVarChar, memberId)
            .query(`SELECT COALESCE(total_hadir, 0) AS total_hadir FROM attendance_summary WHERE member_id = @member_id`),
          pool.request()
            .input("member_id", sql.NVarChar, memberId)
            .query(`SELECT COALESCE(points, 0) AS points FROM member_point WHERE member_id = @member_id`),
          pool.request()
            .query(`SELECT COUNT(*) AS total_schedules FROM event_schedule WHERE date_event <= CAST(GETDATE() AS DATE)`)
        ]);

        const totalHadir = summaryRes.recordset[0]?.total_hadir ?? 0;
        const points = pointRes.recordset[0]?.points ?? 0;
        const totalSchedules = totalSchedulesRes.recordset[0]?.total_schedules ?? 0;

        let attendancePercentage = 0;
        if (totalSchedules > 0) {
          attendancePercentage = Number(((totalHadir / totalSchedules) * 100).toFixed(2));
        } else if (totalHadir > 0) {
          attendancePercentage = 100;
        }

        // 3. Dynamic streak calculation based on attendance schedules and member check-ins
        const schedulesR = await pool.request().query(`
          SELECT DISTINCT date_event 
          FROM event_schedule 
          WHERE date_event <= CAST(GETDATE() AS DATE) 
          ORDER BY date_event DESC
        `);

        const memberAttendanceR = await pool.request()
          .input("member_id", sql.NVarChar, memberId)
          .query(`
            SELECT DISTINCT attendance_day 
            FROM attendance_member 
            WHERE member_id = @member_id
          `);

        const getUTCDateString = (dateObj: Date) => {
          const year = dateObj.getUTCFullYear();
          const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
          const day = String(dateObj.getUTCDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };

        const attendanceDays = new Set(
          memberAttendanceR.recordset.map((r: any) => getUTCDateString(new Date(r.attendance_day)))
        );

        let streak = 0;
        for (let i = 0; i < schedulesR.recordset.length; i++) {
          const schedDate = getUTCDateString(new Date(schedulesR.recordset[i].date_event));
          
          if (attendanceDays.has(schedDate)) {
            streak++;
          } else {
            // If it's today's schedule and they haven't checked in yet, don't break the streak immediately
            const todayStr = getUTCDateString(new Date());
            if (schedDate === todayStr) {
              continue;
            }
            break;
          }
        }

        res.json({
          success: true,
          data: {
            total: totalHadir,
            present: totalHadir,
            points: points,
            attendance_percentage: attendancePercentage,
            streak: streak
          },
        });
      } catch (e: any) {
        console.error("[STATS_ERROR]", e);
        res.status(500).json({ success: false, message: "DB error" });
      }
    }
  );

  // POST /api/attendance/checkin (self check-in)
  // POST /api/attendance/checkin (self check-in) - PERBAIKAN DENGAN DEBUG
app.post(
  "/api/attendance/checkin",
  authenticateToken,
  requireAnyRole,
  async (req: any, res) => {
    try {
      const { qrToken, eventId } = req.body;
      const pool = await getConnection();
      const today = new Date().toISOString().split("T")[0];

      console.log('📱 Check-in attempt:', { 
        userId: req.user.id, 
        qrToken: qrToken ? qrToken.substring(0, 20) + '...' : null, 
        eventId 
      });

      let resolvedEventId = eventId;
      
      if (qrToken) {
        // Cari token di database
        const tokenR = await pool
          .request()
          .input("t", sql.NVarChar, qrToken)
          .query(`
            SELECT * FROM qr_tokens 
            WHERE token = @t
          `);
        
        console.log('🔍 Token search result:', {
          found: tokenR.recordset.length > 0,
          token: qrToken.substring(0, 20) + '...'
        });
        
        if (tokenR.recordset.length === 0) {
          console.log('❌ Token not found in database');
          return res.status(400).json({
            success: false,
            message: "QR code tidak valid. Token tidak ditemukan.",
          });
        }
        
        const tokenData = tokenR.recordset[0];
        console.log('🎫 Token data:', {
          id: tokenData.id,
          eventId: tokenData.event_id,
          expiresAt: tokenData.expires_at,
          now: new Date(),
          isExpired: new Date(tokenData.expires_at) < new Date()
        });
        
        // Cek apakah token expired
        if (new Date(tokenData.expires_at) < new Date()) {
          console.log('⏰ Token expired');
          return res.status(400).json({
            success: false,
            message: "QR code sudah kadaluarsa",
          });
        }
        
        resolvedEventId = tokenData.event_id;
      }
      
      if (!resolvedEventId) {
        return res.status(400).json({
          success: false,
          message: "Event ID atau QR token diperlukan",
        });
      }

      // Cek apakah sudah check-in hari ini
      const dup = await pool
        .request()
        .input("uid", sql.Int, req.user.id)
        .input("eid", sql.Int, resolvedEventId)
        .input("d", sql.Date, today)
        .query(
          "SELECT id FROM attendance WHERE user_id=@uid AND event_id=@eid AND attendance_date=@d"
        );
      
      if (dup.recordset.length) {
        return res.status(400).json({
          success: false,
          message: "Kamu sudah check-in hari ini untuk event ini",
        });
      }

      // Tentukan status (present/late)
      const settR = await pool
        .request()
        .query(
          "SELECT setting_value FROM system_settings WHERE setting_key='lateness_threshold'"
        );
      const lateMin = parseInt(settR.recordset[0]?.setting_value || "15");

      let status = "present";
      const schedR = await pool
        .request()
        .input("eid", sql.Int, resolvedEventId)
        .input("d", sql.Date, today)
        .query(
          "SELECT start_time FROM schedules WHERE event_id=@eid AND scheduled_date=@d"
        );
      
      if (schedR.recordset.length) {
        const [h, m] = schedR.recordset[0].start_time
          .split(":")
          .map(Number);
        const schedStart = new Date();
        schedStart.setHours(h, m, 0, 0);
        const lateThreshold = new Date(
          schedStart.getTime() + lateMin * 60000
        );
        if (new Date() > lateThreshold) status = "late";
      }

      // Insert attendance
      const r = await pool
        .request()
        .input("uid", sql.Int, req.user.id)
        .input("eid", sql.Int, resolvedEventId)
        .input("d", sql.Date, today)
        .input("ci", sql.DateTime, new Date())
        .input("s", sql.NVarChar, status)
        .input("di", sql.NVarChar, qrToken ? "QR Code Scan" : "Self Check-in")
        .query(
          `INSERT INTO attendance (user_id,event_id,attendance_date,check_in_time,status,device_info,created_at)
           OUTPUT INSERTED.*
           VALUES (@uid,@eid,@d,@ci,@s,@di,GETDATE())`
        );
      
      console.log('✅ Check-in successful:', {
        attendanceId: r.recordset[0].id,
        status: status
      });
      
      res.status(201).json({
        success: true,
        data: r.recordset[0],
        status,
        message: `Check-in berhasil (${status === 'present' ? 'Hadir' : 'Terlambat'})`,
      });
      
    } catch (e: any) {
      console.error("❌ [CHECKIN ERROR]", e);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);


  // GET /api/attendance (admin — all records)
  app.get(
    "/api/attendance",
    authenticateToken,
    requireAdmin,
    async (req, res) => {
      try {
        const { eventId, startDate, endDate, status, userId, division, jabatan } =
          req.query;
        const pool = await getConnection();
        const rq = pool.request();
        const parts = ["1=1"];
        if (userId) {
          rq.input("uid", sql.Int, Number(userId));
          parts.push("a.user_id=@uid");
        }
        if (eventId) {
          rq.input("eid", sql.Int, Number(eventId));
          parts.push("a.event_id=@eid");
        }
        if (startDate) {
          rq.input("sd", sql.Date, startDate);
          parts.push("a.attendance_date>=@sd");
        }
        if (endDate) {
          rq.input("ed", sql.Date, endDate);
          parts.push("a.attendance_date<=@ed");
        }
        if (status && status !== "all") {
          rq.input("s", sql.NVarChar, status);
          parts.push("a.status=@s");
        }
        if (division) {
          rq.input("div", sql.NVarChar, division);
          parts.push("u.division=@div");
        }
        if (jabatan) {
          rq.input("jab", sql.NVarChar, jabatan);
          parts.push("u.jabatan=@jab");
        }
        const r = await rq.query(
          `SELECT a.*,u.full_name as user_name,u.member_id,u.jabatan,u.division,
                  e.event_name,e.event_code
           FROM attendance a JOIN users u ON a.user_id=u.id JOIN event_schedule e ON a.event_id=e.id
           WHERE ${parts.join(" AND ")} ORDER BY a.attendance_date DESC,a.check_in_time DESC`
        );
        res.json({ success: true, data: r.recordset });
      } catch (e: any) {
        console.error("[GET ATTENDANCE]", e);
        res.status(500).json({ success: false, message: "DB error" });
      }
    }
  );

  // GET /api/attendance/:id
  app.get(
    "/api/attendance/:id",
    authenticateToken,
    requireAnyRole,
    async (req: any, res) => {
      try {
        const pool = await getConnection();
        const r = await pool
          .request()
          .input("id", sql.Int, req.params.id)
          .query(
            `SELECT a.*,u.full_name as user_name,e.event_name,e.event_code
             FROM attendance a JOIN users u ON a.user_id=u.id JOIN event_schedule e ON a.event_id=e.id
             WHERE a.id=@id`
          );
        if (!r.recordset.length)
          return res
            .status(404)
            .json({ success: false, message: "Not found" });
        const rec = r.recordset[0];
        if (req.user.role === "user" && rec.user_id !== req.user.id)
          return res
            .status(403)
            .json({ success: false, message: "Access denied" });
        res.json({ success: true, data: rec });
      } catch {
        res.status(500).json({ success: false, message: "DB error" });
      }
    }
  );

  // POST /api/attendance (manual admin entry)
  app.post(
    "/api/attendance",
    authenticateToken,
    requireAdmin,
    async (req: any, res) => {
      try {
        const {
          userId,
          eventId,
          attendanceDate,
          checkInTime,
          checkOutTime,
          status,
          deviceInfo,
          notes,
        } = req.body;
        if (!userId || !eventId || !attendanceDate || !checkInTime || !status)
          return res.status(400).json({
            success: false,
            message:
              "userId, eventId, attendanceDate, checkInTime, status required",
          });

        const pool = await getConnection();
        const dup = await pool
          .request()
          .input("uid", sql.Int, userId)
          .input("eid", sql.Int, eventId)
          .input("d", sql.Date, attendanceDate)
          .query(
            "SELECT id FROM attendance WHERE user_id=@uid AND event_id=@eid AND attendance_date=@d"
          );
        if (dup.recordset.length)
          return res.status(400).json({
            success: false,
            message:
              "Attendance already recorded for this user/event/date",
          });

        const r = await pool
          .request()
          .input("uid", sql.Int, userId)
          .input("eid", sql.Int, eventId)
          .input("d", sql.Date, attendanceDate)
          .input("ci", sql.DateTime, checkInTime)
          .input("co", sql.DateTime, checkOutTime || null)
          .input("s", sql.NVarChar, status)
          .input("di", sql.NVarChar, deviceInfo || "Manual Entry – Admin")
          .input("n", sql.NVarChar, notes || null)
          .query(
            `INSERT INTO attendance (user_id,event_id,attendance_date,check_in_time,check_out_time,status,device_info,notes,created_at)
             OUTPUT INSERTED.*
             VALUES (@uid,@eid,@d,@ci,@co,@s,@di,@n,GETDATE())`
          );
        await log(
          pool,
          req.user.id,
          "MANUAL_ATTENDANCE",
          "attendance",
          r.recordset[0].id,
          `Manual: user ${userId}, event ${eventId}, ${status}`,
          req.ip
        );
        res.status(201).json({ success: true, data: r.recordset[0] });
      } catch (e: any) {
        console.error("[MANUAL ATTENDANCE]", e);
        res.status(500).json({ success: false, message: "DB error" });
      }
    }
  );

  // PUT /api/attendance/:id
  app.put(
    "/api/attendance/:id",
    authenticateToken,
    requireAdmin,
    async (req: any, res) => {
      try {
        const { checkOutTime, status, notes } = req.body;
        if (!status)
          return res
            .status(400)
            .json({ success: false, message: "status required" });
        const pool = await getConnection();
        const exists = await pool
          .request()
          .input("id", sql.Int, req.params.id)
          .query("SELECT id FROM attendance WHERE id=@id");
        if (!exists.recordset.length)
          return res
            .status(404)
            .json({ success: false, message: "Not found" });
        await pool
          .request()
          .input("id", sql.Int, req.params.id)
          .input("co", sql.DateTime, checkOutTime || null)
          .input("s", sql.NVarChar, status)
          .input("n", sql.NVarChar, notes || null)
          .query(
            "UPDATE attendance SET check_out_time=@co,status=@s,notes=@n,updated_at=GETDATE() WHERE id=@id"
          );
        await log(
          pool,
          req.user.id,
          "UPDATE_ATTENDANCE",
          "attendance",
          parseInt(req.params.id),
          `Updated attendance ${req.params.id} → ${status}`,
          req.ip
        );
        res.json({ success: true, message: "Attendance updated" });
      } catch {
        res.status(500).json({ success: false, message: "DB error" });
      }
    }
  );

  // DELETE /api/attendance/:id
  app.delete(
    "/api/attendance/:id",
    authenticateToken,
    requireAdmin,
    async (req: any, res) => {
      try {
        const pool = await getConnection();
        const r = await pool
          .request()
          .input("id", sql.Int, req.params.id)
          .query("DELETE FROM attendance WHERE id=@id");
        if (!r.rowsAffected[0])
          return res
            .status(404)
            .json({ success: false, message: "Not found" });
        await log(
          pool,
          req.user.id,
          "DELETE_ATTENDANCE",
          "attendance",
          parseInt(req.params.id),
          `Deleted attendance ${req.params.id}`,
          req.ip
        );
        res.json({ success: true, message: "Deleted" });
      } catch {
        res.status(500).json({ success: false, message: "DB error" });
      }
    }
  );

  // ════════════════════════════════════════════════════════════════════════════
  // QR TOKENS
  // ════════════════════════════════════════════════════════════════════════════

  app.post(
    "/api/qr/generate",
    authenticateToken,
    requireAdmin,
    async (req: any, res) => {
      try {
        const { eventId, validDate, expiryMinutes } = req.body;
        if (!eventId)
          return res
            .status(400)
            .json({ success: false, message: "eventId required" });

        const pool = await getConnection();
        const settR = await pool
          .request()
          .query(
            "SELECT setting_value FROM system_settings WHERE setting_key='qr_expiry_minutes'"
          );
        const expMin =
          expiryMinutes || parseInt(settR.recordset[0]?.setting_value || "60");

        const token = crypto.randomBytes(32).toString("hex");
        const vDate = validDate || new Date().toISOString().split("T")[0];
        const expires = new Date(Date.now() + Number(expMin) * 60000);

        await pool
          .request()
          .input("eid", sql.Int, eventId)
          .input("tok", sql.NVarChar, token)
          .input("vd", sql.Date, vDate)
          .input("exp", sql.DateTime, expires)
          .input("cb", sql.Int, req.user.id)
          .query(
            "INSERT INTO qr_tokens (event_id,token,valid_date,expires_at,created_by,created_at) VALUES (@eid,@tok,@vd,@exp,@cb,GETDATE())"
          );

        res.json({
          success: true,
          data: {
            token,
            validDate: vDate,
            expiresAt: expires,
            expiryMinutes: expMin,
          },
        });
      } catch {
        res.status(500).json({ success: false, message: "DB error" });
      }
    }
  );

  app.get(
    "/api/qr/:eventId",
    authenticateToken,
    requireAdmin,
    async (req, res) => {
      try {
        const pool = await getConnection();
        const r = await pool
          .request()
          .input("eid", sql.Int, req.params.eventId)
          .query(
            "SELECT * FROM qr_tokens WHERE event_id=@eid ORDER BY created_at DESC"
          );
        res.json({ success: true, data: r.recordset });
      } catch {
        res.status(500).json({ success: false, message: "DB error" });
      }
    }
  );

  // ════════════════════════════════════════════════════════════════════════════
  // SCHEDULES
  // ════════════════════════════════════════════════════════════════════════════

  app.get(
    "/api/schedules",
    authenticateToken,
    requireAnyRole,
    async (req, res) => {
      try {
        const { eventId, upcoming } = req.query;
        const pool = await getConnection();
        const rq = pool.request();
        const parts = ["1=1"];
        if (eventId) {
          rq.input("eid", sql.Int, Number(eventId));
          parts.push("s.event_id=@eid");
        }
        if (upcoming === "true")
          parts.push("s.scheduled_date>=CAST(GETDATE() AS DATE)");
        const r = await rq.query(
          `SELECT s.*,e.event_name,e.event_code,e.event_type
           FROM schedules s JOIN event_schedule e ON s.event_id=e.id
           WHERE ${parts.join(" AND ")} ORDER BY s.scheduled_date ASC`
        );
        res.json({ success: true, data: r.recordset });
      } catch {
        res.status(500).json({ success: false, message: "DB error" });
      }
    }
  );

  app.post(
    "/api/schedules",
    authenticateToken,
    requireAdmin,
    async (req: any, res) => {
      try {
        const { eventId, scheduledDate, startTime, endTime, location, notes } =
          req.body;
        if (!eventId || !scheduledDate || !startTime)
          return res.status(400).json({
            success: false,
            message: "eventId, scheduledDate, startTime required",
          });
        const pool = await getConnection();
        const r = await pool
          .request()
          .input("eid", sql.Int, eventId)
          .input("d", sql.Date, scheduledDate)
          .input("st", sql.NVarChar, startTime)
          .input("et", sql.NVarChar, endTime || null)
          .input("loc", sql.NVarChar, location || null)
          .input("n", sql.NVarChar, notes || null)
          .input("cb", sql.Int, req.user.id)
          .query(
            `INSERT INTO schedules (event_id,scheduled_date,start_time,end_time,location,notes,created_by,created_at)
             OUTPUT INSERTED.*
             VALUES (@eid,@d,@st,@et,@loc,@n,@cb,GETDATE())`
          );
        res.status(201).json({ success: true, data: r.recordset[0] });
      } catch {
        res.status(500).json({ success: false, message: "DB error" });
      }
    }
  );

  app.put(
    "/api/schedules/:id",
    authenticateToken,
    requireAdmin,
    async (req: any, res) => {
      try {
        const { scheduledDate, startTime, endTime, location, notes } = req.body;
        const pool = await getConnection();
        const rq = pool.request().input("id", sql.Int, req.params.id);
        const sets: string[] = [];
        if (scheduledDate) {
          rq.input("d", sql.Date, scheduledDate);
          sets.push("scheduled_date=@d");
        }
        if (startTime) {
          rq.input("st", sql.NVarChar, startTime);
          sets.push("start_time=@st");
        }
        if (endTime !== undefined) {
          rq.input("et", sql.NVarChar, endTime || null);
          sets.push("end_time=@et");
        }
        if (location !== undefined) {
          rq.input("loc", sql.NVarChar, location || null);
          sets.push("location=@loc");
        }
        if (notes !== undefined) {
          rq.input("n", sql.NVarChar, notes || null);
          sets.push("notes=@n");
        }
        if (!sets.length)
          return res
            .status(400)
            .json({ success: false, message: "Nothing to update" });
        await rq.query(
          `UPDATE schedules SET ${sets.join(",")} WHERE id=@id`
        );
        res.json({ success: true, message: "Schedule updated" });
      } catch {
        res.status(500).json({ success: false, message: "DB error" });
      }
    }
  );

  app.delete(
    "/api/schedules/:id",
    authenticateToken,
    requireAdmin,
    async (req: any, res) => {
      try {
        const pool = await getConnection();
        await pool
          .request()
          .input("id", sql.Int, req.params.id)
          .query("DELETE FROM schedules WHERE id=@id");
        res.json({ success: true });
      } catch {
        res.status(500).json({ success: false, message: "DB error" });
      }
    }
  );

  // ════════════════════════════════════════════════════════════════════════════
  // ANNOUNCEMENTS
  // ════════════════════════════════════════════════════════════════════════════

  app.get(
    "/api/announcements",
    authenticateToken,
    requireAnyRole,
    async (_req, res) => {
      try {
        const pool = await getConnection();
        const r = await pool.request().query(
          `SELECT a.*,u.full_name as author_name FROM announcements a
           LEFT JOIN users u ON a.author_id=u.id
           WHERE a.is_active=1 ORDER BY a.pinned DESC,a.created_at DESC`
        );
        res.json({ success: true, data: r.recordset });
      } catch {
        res.status(500).json({ success: false, message: "DB error" });
      }
    }
  );

  app.post(
    "/api/announcements",
    authenticateToken,
    requireAdmin,
    async (req: any, res) => {
      try {
        const { title, body, pinned = false } = req.body;
        if (!title || !body)
          return res
            .status(400)
            .json({ success: false, message: "title and body required" });
        const pool = await getConnection();
        const r = await pool
          .request()
          .input("t", sql.NVarChar, title)
          .input("b", sql.NVarChar, body)
          .input("p", sql.Bit, pinned ? 1 : 0)
          .input("aid", sql.Int, req.user.id)
          .query(
            `INSERT INTO announcements (title,body,author_id,is_active,pinned,created_at,updated_at)
             OUTPUT INSERTED.*
             VALUES (@t,@b,@aid,1,@p,GETDATE(),GETDATE())`
          );
        await log(
          pool,
          req.user.id,
          "CREATE_ANNOUNCEMENT",
          "announcement",
          r.recordset[0].id,
          `Created: ${title}`,
          req.ip
        );
        res.status(201).json({ success: true, data: r.recordset[0] });
      } catch {
        res.status(500).json({ success: false, message: "DB error" });
      }
    }
  );

  app.put(
    "/api/announcements/:id",
    authenticateToken,
    requireAdmin,
    async (req: any, res) => {
      try {
        const { title, body, pinned, isActive } = req.body;
        const pool = await getConnection();
        const rq = pool.request().input("id", sql.Int, req.params.id);
        const sets = ["updated_at=GETDATE()"];
        if (title !== undefined) {
          rq.input("t", sql.NVarChar, title);
          sets.push("title=@t");
        }
        if (body !== undefined) {
          rq.input("b", sql.NVarChar, body);
          sets.push("body=@b");
        }
        if (pinned !== undefined) {
          rq.input("p", sql.Bit, pinned ? 1 : 0);
          sets.push("pinned=@p");
        }
        if (isActive !== undefined) {
          rq.input("ia", sql.Bit, isActive ? 1 : 0);
          sets.push("is_active=@ia");
        }
        await rq.query(
          `UPDATE announcements SET ${sets.join(",")} WHERE id=@id`
        );
        res.json({ success: true });
      } catch {
        res.status(500).json({ success: false, message: "DB error" });
      }
    }
  );

  app.delete(
    "/api/announcements/:id",
    authenticateToken,
    requireAdmin,
    async (req: any, res) => {
      try {
        const pool = await getConnection();
        await pool
          .request()
          .input("id", sql.Int, req.params.id)
          .query("DELETE FROM announcements WHERE id=@id");
        res.json({ success: true });
      } catch {
        res.status(500).json({ success: false, message: "DB error" });
      }
    }
  );

  // ════════════════════════════════════════════════════════════════════════════
  // REGULAR EVENTS
  // ════════════════════════════════════════════════════════════════════════════

  app.get(
    "/api/regular-events",
    authenticateToken,
    requireAdmin,
    handleGetRegularEvents
  );

  app.post(
    "/api/regular-events",
    authenticateToken,
    requireSuperAdmin,
    handleCreateRegularEvent
  );

  app.put(
    "/api/regular-events/:id",
    authenticateToken,
    requireSuperAdmin,
    handleUpdateRegularEvent
  );

  app.delete(
    "/api/regular-events/:id",
    authenticateToken,
    requireSuperAdmin,
    handleDeleteRegularEvent
  );

  // ════════════════════════════════════════════════════════════════════════════
  // DIVISIONS
  // ════════════════════════════════════════════════════════════════════════════

  app.get(
    "/api/divisions",
    authenticateToken,
    requireAnyRole,
    async (_req, res) => {
      try {
        const pool = await getConnection();
        const r = await pool.request().query(
          `SELECT d.*,u.full_name as leader_name FROM divisions d
           LEFT JOIN users u ON d.leader_id=u.id
           WHERE d.is_active=1 ORDER BY d.name`
        );
        res.json({ success: true, data: r.recordset });
      } catch {
        res.status(500).json({ success: false, message: "DB error" });
      }
    }
  );

  app.post(
    "/api/divisions",
    authenticateToken,
    requireSuperAdmin,
    async (req: any, res) => {
      try {
        const { name, description, leaderId } = req.body;
        if (!name)
          return res
            .status(400)
            .json({ success: false, message: "name required" });
        const pool = await getConnection();
        const r = await pool
          .request()
          .input("n", sql.NVarChar, name)
          .input("d", sql.NVarChar, description || null)
          .input("l", sql.Int, leaderId || null)
          .query(
            "INSERT INTO divisions (name,description,leader_id,is_active,created_at) OUTPUT INSERTED.* VALUES (@n,@d,@l,1,GETDATE())"
          );
        res.status(201).json({ success: true, data: r.recordset[0] });
      } catch {
        res.status(500).json({ success: false, message: "DB error" });
      }
    }
  );

  app.put(
    "/api/divisions/:id",
    authenticateToken,
    requireSuperAdmin,
    async (req: any, res) => {
      try {
        const { name, description, leaderId, isActive } = req.body;
        const pool = await getConnection();
        const rq = pool.request().input("id", sql.Int, req.params.id);
        const sets: string[] = [];
        if (name !== undefined) {
          rq.input("n", sql.NVarChar, name);
          sets.push("name=@n");
        }
        if (description !== undefined) {
          rq.input("d", sql.NVarChar, description || null);
          sets.push("description=@d");
        }
        if (leaderId !== undefined) {
          rq.input("l", sql.Int, leaderId || null);
          sets.push("leader_id=@l");
        }
        if (isActive !== undefined) {
          rq.input("ia", sql.Bit, isActive ? 1 : 0);
          sets.push("is_active=@ia");
        }
        if (!sets.length)
          return res
            .status(400)
            .json({ success: false, message: "Nothing to update" });
        await rq.query(
          `UPDATE divisions SET ${sets.join(",")} WHERE id=@id`
        );
        res.json({ success: true });
      } catch {
        res.status(500).json({ success: false, message: "DB error" });
      }
    }
  );

  // ════════════════════════════════════════════════════════════════════════════
  // DASHBOARD
  // ════════════════════════════════════════════════════════════════════════════

  app.get(
    "/api/dashboard/stats",
    authenticateToken,
    requireAdmin,
    async (_req, res) => {
      try {
        const pool = await getConnection();
        const today = new Date().toISOString().split("T")[0];
        const [mR, eR, tR, rR] = await Promise.all([
          pool
            .request()
            .query(
              "SELECT COUNT(*) as c FROM users WHERE role='user' AND is_active=1"
            ),
          pool
            .request()
            .query(
              "SELECT COUNT(*) as c FROM event_schedule"
            ),
          pool
            .request()
            .input("d", sql.Date, today)
            .query(
              `SELECT ISNULL(COUNT(CASE WHEN status IN('present','late') THEN 1 END),0) as ci,
                      ISNULL(COUNT(CASE WHEN status='absent' THEN 1 END),0) as ab
               FROM attendance WHERE attendance_date=@d`
            ),
          pool
            .request()
            .query(
              `SELECT CAST(ROUND(CAST(COUNT(CASE WHEN status IN('present','late') THEN 1 END) AS FLOAT)/
                NULLIF(COUNT(*),0)*100,1) AS DECIMAL(5,1)) as rate
               FROM attendance WHERE attendance_date>=DATEADD(MONTH,-1,GETDATE())`
            ),
        ]);
        const total = mR.recordset[0].c;
        const ci = tR.recordset[0].ci;
        res.json({
          success: true,
          data: {
            totalMembers: total,
            activeEvents: eR.recordset[0].c,
            todayAttendance: {
              checkedIn: ci,
              pending: Math.max(0, total - ci),
              absent: tR.recordset[0].ab,
            },
            attendanceRate: rR.recordset[0].rate || 0,
          },
        });
      } catch {
        res.status(500).json({ success: false, message: "DB error" });
      }
    }
  );

  app.get(
    "/api/dashboard/activities",
    authenticateToken,
    requireAdmin,
    async (req, res) => {
      try {
        const { limit = 10 } = req.query;
        const pool = await getConnection();
        const r = await pool
          .request()
          .input("lim", sql.Int, Number(limit))
          .query(
            `SELECT TOP (@lim) al.*,u.full_name as user_name FROM activity_logs al
             LEFT JOIN users u ON al.user_id=u.id ORDER BY al.created_at DESC`
          );
        res.json({ success: true, data: r.recordset });
      } catch {
        res.status(500).json({ success: false, message: "DB error" });
      }
    }
  );

  // ════════════════════════════════════════════════════════════════════════════
  // REPORTS  (source: attendance_member joined with event_schedule via event_code)
  // ════════════════════════════════════════════════════════════════════════════

  // Pure calendar-date helpers computed in WIB (UTC+7), independent of server timezone
  const pad2 = (n: number) => String(n).padStart(2, "0");
  const toISO = (y: number, m: number, d: number) => `${y}-${pad2(m + 1)}-${pad2(d)}`;
  const wibTodayISO = () => {
    const wib = new Date(Date.now() + 7 * 3600 * 1000);
    return toISO(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate());
  };
  const addDaysISO = (iso: string, days: number) => {
    const [y, m, d] = iso.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d + days));
    return toISO(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate());
  };
  const addMonthsISO = (iso: string, months: number) => {
    const [y, m, d] = iso.split("-").map(Number);
    const total = (m - 1) + months;
    const newY = y + Math.floor(total / 12);
    const newM = ((total % 12) + 12) % 12;
    return toISO(newY, newM, d);
  };
  const dowMondayFirst = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    const jsDow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=Sun..6=Sat
    return (jsDow + 6) % 7; // 0=Mon..6=Sun
  };
  const startOfWeekISO = (iso: string) => addDaysISO(iso, -dowMondayFirst(iso));
  const endOfWeekISO = (iso: string) => addDaysISO(startOfWeekISO(iso), 6);
  const startOfMonthISO = (iso: string) => { const [y, m] = iso.split("-").map(Number); return toISO(y, m - 1, 1); };
  const endOfMonthISO = (iso: string) => {
    const [y, m] = iso.split("-").map(Number);
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return toISO(y, m - 1, lastDay);
  };
  const startOfYearISO = (iso: string) => { const [y] = iso.split("-").map(Number); return toISO(y, 0, 1); };
  const endOfYearISO = (iso: string) => { const [y] = iso.split("-").map(Number); return toISO(y, 11, 31); };

  const resolveReportRange = (
    period: string,
    startDate?: string,
    endDate?: string
  ): { start: string; end: string } | null => {
    const today = wibTodayISO();
    switch (period) {
      case "this_week":
        return { start: startOfWeekISO(today), end: endOfWeekISO(today) };
      case "last_week": {
        const anchor = addDaysISO(today, -7);
        return { start: startOfWeekISO(anchor), end: endOfWeekISO(anchor) };
      }
      case "this_month":
        return { start: startOfMonthISO(today), end: endOfMonthISO(today) };
      case "last_month": {
        const anchor = addMonthsISO(today, -1);
        return { start: startOfMonthISO(anchor), end: endOfMonthISO(anchor) };
      }
      case "this_year":
        return { start: startOfYearISO(today), end: endOfYearISO(today) };
      case "custom":
        if (!startDate || !endDate) return null;
        return { start: startDate, end: endDate };
      case "all_time":
      default:
        return null;
    }
  };

  app.post(
    "/api/reports/generate",
    authenticateToken,
    requireAdmin,
    async (req: any, res) => {
      try {
        const { period = "all_time", startDate, endDate, format } = req.body;
        const pool = await getConnection();
        const range = resolveReportRange(period, startDate, endDate);

        const rq = pool.request();
        let dateFilter = "1=1";
        if (range) {
          rq.input("sd", sql.Date, new Date(range.start));
          rq.input("ed", sql.Date, new Date(range.end));
          dateFilter = "am.attendance_day BETWEEN @sd AND @ed";
        }

        const result = await rq.query(`
          SELECT am.id, am.member_id, am.name, am.attendance_day,
                 CONVERT(NVARCHAR(5), am.attendance_date, 108) as check_in,
                 am.event_code, es.event_name, es.date_event
          FROM attendance_member am
          LEFT JOIN event_schedule es ON am.event_code = es.event_code
          WHERE ${dateFilter}
          ORDER BY es.date_event DESC, am.attendance_date ASC
        `);

        // Group attendance rows by event so the event becomes a report subheading
        const groupsMap = new Map<string, { eventCode: string | null; eventName: string; dateEvent: string | null; rows: any[] }>();
        for (const row of result.recordset) {
          const key = row.event_code || "no-event";
          if (!groupsMap.has(key)) {
            groupsMap.set(key, {
              eventCode: row.event_code || null,
              eventName: row.event_name || "Tanpa Event",
              dateEvent: row.date_event || null,
              rows: [],
            });
          }
          groupsMap.get(key)!.rows.push({
            member_id: row.member_id,
            name: row.name,
            check_in: row.check_in || "-",
            status: "Present",
          });
        }
        const groups = Array.from(groupsMap.values()).sort((a, b) => {
          if (!a.dateEvent) return 1;
          if (!b.dateEvent) return -1;
          return new Date(b.dateEvent).getTime() - new Date(a.dateEvent).getTime();
        });

        await log(
          pool,
          req.user.id,
          "GENERATE_REPORT",
          "report",
          null,
          `Generated attendance report (${period})`,
          req.ip
        );
        res.json({
          success: true,
          data: {
            id: `RPT_${Date.now()}`,
            period,
            startDate: range?.start ?? null,
            endDate: range?.end ?? null,
            format,
            groups,
            count: result.recordset.length,
            generatedAt: new Date().toISOString(),
          },
        });
      } catch (e: any) {
        console.error("[REPORT]", e);
        res.status(500).json({ success: false, message: "DB error" });
      }
    }
  );

  app.get(
    "/api/reports",
    authenticateToken,
    requireAdmin,
    (_req, res) => res.json({ success: true, data: [] })
  );

  // ════════════════════════════════════════════════════════════════════════════
  // SETTINGS
  // ════════════════════════════════════════════════════════════════════════════

  app.get(
    "/api/settings/profile",
    authenticateToken,
    requireAnyRole,
    async (req: any, res) => {
      try {
        const pool = await getConnection();
        const r = await pool
          .request()
          .input("id", sql.Int, req.user.id)
          .query(
            "SELECT id,full_name,email,phone_number,role,jabatan,member_id,division,avatar_url,created_at FROM users WHERE id=@id"
          );
        if (!r.recordset.length)
          return res
            .status(404)
            .json({ success: false, message: "Not found" });
        res.json({
          success: true,
          data: {
            ...r.recordset[0],
            permissions:
              ROLE_PERMISSIONS[
                r.recordset[0].role as keyof typeof ROLE_PERMISSIONS
              ] || [],
          },
        });
      } catch {
        res.status(500).json({ success: false, message: "DB error" });
      }
    }
  );

  app.put(
    "/api/settings/profile",
    authenticateToken,
    requireAnyRole,
    async (req: any, res) => {
      try {
        const { fullName, phoneNumber, avatarUrl } = req.body;
        const pool = await getConnection();
        await pool
          .request()
          .input("id", sql.Int, req.user.id)
          .input("fn", sql.NVarChar, fullName || null)
          .input("ph", sql.NVarChar, phoneNumber || null)
          .input("av", sql.NVarChar, avatarUrl || null)
          .query(
            "UPDATE users SET full_name=ISNULL(@fn,full_name),phone_number=@ph,avatar_url=@av,updated_at=GETDATE() WHERE id=@id"
          );
        res.json({ success: true, message: "Profile updated" });
      } catch {
        res.status(500).json({ success: false, message: "DB error" });
      }
    }
  );

  app.post(
    "/api/settings/change-password",
    authenticateToken,
    requireAnyRole,
    async (req: any, res) => {
      try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword || newPassword.length < 8)
          return res.status(400).json({
            success: false,
            message:
              "Current password and new password (min 8 chars) required",
          });
        const pool = await getConnection();
        const u = await pool
          .request()
          .input("id", sql.Int, req.user.id)
          .query("SELECT password_hash FROM users WHERE id=@id");
        if (!await bcrypt.compare(currentPassword, u.recordset[0].password_hash))
          return res.status(400).json({
            success: false,
            message: "Current password is incorrect",
          });
        const hash = await bcrypt.hash(newPassword, 12);
        await pool
          .request()
          .input("id", sql.Int, req.user.id)
          .input("pw", sql.NVarChar, hash)
          .query(
            "UPDATE users SET password_hash=@pw,updated_at=GETDATE() WHERE id=@id"
          );
        res.json({ success: true, message: "Password changed successfully" });
      } catch {
        res.status(500).json({ success: false, message: "DB error" });
      }
    }
  );

  app.get(
    "/api/settings/system",
    authenticateToken,
    requireAnyRole,
    async (req: any, res) => {
      try {
        const pool = await getConnection();
        let query =
          "SELECT setting_key,setting_value,setting_type,description FROM system_settings";
        if (req.user.role !== "super_admin") {
          query += ` WHERE setting_key IN ('org_name','org_logo_url','ranking_enabled',
            'ranking_period','allow_self_checkin','lateness_threshold','qr_expiry_minutes',
            'attendance_window','streak_enabled')`;
        }
        const r = await pool.request().query(query);
        const s: Record<string, any> = {};
        r.recordset.forEach((row: any) => {
          let v: any = row.setting_value;
          if (row.setting_type === "boolean") v = v === "true";
          else if (row.setting_type === "integer") v = parseInt(v);
          s[row.setting_key] = v;
        });
        res.json({ success: true, data: s });
      } catch {
        res.status(500).json({ success: false, message: "DB error" });
      }
    }
  );

  app.put(
    "/api/settings/system",
    authenticateToken,
    requireSuperAdmin,
    async (req: any, res) => {
      try {
        const pool = await getConnection();
        for (const [k, v] of Object.entries(req.body)) {
          await pool
            .request()
            .input("k", sql.NVarChar, k)
            .input("v", sql.NVarChar, String(v))
            .query(
              "UPDATE system_settings SET setting_value=@v,updated_at=GETDATE() WHERE setting_key=@k"
            );
        }
        await log(
          pool,
          req.user.id,
          "UPDATE_SETTINGS",
          "system",
          null,
          "System settings updated",
          req.ip
        );
        res.json({ success: true, message: "Settings saved" });
      } catch {
        res.status(500).json({ success: false, message: "DB error" });
      }
    }
  );

 app.get(
  "/api/settings/activity-logs",
  authenticateToken,
  requireAnyRole,  // ✅ Semua role bisa akses
  async (req: any, res) => {
    try {
      const { limit = 50, offset = 0 } = req.query;
      const pool = await getConnection();
      
      let query = `
        SELECT al.*, u.full_name as user_name 
        FROM activity_logs al
        LEFT JOIN users u ON al.user_id = u.id
      `;
      
      // Jika bukan super_admin, hanya tampilkan log miliknya sendiri
      if (req.user.role !== 'super_admin') {
        query += ` WHERE al.user_id = @userId`;
      }
      
      query += ` ORDER BY al.created_at DESC OFFSET @off ROWS FETCH NEXT @lim ROWS ONLY`;
      
      const request = pool
        .request()
        .input("lim", sql.Int, Number(limit))
        .input("off", sql.Int, Number(offset));
      
      if (req.user.role !== 'super_admin') {
        request.input("userId", sql.Int, req.user.id);
      }
      
      const r = await request.query(query);
      
      res.json({ success: true, data: r.recordset });
    } catch (error: any) {
      console.error('[ACTIVITY LOGS ERROR]', error);
      res.status(500).json({ success: false, message: "DB error" });
    }
  }
);

  // ============================================
// QUESTIONS API
// ============================================

const questionRepo = new QuestionRepository();

// GET /api/questions - Admin melihat semua soal
app.get('/api/questions', authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    const questions = await questionRepo.findAll();
    res.json({ success: true, data: questions });
  } catch (error: any) {
    console.error('[GET QUESTIONS]', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/questions/available - User melihat soal yang tersedia
app.get('/api/questions/available', authenticateToken, requireAnyRole, async (req: any, res) => {
  try {
    const questions = await questionRepo.getAvailableQuestions(req.user.id);
    res.json({ success: true, data: questions });
  } catch (error: any) {
    console.error('[GET AVAILABLE QUESTIONS]', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/questions/:id
app.get('/api/questions/:id', authenticateToken, requireAnyRole, async (req, res) => {
  try {
    const question = await questionRepo.findById(parseInt(req.params.id));
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }
    res.json({ success: true, data: question });
  } catch (error: any) {
    console.error('[GET QUESTION]', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/questions - Admin membuat soal
app.post('/api/questions', authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    const { title, questionText, questionType, options, correctAnswer, points, timeLimitMinutes, startDate, endDate, maxAttempts } = req.body;
    
    console.log('📝 Creating question:', { title, questionType }); // DEBUG LOG
    
    if (!title || !questionText || !questionType || !correctAnswer) {
      return res.status(400).json({
        success: false,
        message: 'Title, question text, question type, and correct answer are required'
      });
    }

    // Validate max 3 questions on the same date
    if (startDate) {
      const pool = await getConnection();
      const countResult = await pool
        .request()
        .input('startDate', sql.DateTime, startDate)
        .query(`
          SELECT COUNT(*) as count 
          FROM questions 
          WHERE CAST(start_date AS DATE) = CAST(@startDate AS DATE)
        `);
      const count = countResult.recordset[0].count;
      if (count >= 3) {
        return res.status(400).json({
          success: false,
          message: 'Maksimal hanya 3 pertanyaan yang dapat dibuat untuk tanggal yang sama.'
        });
      }
    }
    
    // Validasi question type
    const validTypes = ['multiple_choice', 'true_false', 'short_answer'];
    if (!validTypes.includes(questionType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid question type. Must be one of: ${validTypes.join(', ')}`
      });
    }
    
    const question = await questionRepo.create({
      title,
      questionText,
      questionType: questionType as 'multiple_choice' | 'true_false' | 'short_answer',
      options: options ? JSON.stringify(options) : null,
      correctAnswer: String(correctAnswer),
      points: parseInt(points) || 10,
      timeLimitMinutes: parseInt(timeLimitMinutes) || 5,
      createdBy: req.user.id,
      startDate: startDate || null,
      endDate: endDate || null,
      maxAttempts: parseInt(maxAttempts) || 1
    });
    
    const pool = await getConnection();
    await log(pool, req.user.id, 'CREATE_QUESTION', 'question', question.id, `Created question: ${title}`, req.ip);
    
    console.log('✅ Question created:', question.id); // DEBUG LOG
    
    res.status(201).json({ success: true, data: question });
  } catch (error: any) {
    console.error('❌ [CREATE QUESTION]', error.message); // DEBUG LOG
    console.error('Stack:', error.stack); // DEBUG STACK
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create question: ' + (error.message || 'Server error')
    });
  }
});

// PUT /api/questions/:id
app.put('/api/questions/:id', authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    const questionId = parseInt(req.params.id);
    const data = { ...req.body };
    if (data.startDate) {
      const pool = await getConnection();
      const countResult = await pool
        .request()
        .input('id', sql.Int, questionId)
        .input('startDate', sql.DateTime, data.startDate)
        .query(`
          SELECT COUNT(*) as count 
          FROM questions 
          WHERE CAST(start_date AS DATE) = CAST(@startDate AS DATE)
            AND id != @id
        `);
      const count = countResult.recordset[0].count;
      if (count >= 3) {
        return res.status(400).json({
          success: false,
          message: 'Maksimal hanya 3 pertanyaan yang dapat dibuat untuk tanggal yang sama.'
        });
      }
    }

    if (data.options !== undefined) {
      data.options = typeof data.options === 'string' ? data.options : JSON.stringify(data.options);
    }
    await questionRepo.update(questionId, data);
    res.json({ success: true, message: 'Question updated' });
  } catch (error: any) {
    console.error('[UPDATE QUESTION]', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/questions/:id
app.delete('/api/questions/:id', authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    await questionRepo.delete(parseInt(req.params.id));
    res.json({ success: true, message: 'Question deleted' });
  } catch (error: any) {
    console.error('[DELETE QUESTION]', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/questions/:id/submit - User menjawab soal
app.post('/api/questions/:id/submit', authenticateToken, requireAnyRole, async (req: any, res) => {
  try {
    const { answer, timeSpentSeconds } = req.body;
    const questionId = parseInt(req.params.id);
    
    console.log('📝 Submit answer:', { questionId, userId: req.user.id, answer, timeSpentSeconds });
    
    if (!answer) {
      return res.status(400).json({ success: false, message: 'Answer is required' });
    }
    
    const pool = await getConnection();
    
    // Get question details
    const qResult = await pool
      .request()
      .input('id', sql.Int, questionId)
      .query('SELECT * FROM questions WHERE id = @id');
    
    if (!qResult.recordset.length) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }
    
    const question = qResult.recordset[0];
    
    // Resolve member_id
    const userRes = await pool
      .request()
      .input('userId', sql.Int, req.user.id)
      .query('SELECT member_id FROM users WHERE id = @userId');
    const memberId = userRes.recordset[0]?.member_id;
    if (!memberId) {
      return res.status(400).json({ success: false, message: 'User member_id not found' });
    }

    // Check remaining attempts
    const attemptResult = await pool
      .request()
      .input('memberId', sql.NVarChar, memberId)
      .input('questionId', sql.Int, questionId)
      .query(`
        SELECT COUNT(*) as attempts 
        FROM user_answers 
        WHERE member_id = @memberId AND question_id = @questionId
      `);
    
    const currentAttempts = attemptResult.recordset[0].attempts;
    console.log('Current attempts:', currentAttempts, 'Max:', question.max_attempts);
    
    if (currentAttempts >= question.max_attempts) {
      return res.status(400).json({ 
        success: false, 
        message: 'Maximum attempts reached' 
      });
    }
    
    // Check answer
    let isCorrect = false;
    const userAnswer = String(answer).trim();
    const correctAnswer = String(question.correct_answer).trim();
    
    console.log('Comparing:', { userAnswer, correctAnswer, type: question.question_type });
    
    if (question.question_type === 'multiple_choice') {
      // Multiple choice: compare letter (A, B, C, D) case-insensitive
      isCorrect = userAnswer.toUpperCase() === correctAnswer.toUpperCase();
    } else if (question.question_type === 'true_false') {
      // True/False: compare case-insensitive
      isCorrect = userAnswer.toLowerCase() === correctAnswer.toLowerCase();
    } else if (question.question_type === 'short_answer') {
      // Short answer: check if answer contains keyword
      isCorrect = userAnswer.toLowerCase().includes(correctAnswer.toLowerCase());
    }
    
    console.log('Is correct?', isCorrect);
    
    const pointsEarned = isCorrect ? 10 : null;
    const nextAttempt = currentAttempts + 1;
    
    // Insert answer
    const insertResult = await pool
      .request()
      .input('member_id', sql.NVarChar, memberId)
      .input('question_id', sql.Int, questionId)
      .input('answer_text', sql.NVarChar, userAnswer)
      .input('is_correct', sql.Bit, isCorrect ? 1 : 0)
      .input('points_earned', sql.Int, pointsEarned)
      .input('time_spent_seconds', sql.Int, timeSpentSeconds || null)
      .input('attempt_number', sql.Int, nextAttempt)
      .query(`
        INSERT INTO user_answers 
        (member_id, question_id, answer_text, is_correct, points_earned, time_spent_seconds, attempt_number, answered_at)
        VALUES (@member_id, @question_id, @answer_text, @is_correct, @points_earned, @time_spent_seconds, @attempt_number, GETDATE());
        
        SELECT * FROM user_answers WHERE id = SCOPE_IDENTITY();
      `);
    
    const answerResult = insertResult.recordset[0];
    
    console.log('✅ Answer saved:', answerResult);

    // If correct, insert into point_logs
    if (isCorrect) {
      await pool
        .request()
        .input("member_id", sql.NVarChar, memberId)
        .input("points", sql.Int, 10)
        .input("type", sql.NVarChar, "question")
        .input("notes", sql.NVarChar, `Bible Study Quiz reward for question: ${question.title}`)
        .query(`
          INSERT INTO point_logs (member_id, points, type, notes, created_at)
          VALUES (@member_id, @points, @type, @notes, GETDATE())
        `);
    }
    
    res.json({
      success: true,
      data: {
        id: answerResult.id,
        isCorrect: isCorrect,
        pointsEarned: pointsEarned,
        message: isCorrect 
          ? `Benar! Kamu mendapatkan ${pointsEarned} poin!` 
          : `Salah. Jawaban benar: ${correctAnswer}`
      }
    });
    
  } catch (error: any) {
    console.error('❌ [SUBMIT ANSWER ERROR]', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error: ' + (error.message || 'Unknown error')
    });
  }
});

// GET /api/questions/leaderboard
app.get('/api/questions/leaderboard', authenticateToken, requireAnyRole, async (req: any, res) => {
  try {
    const leaderboard = await questionRepo.getLeaderboard(20);
    res.json({ success: true, data: leaderboard });
  } catch (error: any) {
    console.error('[QUESTION LEADERBOARD]', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/questions/stats/:userId
app.get('/api/questions/stats/:userId', authenticateToken, requireSelfOrAdmin('userId'), async (req: any, res) => {
  try {
    const points = await questionRepo.getUserPoints(parseInt(req.params.userId));
    res.json({ success: true, data: points });
  } catch (error: any) {
    console.error('[QUESTION STATS]', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

  // ════════════════════════════════════════════════════════════════════════════
  // DEV + MISC
  // ════════════════════════════════════════════════════════════════════════════

  app.get("/api/dev/auto-login", async (req, res) => {
    if (process.env.NODE_ENV === "production")
      return res
        .status(403)
        .json({ error: "Not available in production" });
    try {
      const { role = "super_admin" } = req.query;
      const pool = await getConnection();
      const r = await pool
        .request()
        .input("role", sql.NVarChar, role as string)
        .query(
          "SELECT TOP 1 * FROM users WHERE role=@role AND is_active=1"
        );
      if (!r.recordset.length)
        return res
          .status(404)
          .json({ error: `No active ${role} user found` });
      const user = r.recordset[0];
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET || "secret_key_change_in_production",
        { expiresIn: "24h" }
      );
      res.json({ accessToken: token, refreshToken: token, user });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/ping", (_req, res) =>
    res.json({ message: process.env.PING_MESSAGE ?? "pong" })
  );

  app.get("/api/demo", handleDemo);
  app.get("/api/attendance/leaderboard", handleGetLeaderboard);
  app.get("/api/user-dashboard/profile", handleGetUserDashboard);
  app.get("/api/user-dashboard/questions", handleGetUserDashboardQuestions);
  app.post("/api/user-dashboard/questions/submit", handleAnswerUserDashboardQuestion);
  app.post("/api/user-dashboard/question/reward", handleAwardQuestionPoints);
  app.get("/api/member-leaderboard", handleGetMemberLeaderboard);
  app.post("/api/face-ai/preview", handlePreviewDetection);
  app.post("/api/face-ai/registration/capture", handleCaptureRegistration);
  app.post("/api/face-ai/registration/finalize", handleFinalizeRegistration);
  app.post("/api/face-ai/attendance/verify", handleVerifyAttendance);

  // 404 for unknown API routes
app.use((req: any, res: any, next: any) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ 
      error: `${req.method} ${req.path} not found` 
    });
  }
  // Non-API routes di development: biarkan lewat
  // (Vite dev server yang handle, bukan Express)
  next();
});

  return app;
}