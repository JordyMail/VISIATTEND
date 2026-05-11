// server/index.ts
import "dotenv/config";
import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { getConnection, sql } from "./db/config.js";
import { handleDemo } from "./routes/demo.js";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // ============ HELPER FUNCTIONS ============
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'Access token required' });
    }
    
    jwt.verify(token, process.env.JWT_SECRET || 'secret_key', (err: any, user: any) => {
      if (err) return res.status(403).json({ success: false, message: 'Invalid or expired token' });
      req.user = user;
      next();
    });
  };

  // ============ USER ROUTES ============
  // DEVELOPMENT ONLY - Auto login
app.get("/api/dev/auto-login", async (req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool.request()
            .query("SELECT TOP 1 * FROM users WHERE role = 'admin'");
        
        if (result.recordset.length === 0) {
            return res.status(404).json({ error: "No admin user found" });
        }
        
        const user = result.recordset[0];
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'secret_key',
            { expiresIn: '24h' }
        );
        
        res.json({
            accessToken: token,
            refreshToken: token,
            user: {
                id: user.id,
                full_name: user.full_name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


  // GET /api/users - Get all users
  app.get("/api/users", async (req, res) => {
  
    try {
      const pool = await getConnection();
      const result = await pool.request().query(`
        SELECT id, full_name, member_id, email, role, phone_number, is_active, created_at
        FROM users
        ORDER BY created_at DESC
      `);
      res.json({ success: true, data: result.recordset });
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ success: false, message: "Database error" });
    }
  });

  // GET /api/users/:id - Get user by ID
  app.get("/api/users/:id",async (req, res) => {
    try {
      const pool = await getConnection();
      const result = await pool.request()
        .input("id", sql.Int, req.params.id)
        .query(`
          SELECT id, full_name, member_id, email, role, phone_number, is_active, created_at
          FROM users
          WHERE id = @id
        `);
      
      if (result.recordset.length === 0) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
      
      res.json({ success: true, data: result.recordset[0] });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ success: false, message: "Database error" });
    }
  });

  // POST /api/users - Create new user
  app.post("/api/users", async (req, res) => {
    try {
      const { fullName, memberId, email, password, role, phoneNumber } = req.body;
      
      // Validasi input
      if (!fullName || !memberId || !email || !password) {
        return res.status(400).json({ 
          success: false, 
          message: "Full name, member ID, email, and password are required" 
        });
      }
      
      const pool = await getConnection();
      
      // Cek apakah email sudah terdaftar
      const checkEmail = await pool.request()
        .input("email", sql.NVarChar, email)
        .query("SELECT id FROM users WHERE email = @email");
      
      if (checkEmail.recordset.length > 0) {
        return res.status(400).json({ 
          success: false, 
          message: "Email already registered" 
        });
      }
      
      // Cek apakah member ID sudah terdaftar
      const checkMemberId = await pool.request()
        .input("memberId", sql.NVarChar, memberId)
        .query("SELECT id FROM users WHERE member_id = @memberId");
      
      if (checkMemberId.recordset.length > 0) {
        return res.status(400).json({ 
          success: false, 
          message: "Member ID already exists" 
        });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Insert user
      const result = await pool.request()
        .input("fullName", sql.NVarChar, fullName)
        .input("memberId", sql.NVarChar, memberId)
        .input("email", sql.NVarChar, email)
        .input("password", sql.NVarChar, hashedPassword)
        .input("role", sql.NVarChar, role || "member")
        .input("phoneNumber", sql.NVarChar, phoneNumber || null)
        .query(`
          INSERT INTO users (full_name, member_id, email, password_hash, role, phone_number, is_active, created_at)
          OUTPUT INSERTED.id, INSERTED.full_name, INSERTED.member_id, INSERTED.email, INSERTED.role, INSERTED.phone_number, INSERTED.is_active, INSERTED.created_at
          VALUES (@fullName, @memberId, @email, @password, @role, @phoneNumber, 1, GETDATE())
        `);
      
      res.status(201).json({ 
        success: true, 
        message: "User created successfully",
        data: result.recordset[0]
      });
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ success: false, message: "Database error" });
    }
  });

  // PUT /api/users/:id - Update user
  app.put("/api/users/:id", async (req, res) => {
    try {
      const { fullName, email, phoneNumber, role } = req.body;
      const userId = req.params.id;
      
      const pool = await getConnection();
      
      // Cek apakah user exists
      const checkUser = await pool.request()
        .input("id", sql.Int, userId)
        .query("SELECT id FROM users WHERE id = @id");
      
      if (checkUser.recordset.length === 0) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
      

      // Update user
      await pool.request()
        .input("id", sql.Int, userId)
        .input("fullName", sql.NVarChar, fullName)
        .input("email", sql.NVarChar, email)
        .input("phoneNumber", sql.NVarChar, phoneNumber || null)
        .input("role", sql.NVarChar, role)
        .query(`
          UPDATE users 
          SET full_name = @fullName, 
              email = @email, 
              phone_number = @phoneNumber, 
              role = @role
          WHERE id = @id
        `);
      
      res.json({ success: true, message: "User updated successfully" });
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ success: false, message: "Database error" });
    }
  });

  // DELETE /api/users/:id - Delete user
  app.delete("/api/users/:id", async (req, res) => {
    try {
      const pool = await getConnection();
      
      const result = await pool.request()
        .input("id", sql.Int, req.params.id)
        .query("DELETE FROM users WHERE id = @id");
      
      if (result.rowsAffected[0] === 0) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
      
      res.json({ success: true, message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ success: false, message: "Database error" });
    }
  });

  // PATCH /api/users/:id/toggle-status - Toggle user status
  app.patch("/api/users/:id/toggle-status", async (req, res) => {
    try {
      const pool = await getConnection();
      
      // Get current status
      const user = await pool.request()
        .input("id", sql.Int, req.params.id)
        .query("SELECT is_active FROM users WHERE id = @id");
      
      if (user.recordset.length === 0) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
      
      const newStatus = user.recordset[0].is_active ? 0 : 1;
      
      await pool.request()
        .input("id", sql.Int, req.params.id)
        .input("isActive", sql.Bit, newStatus)
        .query("UPDATE users SET is_active = @isActive WHERE id = @id");
      
      res.json({ success: true, message: `User ${newStatus ? "activated" : "deactivated"} successfully` });
    } catch (error) {
      console.error("Error toggling user status:", error);
      res.status(500).json({ success: false, message: "Database error" });
    }
  });

  // ============ EVENT ROUTES ============
  
  // GET /api/events - Get all events
  app.get("/api/events", async (req, res) => {
    try {
      const { isActive } = req.query;
      const pool = await getConnection();
      
      let query = `
        SELECT e.*, u.full_name as preacher_name
        FROM events e
        LEFT JOIN users u ON e.preacher_id = u.id
      `;
      
      if (isActive !== undefined) {
        query += ` WHERE e.is_active = ${isActive === 'true' ? 1 : 0}`;
      }
      
      query += ` ORDER BY e.created_at DESC`;
      
      const result = await pool.request().query(query);
      res.json({ success: true, data: result.recordset });
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ success: false, message: "Database error" });
    }
  });

  // GET /api/events/:id - Get event by ID
  app.get("/api/events/:id", async (req, res) => {
    try {
      const pool = await getConnection();
      const result = await pool.request()
        .input("id", sql.Int, req.params.id)
        .query(`
          SELECT e.*, u.full_name as preacher_name
          FROM events e
          LEFT JOIN users u ON e.preacher_id = u.id
          WHERE e.id = @id
        `);
      
      if (result.recordset.length === 0) {
        return res.status(404).json({ success: false, message: "Event not found" });
      }
      
      res.json({ success: true, data: result.recordset[0] });
    } catch (error) {
      console.error("Error fetching event:", error);
      res.status(500).json({ success: false, message: "Database error" });
    }
  });

  // POST /api/events - Create new event
  app.post("/api/events", async (req, res) => {
    try {
      const { eventCode, eventName, description, preacherId, season, eventType } = req.body;
      
      if (!eventCode || !eventName || !eventType) {
        return res.status(400).json({ 
          success: false, 
          message: "Event code, name, and type are required" 
        });
      }
      
      const pool = await getConnection();
      
      // Cek apakah event code sudah ada
      const checkCode = await pool.request()
        .input("eventCode", sql.NVarChar, eventCode)
        .query("SELECT id FROM events WHERE event_code = @eventCode");
      
      if (checkCode.recordset.length > 0) {
        return res.status(400).json({ 
          success: false, 
          message: "Event code already exists" 
        });
      }
      
      const result = await pool.request()
        .input("eventCode", sql.NVarChar, eventCode)
        .input("eventName", sql.NVarChar, eventName)
        .input("description", sql.NVarChar, description || null)
        .input("preacherId", sql.Int, preacherId || null)
        .input("season", sql.NVarChar, season || null)
        .input("eventType", sql.NVarChar, eventType)
        .query(`
          INSERT INTO events (event_code, event_name, description, preacher_id, season, event_type, is_active, created_at)
          OUTPUT INSERTED.*
          VALUES (@eventCode, @eventName, @description, @preacherId, @season, @eventType, 1, GETDATE())
        `);
      
      res.status(201).json({ 
        success: true, 
        message: "Event created successfully",
        data: result.recordset[0]
      });
    } catch (error) {
      console.error("Error creating event:", error);
      res.status(500).json({ success: false, message: "Database error" });
    }
  });

  // PUT /api/events/:id - Update event
  app.put("/api/events/:id",  async (req, res) => {
    try {
      const { eventName, description, preacherId, eventType } = req.body;
      const eventId = req.params.id;
      
      const pool = await getConnection();
      
      const checkEvent = await pool.request()
        .input("id", sql.Int, eventId)
        .query("SELECT id FROM events WHERE id = @id");
      
      if (checkEvent.recordset.length === 0) {
        return res.status(404).json({ success: false, message: "Event not found" });
      }
      
      await pool.request()
        .input("id", sql.Int, eventId)
        .input("eventName", sql.NVarChar, eventName)
        .input("description", sql.NVarChar, description || null)
        .input("preacherId", sql.Int, preacherId || null)
        .input("eventType", sql.NVarChar, eventType)
        .query(`
          UPDATE events 
          SET event_name = @eventName, 
              description = @description, 
              preacher_id = @preacherId, 
              event_type = @eventType
          WHERE id = @id
        `);
      
      res.json({ success: true, message: "Event updated successfully" });
    } catch (error) {
      console.error("Error updating event:", error);
      res.status(500).json({ success: false, message: "Database error" });
    }
  });

  // DELETE /api/events/:id - Delete event
  app.delete("/api/events/:id",async (req, res) => {
    try {
      const pool = await getConnection();
      
      const result = await pool.request()
        .input("id", sql.Int, req.params.id)
        .query("DELETE FROM events WHERE id = @id");
      
      if (result.rowsAffected[0] === 0) {
        return res.status(404).json({ success: false, message: "Event not found" });
      }
      
      res.json({ success: true, message: "Event deleted successfully" });
    } catch (error) {
      console.error("Error deleting event:", error);
      res.status(500).json({ success: false, message: "Database error" });
    }
  });

  // GET /api/events/:id/members - Get enrolled members
  app.get("/api/events/:id/members", async (req, res) => {
    try {
      const pool = await getConnection();
      const result = await pool.request()
        .input("eventId", sql.Int, req.params.id)
        .query(`
          SELECT u.id, u.full_name, u.member_id, u.email, u.phone_number
          FROM users u
          JOIN event_enrollments ee ON u.id = ee.user_id
          WHERE ee.event_id = @eventId AND ee.is_active = 1
          ORDER BY u.full_name
        `);
      
      res.json({ success: true, data: result.recordset });
    } catch (error) {
      console.error("Error fetching event members:", error);
      res.status(500).json({ success: false, message: "Database error" });
    }
  });

  // POST /api/events/:id/enroll - Enroll member to event
  app.post("/api/events/:id/enroll", async (req, res) => {
    try {
      const { userId } = req.body;
      const eventId = req.params.id;
      
      if (!userId) {
        return res.status(400).json({ success: false, message: "User ID is required" });
      }
      
      const pool = await getConnection();
      
      // Cek apakah sudah terdaftar
      const checkEnrollment = await pool.request()
        .input("eventId", sql.Int, eventId)
        .input("userId", sql.Int, userId)
        .query("SELECT id FROM event_enrollments WHERE event_id = @eventId AND user_id = @userId");
      
      if (checkEnrollment.recordset.length > 0) {
        return res.status(400).json({ success: false, message: "User already enrolled in this event" });
      }
      
      await pool.request()
        .input("eventId", sql.Int, eventId)
        .input("userId", sql.Int, userId)
        .query(`
          INSERT INTO event_enrollments (event_id, user_id, enrolled_at, is_active)
          VALUES (@eventId, @userId, GETDATE(), 1)
        `);
      
      res.json({ success: true, message: "Member enrolled successfully" });
    } catch (error) {
      console.error("Error enrolling member:", error);
      res.status(500).json({ success: false, message: "Database error" });
    }
  });

  // ============ ATTENDANCE ROUTES ============
  
  // GET /api/attendance - Get all attendance records
  app.get("/api/attendance", async (req, res) => {
    try {
      const { eventId, startDate, endDate } = req.query;
      const pool = await getConnection();
      
      let query = `
        SELECT a.*, u.full_name as user_name, e.event_name, e.event_code
        FROM attendance a
        JOIN users u ON a.user_id = u.id
        JOIN events e ON a.event_id = e.id
        WHERE 1=1
      `;
      
      if (eventId) {
        query += ` AND a.event_id = ${eventId}`;
      }
      
      if (startDate) {
        query += ` AND a.attendance_date >= '${startDate}'`;
      }
      
      if (endDate) {
        query += ` AND a.attendance_date <= '${endDate}'`;
      }
      
      query += ` ORDER BY a.attendance_date DESC, a.check_in_time DESC`;
      
      const result = await pool.request().query(query);
      res.json({ success: true, data: result.recordset });
    } catch (error) {
      console.error("Error fetching attendance:", error);
      res.status(500).json({ success: false, message: "Database error" });
    }
  });

  // GET /api/attendance/:id - Get attendance by ID
  app.get("/api/attendance/:id", async (req, res) => {
    try {
      const pool = await getConnection();
      const result = await pool.request()
        .input("id", sql.Int, req.params.id)
        .query(`
          SELECT a.*, u.full_name as user_name, e.event_name, e.event_code
          FROM attendance a
          JOIN users u ON a.user_id = u.id
          JOIN events e ON a.event_id = e.id
          WHERE a.id = @id
        `);
      
      if (result.recordset.length === 0) {
        return res.status(404).json({ success: false, message: "Attendance record not found" });
      }
      
      res.json({ success: true, data: result.recordset[0] });
    } catch (error) {
      console.error("Error fetching attendance:", error);
      res.status(500).json({ success: false, message: "Database error" });
    }
  });

  // POST /api/attendance - Create attendance record
  app.post("/api/attendance", async (req, res) => {
    try {
      const { userId, eventId, attendanceDate, checkInTime, checkOutTime, status, deviceInfo } = req.body;
      
      if (!userId || !eventId || !attendanceDate || !checkInTime || !status) {
        return res.status(400).json({ 
          success: false, 
          message: "User ID, event ID, date, check-in time, and status are required" 
        });
      }
      
      const pool = await getConnection();
      
      // Cek duplikasi
      const checkDuplicate = await pool.request()
        .input("userId", sql.Int, userId)
        .input("eventId", sql.Int, eventId)
        .input("attendanceDate", sql.Date, attendanceDate)
        .query("SELECT id FROM attendance WHERE user_id = @userId AND event_id = @eventId AND attendance_date = @attendanceDate");
      
      if (checkDuplicate.recordset.length > 0) {
        return res.status(400).json({ success: false, message: "Attendance already recorded for this user, event, and date" });
      }
      
      const result = await pool.request()
        .input("userId", sql.Int, userId)
        .input("eventId", sql.Int, eventId)
        .input("attendanceDate", sql.Date, attendanceDate)
        .input("checkInTime", sql.DateTime, checkInTime)
        .input("checkOutTime", sql.DateTime, checkOutTime || null)
        .input("status", sql.NVarChar, status)
        .input("deviceInfo", sql.NVarChar, deviceInfo || null)
        .query(`
          INSERT INTO attendance (user_id, event_id, attendance_date, check_in_time, check_out_time, status, device_info, created_at)
          OUTPUT INSERTED.*
          VALUES (@userId, @eventId, @attendanceDate, @checkInTime, @checkOutTime, @status, @deviceInfo, GETDATE())
        `);
      
      res.status(201).json({ 
        success: true, 
        message: "Attendance recorded successfully",
        data: result.recordset[0]
      });
    } catch (error) {
      console.error("Error creating attendance:", error);
      res.status(500).json({ success: false, message: "Database error" });
    }
  });

  // PUT /api/attendance/:id - Update attendance
  app.put("/api/attendance/:id", async (req, res) => {
    try {
      const { checkOutTime, status } = req.body;
      const attendanceId = req.params.id;
      
      const pool = await getConnection();
      
      const checkAttendance = await pool.request()
        .input("id", sql.Int, attendanceId)
        .query("SELECT id FROM attendance WHERE id = @id");
      
      if (checkAttendance.recordset.length === 0) {
        return res.status(404).json({ success: false, message: "Attendance record not found" });
      }
      
      await pool.request()
        .input("id", sql.Int, attendanceId)
        .input("checkOutTime", sql.DateTime, checkOutTime || null)
        .input("status", sql.NVarChar, status)
        .query(`
          UPDATE attendance 
          SET check_out_time = @checkOutTime, 
              status = @status
          WHERE id = @id
        `);
      
      res.json({ success: true, message: "Attendance updated successfully" });
    } catch (error) {
      console.error("Error updating attendance:", error);
      res.status(500).json({ success: false, message: "Database error" });
    }
  });

  // DELETE /api/attendance/:id - Delete attendance
  app.delete("/api/attendance/:id", async (req, res) => {
    try {
      const pool = await getConnection();
      
      const result = await pool.request()
        .input("id", sql.Int, req.params.id)
        .query("DELETE FROM attendance WHERE id = @id");
      
      if (result.rowsAffected[0] === 0) {
        return res.status(404).json({ success: false, message: "Attendance record not found" });
      }
      
      res.json({ success: true, message: "Attendance deleted successfully" });
    } catch (error) {
      console.error("Error deleting attendance:", error);
      res.status(500).json({ success: false, message: "Database error" });
    }
  });

  // GET /api/attendance/stats/today - Today's attendance stats
  app.get("/api/attendance/stats/today", async (req, res) => {
    try {
      const pool = await getConnection();
      const today = new Date().toISOString().split('T')[0];
      
      const result = await pool.request()
        .input("today", sql.Date, today)
        .query(`
          SELECT 
            COUNT(CASE WHEN status IN ('present', 'late') THEN 1 END) as checkedIn,
            COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
            COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent
          FROM attendance
          WHERE attendance_date = @today
        `);
      
      res.json({ success: true, data: result.recordset[0] });
    } catch (error) {
      console.error("Error fetching today's stats:", error);
      res.status(500).json({ success: false, message: "Database error" });
    }
  });

  // GET /api/attendance/trend - Attendance trend
  app.get("/api/attendance/trend", async (req, res) => {
    try {
      const { days = 7 } = req.query;
      const pool = await getConnection();
      
      const result = await pool.request()
        .input("days", sql.Int, days)
        .query(`
          SELECT 
            attendance_date,
            COUNT(*) as total,
            SUM(CASE WHEN status IN ('present', 'late') THEN 1 ELSE 0 END) as present
          FROM attendance
          WHERE attendance_date >= DATEADD(DAY, -@days, GETDATE())
          GROUP BY attendance_date
          ORDER BY attendance_date
        `);
      
      res.json({ success: true, data: result.recordset });
    } catch (error) {
      console.error("Error fetching attendance trend:", error);
      res.status(500).json({ success: false, message: "Database error" });
    }
  });

  // GET /api/attendance/leaderboard - Get leaderboard
  app.get("/api/attendance/leaderboard", async (req, res) => {
    try {
      const { eventId, period = "month" } = req.query;
      const pool = await getConnection();
      
      const result = await pool.request()
        .input("eventId", sql.Int, eventId)
        .execute('sp_get_leaderboard', { period: sql.NVarChar(20), value: period });
      
      res.json({ success: true, data: result.recordset });
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      res.status(500).json({ success: false, message: "Database error" });
    }
  });

  // ============ AUTH ROUTES ============
  
  // POST /api/auth/login - Login user
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ success: false, message: "Email and password are required" });
      }
      
      const pool = await getConnection();
      const result = await pool.request()
        .input("email", sql.NVarChar, email)
        .query("SELECT * FROM users WHERE email = @email");
      
      if (result.recordset.length === 0) {
        return res.status(401).json({ success: false, message: "Invalid email or password" });
      }
      
      const user = result.recordset[0];
      const validPassword = await bcrypt.compare(password, user.password_hash);
      
      if (!validPassword) {
        return res.status(401).json({ success: false, message: "Invalid email or password" });
      }
      
      if (!user.is_active) {
        return res.status(401).json({ success: false, message: "Account is deactivated" });
      }
      
      // Update last login
      await pool.request()
        .input("id", sql.Int, user.id)
        .query("UPDATE users SET last_login = GETDATE() WHERE id = @id");
      
      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET || 'secret_key',
        { expiresIn: '24h' }
      );
      
      // Store session
      await pool.request()
        .input("userId", sql.Int, user.id)
        .input("accessToken", sql.NVarChar, token)
        .input("refreshToken", sql.NVarChar, token)
        .input("expiresAt", sql.DateTime, new Date(Date.now() + 24 * 60 * 60 * 1000))
        .input("ipAddress", sql.NVarChar, req.ip || null)
        .input("userAgent", sql.NVarChar, req.headers['user-agent'] || null)
        .query(`
          INSERT INTO sessions (user_id, access_token, refresh_token, expires_at, ip_address, user_agent, created_at, last_activity)
          VALUES (@userId, @accessToken, @refreshToken, @expiresAt, @ipAddress, @userAgent, GETDATE(), GETDATE())
        `);
      
      res.json({
        success: true,
        data: {
          accessToken: token,
          refreshToken: token,
          user: {
            id: user.id,
            full_name: user.full_name,
            email: user.email,
            role: user.role
          }
        }
      });
    } catch (error) {
      console.error("Error logging in:", error);
      res.status(500).json({ success: false, message: "Database error" });
    }
  });

  // POST /api/auth/register - Register new user
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { fullName, memberId, email, password, phoneNumber } = req.body;
      
      if (!fullName || !memberId || !email || !password) {
        return res.status(400).json({ 
          success: false, 
          message: "Full name, member ID, email, and password are required" 
        });
      }
      
      const pool = await getConnection();
      
      // Cek email duplikat
      const checkEmail = await pool.request()
        .input("email", sql.NVarChar, email)
        .query("SELECT id FROM users WHERE email = @email");
      
      if (checkEmail.recordset.length > 0) {
        return res.status(400).json({ success: false, message: "Email already registered" });
      }
      
      // Cek member ID duplikat
      const checkMemberId = await pool.request()
        .input("memberId", sql.NVarChar, memberId)
        .query("SELECT id FROM users WHERE member_id = @memberId");
      
      if (checkMemberId.recordset.length > 0) {
        return res.status(400).json({ success: false, message: "Member ID already exists" });
      }
      
      const hashedPassword = await bcrypt.hash(password, 10);
      
      await pool.request()
        .input("fullName", sql.NVarChar, fullName)
        .input("memberId", sql.NVarChar, memberId)
        .input("email", sql.NVarChar, email)
        .input("password", sql.NVarChar, hashedPassword)
        .input("phoneNumber", sql.NVarChar, phoneNumber || null)
        .query(`
          INSERT INTO users (full_name, member_id, email, password_hash, role, phone_number, is_active, email_verified, created_at)
          VALUES (@fullName, @memberId, @email, @password, 'member', @phoneNumber, 1, 0, GETDATE())
        `);
      
      res.status(201).json({ success: true, message: "Registration successful. Please login." });
    } catch (error) {
      console.error("Error registering user:", error);
      res.status(500).json({ success: false, message: "Database error" });
    }
  });

  // POST /api/auth/logout - Logout user
  app.post("/api/auth/logout",async (req, res) => {
    try {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      
      const pool = await getConnection();
      await pool.request()
        .input("accessToken", sql.NVarChar, token)
        .query("DELETE FROM sessions WHERE access_token = @accessToken");
      
      res.json({ success: true, message: "Logged out successfully" });
    } catch (error) {
      console.error("Error logging out:", error);
      res.status(500).json({ success: false, message: "Database error" });
    }
  });

  // POST /api/auth/forgot-password - Request password reset
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ success: false, message: "Email is required" });
      }
      
      const pool = await getConnection();
      const user = await pool.request()
        .input("email", sql.NVarChar, email)
        .query("SELECT id FROM users WHERE email = @email");
      
      if (user.recordset.length === 0) {
        // For security, don't reveal if email exists
        return res.json({ success: true, message: "If email exists, reset code has been sent" });
      }
      
      // Generate 6-digit reset code
      const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      
      // Delete old reset codes
      await pool.request()
        .input("userId", sql.Int, user.recordset[0].id)
        .query("DELETE FROM password_resets WHERE user_id = @userId");
      
      // Save new reset code
      await pool.request()
        .input("userId", sql.Int, user.recordset[0].id)
        .input("resetCode", sql.NVarChar, resetCode)
        .input("expiresAt", sql.DateTime, expiresAt)
        .query(`
          INSERT INTO password_resets (user_id, reset_code, expires_at, created_at)
          VALUES (@userId, @resetCode, @expiresAt, GETDATE())
        `);
      
      // In production, send email here
      console.log(`Reset code for ${email}: ${resetCode}`);
      
      res.json({ success: true, message: "Reset code sent to your email" });
    } catch (error) {
      console.error("Error sending reset code:", error);
      res.status(500).json({ success: false, message: "Database error" });
    }
  });

  // POST /api/auth/verify-reset-code - Verify reset code
  app.post("/api/auth/verify-reset-code", async (req, res) => {
    try {
      const { email, code } = req.body;
      
      if (!email || !code) {
        return res.status(400).json({ success: false, message: "Email and code are required" });
      }
      
      const pool = await getConnection();
      const result = await pool.request()
        .input("email", sql.NVarChar, email)
        .input("code", sql.NVarChar, code)
        .query(`
          SELECT pr.* FROM password_resets pr
          JOIN users u ON pr.user_id = u.id
          WHERE u.email = @email 
            AND pr.reset_code = @code 
            AND pr.is_used = 0 
            AND pr.expires_at > GETDATE()
        `);
      
      if (result.recordset.length === 0) {
        return res.status(400).json({ success: false, message: "Invalid or expired reset code" });
      }
      
      res.json({ success: true, message: "Code verified successfully" });
    } catch (error) {
      console.error("Error verifying code:", error);
      res.status(500).json({ success: false, message: "Database error" });
    }
  });

  // POST /api/auth/reset-password - Reset password
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { email, code, newPassword } = req.body;
      
      if (!email || !code || !newPassword) {
        return res.status(400).json({ success: false, message: "Email, code, and new password are required" });
      }
      
      if (newPassword.length < 8) {
        return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
      }
      
      const pool = await getConnection();
      
      // Verify reset code
      const resetRecord = await pool.request()
        .input("email", sql.NVarChar, email)
        .input("code", sql.NVarChar, code)
        .query(`
          SELECT pr.id, pr.user_id FROM password_resets pr
          JOIN users u ON pr.user_id = u.id
          WHERE u.email = @email 
            AND pr.reset_code = @code 
            AND pr.is_used = 0 
            AND pr.expires_at > GETDATE()
        `);
      
      if (resetRecord.recordset.length === 0) {
        return res.status(400).json({ success: false, message: "Invalid or expired reset code" });
      }
      
      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      // Update password
      await pool.request()
        .input("userId", sql.Int, resetRecord.recordset[0].user_id)
        .input("password", sql.NVarChar, hashedPassword)
        .query("UPDATE users SET password_hash = @password WHERE id = @userId");
      
      // Mark reset code as used
      await pool.request()
        .input("resetId", sql.Int, resetRecord.recordset[0].id)
        .query("UPDATE password_resets SET is_used = 1 WHERE id = @resetId");
      
      // Delete all sessions for this user
      await pool.request()
        .input("userId", sql.Int, resetRecord.recordset[0].user_id)
        .query("DELETE FROM sessions WHERE user_id = @userId");
      
      res.json({ success: true, message: "Password reset successfully" });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ success: false, message: "Database error" });
    }
  });

  // POST /api/auth/refresh - Refresh token
  app.post("/api/auth/refresh", async (req, res) => {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(400).json({ success: false, message: "Refresh token is required" });
      }
      
      const pool = await getConnection();
      const session = await pool.request()
        .input("refreshToken", sql.NVarChar, refreshToken)
        .query(`
          SELECT s.*, u.id as user_id, u.email, u.role
          FROM sessions s
          JOIN users u ON s.user_id = u.id
          WHERE s.refresh_token = @refreshToken AND s.expires_at > GETDATE()
        `);
      
      if (session.recordset.length === 0) {
        return res.status(401).json({ success: false, message: "Invalid or expired refresh token" });
      }
      
      // Generate new access token
      const newAccessToken = jwt.sign(
        { id: session.recordset[0].user_id, email: session.recordset[0].email, role: session.recordset[0].role },
        process.env.JWT_SECRET || 'secret_key',
        { expiresIn: '24h' }
      );
      
      // Update session
      await pool.request()
        .input("sessionId", sql.Int, session.recordset[0].id)
        .input("newAccessToken", sql.NVarChar, newAccessToken)
        .input("newExpiresAt", sql.DateTime, new Date(Date.now() + 24 * 60 * 60 * 1000))
        .query(`
          UPDATE sessions 
          SET access_token = @newAccessToken, 
              expires_at = @newExpiresAt, 
              last_activity = GETDATE()
          WHERE id = @sessionId
        `);
      
      res.json({ accessToken: newAccessToken });
    } catch (error) {
      console.error("Error refreshing token:", error);
      res.status(500).json({ success: false, message: "Database error" });
    }
  });

  // ============ DASHBOARD ROUTES ============
  
  // GET /api/dashboard/stats - Get dashboard statistics
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const pool = await getConnection();
      
      const totalMembers = await pool.request()
        .query("SELECT COUNT(*) as count FROM users WHERE role = 'member' AND is_active = 1");
      
      const activeEvents = await pool.request()
        .query("SELECT COUNT(*) as count FROM events WHERE is_active = 1");
      
      const today = new Date().toISOString().split('T')[0];
      const todayAttendance = await pool.request()
        .input("today", sql.Date, today)
        .query(`
          SELECT 
            COUNT(CASE WHEN status IN ('present', 'late') THEN 1 END) as checkedIn,
            COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent
          FROM attendance
          WHERE attendance_date = @today
        `);
      
      res.json({ 
        success: true, 
        data: {
          totalMembers: totalMembers.recordset[0].count,
          activeEvents: activeEvents.recordset[0].count,
          todayAttendance: {
            checkedIn: todayAttendance.recordset[0].checkedIn || 0,
            pending: 0,
            absent: todayAttendance.recordset[0].absent || 0
          },
          attendanceRate: 85.5 // Can be calculated from historical data
        }
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ success: false, message: "Database error" });
    }
  });

  // GET /api/dashboard/activities - Get recent activities
  app.get("/api/dashboard/activities", async (req, res) => {
    try {
      const { limit = 10 } = req.query;
      const pool = await getConnection();
      
      const result = await pool.request()
        .input("limit", sql.Int, limit)
        .query(`
          SELECT TOP (@limit) 
            al.*, 
            u.full_name as user_name
          FROM activity_logs al
          LEFT JOIN users u ON al.user_id = u.id
          ORDER BY al.created_at DESC
        `);
      
      res.json({ success: true, data: result.recordset });
    } catch (error) {
      console.error("Error fetching activities:", error);
      res.status(500).json({ success: false, message: "Database error" });
    }
  });

  // ============ REPORTS ROUTES ============
  
  // POST /api/reports/generate - Generate report
  app.post("/api/reports/generate", async (req, res) => {
    try {
      const { reportType, eventId, period, format } = req.body;
      
      // Log report generation
      const pool = await getConnection();
      await pool.request()
        .input("userId", sql.Int, req.user.id)
        .input("action", sql.NVarChar, "GENERATE_REPORT")
        .input("entityType", sql.NVarChar, "report")
        .input("description", sql.NVarChar, `Generated ${reportType} report`)
        .query(`
          INSERT INTO activity_logs (user_id, action, entity_type, description, created_at)
          VALUES (@userId, @action, @entityType, @description, GETDATE())
        `);
      
      res.json({ 
        success: true, 
        data: { 
          id: `report_${Date.now()}`,
          message: "Report generation started",
          downloadUrl: `/api/reports/${Date.now()}/download`
        }
      });
    } catch (error) {
      console.error("Error generating report:", error);
      res.status(500).json({ success: false, message: "Database error" });
    }
  });

  // GET /api/reports - Get all reports
  app.get("/api/reports", async (req, res) => {
    try {
      // For now, return empty array since reports are generated asynchronously
      res.json({ success: true, data: [] });
    } catch (error) {
      console.error("Error fetching reports:", error);
      res.status(500).json({ success: false, message: "Database error" });
    }
  });

  // GET /api/reports/:id/download - Download report
  app.get("/api/reports/:id/download", async (req, res) => {
    try {
      // In production, generate and stream the file
      res.json({ success: true, message: "Download ready" });
    } catch (error) {
      console.error("Error downloading report:", error);
      res.status(500).json({ success: false, message: "Database error" });
    }
  });

  // DELETE /api/reports/:id - Delete report
  app.delete("/api/reports/:id", async (req, res) => {
    try {
      res.json({ success: true, message: "Report deleted successfully" });
    } catch (error) {
      console.error("Error deleting report:", error);
      res.status(500).json({ success: false, message: "Database error" });
    }
  });

  // ============ SETTINGS ROUTES ============
  
  // GET /api/settings/profile - Get user profile
  app.get("/api/settings/profile", async (req, res) => {
    try {
      const pool = await getConnection();
      const result = await pool.request()
        .input("userId", sql.Int, req.user.id)
        .query(`
          SELECT id, full_name, email, phone_number, role, member_id, created_at
          FROM users
          WHERE id = @userId
        `);
      
      res.json({ success: true, data: result.recordset[0] });
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ success: false, message: "Database error" });
    }
  });

  // PUT /api/settings/profile - Update user profile
  app.put("/api/settings/profile", async (req, res) => {
    try {
      const { fullName, email, phoneNumber } = req.body;
      const pool = await getConnection();
      
      await pool.request()
        .input("userId", sql.Int, req.user.id)
        .input("fullName", sql.NVarChar, fullName)
        .input("email", sql.NVarChar, email)
        .input("phoneNumber", sql.NVarChar, phoneNumber || null)
        .query(`
          UPDATE users 
          SET full_name = @fullName, 
              email = @email, 
              phone_number = @phoneNumber
          WHERE id = @userId
        `);
      
      res.json({ success: true, message: "Profile updated successfully" });
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ success: false, message: "Database error" });
    }
  });

  // POST /api/settings/change-password - Change password
  app.post("/api/settings/change-password", async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const pool = await getConnection();
      
      // Get current password hash
      const user = await pool.request()
        .input("userId", sql.Int, req.user.id)
        .query("SELECT password_hash FROM users WHERE id = @userId");
      
      const validPassword = await bcrypt.compare(currentPassword, user.recordset[0].password_hash);
      
      if (!validPassword) {
        return res.status(400).json({ success: false, message: "Current password is incorrect" });
      }
      
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      await pool.request()
        .input("userId", sql.Int, req.user.id)
        .input("password", sql.NVarChar, hashedPassword)
        .query("UPDATE users SET password_hash = @password WHERE id = @userId");
      
      res.json({ success: true, message: "Password changed successfully" });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ success: false, message: "Database error" });
    }
  });

  // GET /api/settings/system - Get system settings
  app.get("/api/settings/system", async (req, res) => {
    try {
      const pool = await getConnection();
      const result = await pool.request()
        .query("SELECT setting_key, setting_value, setting_type FROM system_settings");
      
      const settings: Record<string, any> = {};
      result.recordset.forEach((row: any) => {
        let value: any = row.setting_value;
        if (row.setting_type === 'boolean') {
          value = value === 'true';
        } else if (row.setting_type === 'integer') {
          value = parseInt(value);
        }
        settings[row.setting_key] = value;
      });
      
      res.json({ success: true, data: settings });
    } catch (error) {
      console.error("Error fetching system settings:", error);
      res.status(500).json({ success: false, message: "Database error" });
    }
  });

  // PUT /api/settings/system - Update system settings
  app.put("/api/settings/system", async (req, res) => {
    try {
      const settings = req.body;
      const pool = await getConnection();
      
      for (const [key, value] of Object.entries(settings)) {
        await pool.request()
          .input("key", sql.NVarChar, key)
          .input("value", sql.NVarChar, String(value))
          .query(`
            UPDATE system_settings 
            SET setting_value = @value, updated_at = GETDATE()
            WHERE setting_key = @key
          `);
      }
      
      res.json({ success: true, message: "System settings updated successfully" });
    } catch (error) {
      console.error("Error updating system settings:", error);
      res.status(500).json({ success: false, message: "Database error" });
    }
  });

  // GET /api/settings/activity-logs - Get activity logs
  app.get("/api/settings/activity-logs", async (req, res) => {
    try {
      const { limit = 50, offset = 0 } = req.query;
      const pool = await getConnection();
      
      const result = await pool.request()
        .input("limit", sql.Int, limit)
        .input("offset", sql.Int, offset)
        .query(`
          SELECT 
            al.*, 
            u.full_name as user_name
          FROM activity_logs al
          LEFT JOIN users u ON al.user_id = u.id
          ORDER BY al.created_at DESC
          OFFSET @offset ROWS
          FETCH NEXT @limit ROWS ONLY
        `);
      
      res.json({ success: true, data: result.recordset });
    } catch (error) {
      console.error("Error fetching activity logs:", error);
      res.status(500).json({ success: false, message: "Database error" });
    }
  });

  // ============ EXISTING ROUTES ============
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // ============ 404 HANDLER (for API) ============
  app.use((req, res, next) => {
    if (req.path.startsWith("/api/")) {
      res.status(404).json({ error: `API endpoint ${req.method} ${req.path} not found` });
    } else {
      next();
    }
  });

  return app;
}