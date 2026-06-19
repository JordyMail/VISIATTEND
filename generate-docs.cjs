const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
  VerticalAlign, LevelFormat, PageNumber, PageBreak, TabStopType,
  TabStopPosition, Header, Footer
} = require("docx");
const fs = require("fs");

// ─── Color Palette ──────────────────────────────────────────────────────────
const C = {
  primary:   "1E3A5F",   // dark navy blue
  accent:    "2E75B6",   // medium blue
  light:     "D5E8F0",   // light blue fill
  header:    "1E3A5F",   // table header bg
  headerTxt: "FFFFFF",
  rowAlt:    "EBF4FB",
  border:    "BBCFE8",
  green:     "1F6B3B",
  greenBg:   "D6EDDF",
  orange:    "7B3D00",
  orangeBg:  "FDE9D5",
  gray:      "5A5A5A",
  black:     "000000",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const borders = (color = C.border) => {
  const s = { style: BorderStyle.SINGLE, size: 1, color };
  return { top: s, bottom: s, left: s, right: s };
};

const cellMargins = { top: 100, bottom: 100, left: 120, right: 120 };

function hdrCell(text, widthDxa, span = 1) {
  return new TableCell({
    borders: borders(C.accent),
    width: { size: widthDxa, type: WidthType.DXA },
    shading: { fill: C.header, type: ShadingType.CLEAR },
    margins: cellMargins,
    columnSpan: span,
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text, bold: true, color: C.headerTxt, size: 20, font: "Arial" })]
    })]
  });
}

function bodyCell(text, widthDxa, opts = {}) {
  const { bold = false, color = C.black, bg = "FFFFFF", align = AlignmentType.LEFT, mono = false } = opts;
  return new TableCell({
    borders: borders(C.border),
    width: { size: widthDxa, type: WidthType.DXA },
    shading: { fill: bg, type: ShadingType.CLEAR },
    margins: cellMargins,
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({
      alignment: align,
      children: [new TextRun({ text: String(text), bold, color, size: 19, font: mono ? "Courier New" : "Arial" })]
    })]
  });
}

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
    children: [new TextRun({ text, bold: true, color: C.primary, size: 36, font: "Arial" })],
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: C.accent, space: 4 } },
  });
}
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 150 },
    children: [new TextRun({ text, bold: true, color: C.accent, size: 28, font: "Arial" })],
  });
}
function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 100 },
    children: [new TextRun({ text, bold: true, color: C.primary, size: 24, font: "Arial" })],
  });
}
function para(text, opts = {}) {
  const { bold = false, color = C.black, italic = false, size = 22 } = opts;
  return new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({ text, bold, color, italic, size, font: "Arial" })],
  });
}
function code(text) {
  return new Paragraph({
    spacing: { after: 60 },
    indent: { left: 360 },
    children: [new TextRun({ text, font: "Courier New", size: 18, color: "1A1A1A" })],
    shading: { fill: "F5F5F5", type: ShadingType.CLEAR },
  });
}
function bullet(text, bold = false) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { after: 80 },
    children: [new TextRun({ text, bold, size: 22, font: "Arial" })],
  });
}
function numbered(text) {
  return new Paragraph({
    numbering: { reference: "numbers", level: 0 },
    spacing: { after: 80 },
    children: [new TextRun({ text, size: 22, font: "Arial" })],
  });
}
function spacer(before = 100, after = 100) {
  return new Paragraph({ spacing: { before, after }, children: [] });
}
function divider() {
  return new Paragraph({
    spacing: { before: 200, after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.border, space: 2 } },
    children: [],
  });
}
function note(text) {
  return new Paragraph({
    spacing: { before: 100, after: 100 },
    indent: { left: 360, right: 360 },
    shading: { fill: C.orangeBg, type: ShadingType.CLEAR },
    border: {
      left: { style: BorderStyle.SINGLE, size: 12, color: C.accent, space: 8 }
    },
    children: [new TextRun({ text: `📝 Note: ${text}`, size: 20, italic: true, font: "Arial", color: C.primary })],
  });
}
function callout(text, icon = "ℹ️") {
  return new Paragraph({
    spacing: { before: 100, after: 100 },
    indent: { left: 360, right: 360 },
    shading: { fill: C.light, type: ShadingType.CLEAR },
    children: [new TextRun({ text: `${icon} ${text}`, size: 20, font: "Arial", color: C.primary })],
  });
}

// ─── Title Page ───────────────────────────────────────────────────────────────
function makeTitlePage() {
  return [
    spacer(1440, 200),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "VISIATTEND", bold: true, size: 72, color: C.primary, font: "Arial" })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: "Visual Intelligent Attendance System", size: 36, color: C.accent, font: "Arial" })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 800 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: C.accent, space: 8 } },
      children: [],
    }),
    spacer(600, 200),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [new TextRun({ text: "CAPSTONE PROJECT DOCUMENTATION", bold: true, size: 32, color: C.primary, font: "Arial" })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [new TextRun({ text: "Form 3, Part B — Hierarchical/Iterative Design", size: 26, color: C.gray, font: "Arial" })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [new TextRun({ text: "Design Implementation: Functions, Procedures, Classes & Database", size: 24, italic: true, color: C.accent, font: "Arial" })],
    }),
    spacer(600, 200),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [new TextRun({ text: "Organization: RESC (Reformed Evangelical Student Center)", size: 22, font: "Arial", color: C.gray })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [new TextRun({ text: "Supervised by: GRII Cikarang", size: 22, font: "Arial", color: C.gray })],
    }),
    spacer(1200, 0),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "2026", bold: true, size: 28, color: C.primary, font: "Arial" })],
    }),
  ];
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1 — Functions / Procedures / Classes
// ═══════════════════════════════════════════════════════════════════════════════

function makeSection1() {
  const content = [];

  content.push(h1("1. Functions / Procedure / Class Implementation"));
  content.push(para(
    "This section explains the key functions, procedures, and class-level structures implemented in VISIATTEND, " +
    "organized according to the hierarchical/iterative design described in Form 3 Part B. The system uses a " +
    "three-tier architecture: React/TypeScript frontend, Express/Node.js backend (TypeScript), and a " +
    "Python AI bridge for face recognition.",
    { color: C.gray }
  ));
  content.push(spacer(100, 100));

  // ─── 1.1 Authentication ───────────────────────────────────────────────────
  content.push(h2("1.1 Authentication Module (Auth Functions)"));
  content.push(para(
    "The authentication module handles user login, registration, session management, and password recovery. " +
    "All auth endpoints are located in server/index.ts under the /api/auth prefix."
  ));

  content.push(h3("1.1.1 Login Function — POST /api/auth/login"));
  content.push(para("Purpose: Verifies credentials, issues JWT tokens, and records the session in the database."));
  content.push(callout("File: server/index.ts | Route: POST /api/auth/login", "📁"));
  content.push(spacer(80, 80));

  content.push(new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2000, 7360],
    rows: [
      new TableRow({ children: [hdrCell("Step", 2000), hdrCell("What Happens", 7360)] }),
      new TableRow({ children: [bodyCell("1. Input Validation", 2000, { bold: true, bg: C.rowAlt }), bodyCell("Checks that both email and password are provided in req.body. Returns HTTP 400 if missing.", 7360)] }),
      new TableRow({ children: [bodyCell("2. Database Lookup", 2000, { bold: true }), bodyCell("Queries the users table WHERE email = @e (case-insensitive). Returns 401 if not found.", 7360)] }),
      new TableRow({ children: [bodyCell("3. Account Status", 2000, { bold: true, bg: C.rowAlt }), bodyCell("Checks is_active flag. Deactivated accounts receive a descriptive 401 error.", 7360)] }),
      new TableRow({ children: [bodyCell("4. Password Verify", 2000, { bold: true }), bodyCell("bcrypt.compare() hashes the input and compares with stored password_hash. Returns 401 on mismatch.", 7360)] }),
      new TableRow({ children: [bodyCell("5. JWT Token", 2000, { bold: true, bg: C.rowAlt }), bodyCell("jwt.sign() creates a 24-hour access token containing { id, email, role }. The same token is used as the refresh token.", 7360)] }),
      new TableRow({ children: [bodyCell("6. Session Record", 2000, { bold: true }), bodyCell("Inserts a row into the sessions table with the token, expiry date, IP address, and user agent.", 7360)] }),
      new TableRow({ children: [bodyCell("7. Activity Log", 2000, { bold: true, bg: C.rowAlt }), bodyCell("Calls the internal log() function to record the LOGIN event in activity_logs.", 7360)] }),
      new TableRow({ children: [bodyCell("8. Response", 2000, { bold: true }), bodyCell("Returns { accessToken, refreshToken, user: { id, full_name, email, role, jabatan, division, permissions[] } }.", 7360)] }),
    ]
  }));
  content.push(spacer(100, 100));

  content.push(h3("Key Code Snippet — Login"));
  content.push(code("const passwordMatch = await bcrypt.compare(password, user.password_hash);"));
  content.push(code("if (!passwordMatch) return res.status(401).json({ success: false, message: 'Invalid email or password' });"));
  content.push(code(""));
  content.push(code("const token = jwt.sign("));
  content.push(code("  { id: user.id, email: user.email, role: user.role },"));
  content.push(code("  process.env.JWT_SECRET || 'secret_key',"));
  content.push(code("  { expiresIn: '24h' }"));
  content.push(code(");"));
  content.push(spacer(100, 80));
  content.push(note("bcrypt.compare() is a one-way hash comparison — the plain-text password is never stored anywhere."));

  content.push(spacer(150, 100));
  content.push(h3("1.1.2 Register Function — POST /api/auth/register"));
  content.push(para("Purpose: Creates a new user account with role 'user', auto-generates member_id, hashes the password, and persists to the database."));

  content.push(new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2400, 6960],
    rows: [
      new TableRow({ children: [hdrCell("Validation Rule", 2400), hdrCell("Detail", 6960)] }),
      new TableRow({ children: [bodyCell("fullName, email, password required", 2400, { bg: C.rowAlt }), bodyCell("HTTP 400 returned if any field is missing.", 6960)] }),
      new TableRow({ children: [bodyCell("Password length ≥ 8 chars", 2400), bodyCell("Enforced at the server level before hashing.", 6960)] }),
      new TableRow({ children: [bodyCell("Unique email check", 2400, { bg: C.rowAlt }), bodyCell("SELECT id FROM users WHERE email=@e — returns 400 if duplicate found.", 6960)] }),
      new TableRow({ children: [bodyCell("Auto member_id", 2400), bodyCell("Generated as USR + zero-padded count, e.g., USR0042. Guarantees uniqueness.", 6960)] }),
      new TableRow({ children: [bodyCell("Password hashing", 2400, { bg: C.rowAlt }), bodyCell("bcrypt.hash(password, 12) — 12 salt rounds for security.", 6960)] }),
    ]
  }));

  content.push(spacer(200, 100));
  content.push(h3("1.1.3 Password Reset Flow — 3-Step Procedure"));
  content.push(para("The password reset is a three-step iterative process implementing OTP (One-Time Password) verification:"));
  content.push(spacer(60, 60));

  content.push(new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [1440, 2800, 5120],
    rows: [
      new TableRow({ children: [hdrCell("Step", 1440), hdrCell("Endpoint", 2800), hdrCell("Logic", 5120)] }),
      new TableRow({ children: [
        bodyCell("Step 1", 1440, { bold: true, bg: C.rowAlt }),
        bodyCell("POST /api/auth/forgot-password", 2800, { mono: true, bg: C.rowAlt }),
        bodyCell("Looks up user by email → generates 6-digit OTP (Math.random) → inserts into password_resets table with 1-hour expiry → logs code to console in development.", 5120, { bg: C.rowAlt }),
      ]}),
      new TableRow({ children: [
        bodyCell("Step 2", 1440, { bold: true }),
        bodyCell("POST /api/auth/verify-reset-code", 2800, { mono: true }),
        bodyCell("Validates the code against password_resets WHERE is_used=0 AND expires_at > NOW(). Returns 400 if invalid or expired.", 5120),
      ]}),
      new TableRow({ children: [
        bodyCell("Step 3", 1440, { bold: true, bg: C.rowAlt }),
        bodyCell("POST /api/auth/reset-password", 2800, { mono: true, bg: C.rowAlt }),
        bodyCell("Verifies code again → bcrypt.hash(newPassword, 12) → UPDATE users SET password_hash=@pw → marks reset as is_used=1 → DELETE FROM sessions (invalidates all active logins).", 5120, { bg: C.rowAlt }),
      ]}),
    ]
  }));

  content.push(spacer(200, 100));
  divider();

  // ─── 1.2 RBAC Middleware ──────────────────────────────────────────────────
  content.push(h2("1.2 Role-Based Access Control (RBAC) Middleware"));
  content.push(para(
    "Defined in server/middleware/rbac.ts, the RBAC module provides reusable Express middleware functions " +
    "that protect API routes based on user roles and ownership."
  ));
  content.push(callout("File: server/middleware/rbac.ts", "📁"));
  content.push(spacer(80, 80));

  content.push(h3("1.2.1 authenticateToken Middleware"));
  content.push(para("Extracts the Bearer token from the Authorization header, verifies it using jwt.verify(), and attaches the decoded payload to req.user. Every protected route uses this middleware first."));

  content.push(code("export const authenticateToken = (req, res, next) => {"));
  content.push(code("  const token = req.headers['authorization']?.split(' ')[1];"));
  content.push(code("  if (!token) return res.status(401).json({ message: 'Access token required' });"));
  content.push(code("  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {"));
  content.push(code("    if (err) return res.status(403).json({ message: 'Invalid or expired token' });"));
  content.push(code("    req.user = user;  // { id, email, role }"));
  content.push(code("    next();"));
  content.push(code("  });"));
  content.push(code("};"));
  content.push(spacer(100, 80));

  content.push(h3("1.2.2 Role Guard Functions"));
  content.push(para("Three pre-built role guards are exported for convenience:"));

  content.push(new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2400, 3200, 3760],
    rows: [
      new TableRow({ children: [hdrCell("Function", 2400), hdrCell("Allowed Roles", 3200), hdrCell("Usage Example", 3760)] }),
      new TableRow({ children: [bodyCell("requireSuperAdmin", 2400, { mono: true, bg: C.rowAlt }), bodyCell("super_admin only", 3200, { bg: C.rowAlt }), bodyCell("DELETE /api/users/:id, system settings", 3760, { bg: C.rowAlt })] }),
      new TableRow({ children: [bodyCell("requireAdmin", 2400, { mono: true }), bodyCell("super_admin, admin", 3200), bodyCell("CRUD members, events, attendance, reports", 3760)] }),
      new TableRow({ children: [bodyCell("requireAnyRole", 2400, { mono: true, bg: C.rowAlt }), bodyCell("super_admin, admin, user", 3200, { bg: C.rowAlt }), bodyCell("View schedules, announcements, leaderboard", 3760, { bg: C.rowAlt })] }),
      new TableRow({ children: [bodyCell("requireSelfOrAdmin", 2400, { mono: true }), bodyCell("Own resource OR admin", 3200), bodyCell("GET /api/users/:id (own profile)", 3760)] }),
    ]
  }));

  content.push(spacer(100, 80));
  content.push(h3("1.2.3 ROLE_PERMISSIONS Map"));
  content.push(para(
    "The ROLE_PERMISSIONS constant maps each role to an array of permission strings. These are returned in the " +
    "login response so the frontend can conditionally render UI elements without making extra API calls."
  ));
  content.push(code("export const ROLE_PERMISSIONS = {"));
  content.push(code("  super_admin: ['manage_system_settings', 'manage_roles', 'view_audit_logs',"));
  content.push(code("    'delete_any_user', 'manage_divisions', 'backup_database', ... /* 20 permissions */ ],"));
  content.push(code("  admin:       ['crud_users', 'crud_events', 'crud_attendance',"));
  content.push(code("    'export_reports', 'generate_qr', ... /* 15 permissions */ ],"));
  content.push(code("  user:        ['view_own_profile', 'self_checkin', 'view_own_attendance',"));
  content.push(code("    'view_leaderboard', 'view_schedules', 'view_announcements'],"));
  content.push(code("};"));
  content.push(spacer(80, 80));
  content.push(note("Super admin inherits all admin permissions plus system-level controls (divisions, audit logs, maintenance mode)."));

  content.push(spacer(200, 100));
  content.push(divider());

  // ─── 1.3 Activity Logger ─────────────────────────────────────────────────
  content.push(h2("1.3 Activity Logger Function — log()"));
  content.push(para(
    "A shared internal helper function used throughout the server to record every significant action " +
    "into the activity_logs table. It is designed to be non-fatal — failures are silently caught so " +
    "they never interrupt the main request flow."
  ));
  content.push(callout("File: server/index.ts — internal async helper function", "📁"));
  content.push(spacer(80, 80));

  content.push(code("async function log(pool, userId, action, entityType, entityId, desc, ip) {"));
  content.push(code("  try {"));
  content.push(code("    await pool.request()"));
  content.push(code("      .input('u', sql.Int, userId)"));
  content.push(code("      .input('a', sql.NVarChar, action)"));
  content.push(code("      .input('et', sql.NVarChar, entityType)"));
  content.push(code("      .input('ei', sql.Int, entityId)"));
  content.push(code("      .input('d', sql.NVarChar, desc.slice(0, 500))  // truncate for safety"));
  content.push(code("      .input('ip', sql.NVarChar, ip || null)"));
  content.push(code("      .query(`INSERT INTO activity_logs (...) VALUES (...)`);"));
  content.push(code("  } catch { /* non-fatal: never fails the parent request */ }"));
  content.push(code("}"));
  content.push(spacer(100, 80));

  content.push(new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2000, 7360],
    rows: [
      new TableRow({ children: [hdrCell("Parameter", 2000), hdrCell("Description", 7360)] }),
      new TableRow({ children: [bodyCell("pool", 2000, { mono: true, bg: C.rowAlt }), bodyCell("Active MSSQL connection pool — passed from the calling route handler.", 7360, { bg: C.rowAlt })] }),
      new TableRow({ children: [bodyCell("userId", 2000, { mono: true }), bodyCell("ID of the user who triggered the action. Null for system-generated events.", 7360)] }),
      new TableRow({ children: [bodyCell("action", 2000, { mono: true, bg: C.rowAlt }), bodyCell("Uppercase action code: LOGIN, CREATE_USER, MANUAL_ATTENDANCE, GENERATE_REPORT, etc.", 7360, { bg: C.rowAlt })] }),
      new TableRow({ children: [bodyCell("entityType", 2000, { mono: true }), bodyCell("The resource type: 'user', 'event', 'attendance', 'announcement', 'report'.", 7360)] }),
      new TableRow({ children: [bodyCell("entityId", 2000, { mono: true, bg: C.rowAlt }), bodyCell("The specific resource ID (nullable if the action doesn't target a single record).", 7360, { bg: C.rowAlt })] }),
      new TableRow({ children: [bodyCell("desc", 2000, { mono: true }), bodyCell("Human-readable description, e.g. 'Created event: Sunday Worship Service'. Truncated at 500 chars.", 7360)] }),
      new TableRow({ children: [bodyCell("ip", 2000, { mono: true, bg: C.rowAlt }), bodyCell("Caller's IP address from req.ip, stored for audit trail and security review.", 7360, { bg: C.rowAlt })] }),
    ]
  }));

  content.push(spacer(200, 100));
  content.push(divider());

  // ─── 1.4 Attendance Functions ─────────────────────────────────────────────
  content.push(h2("1.4 Attendance Module Functions"));
  content.push(para(
    "The attendance module is the core business logic of VISIATTEND. It contains six specialized endpoints, " +
    "organized so that specific named routes always come before the generic /:id route to avoid Express routing conflicts."
  ));

  content.push(h3("1.4.1 Self Check-in Procedure — POST /api/attendance/checkin"));
  content.push(para("Purpose: Allows authenticated users to record their own attendance, either by selecting an event or by entering a QR token. Automatically determines status (present vs. late) based on the schedule."));
  content.push(spacer(80, 80));

  content.push(new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [500, 2000, 6860],
    rows: [
      new TableRow({ children: [hdrCell("#", 500), hdrCell("Step", 2000), hdrCell("Logic", 6860)] }),
      new TableRow({ children: [bodyCell("1", 500, { align: AlignmentType.CENTER, bg: C.rowAlt }), bodyCell("QR Validation", 2000, { bold: true, bg: C.rowAlt }), bodyCell("If qrToken is provided, queries qr_tokens WHERE token=@t AND expires_at > NOW(). Extracts event_id from the token. Returns 400 if expired.", 6860, { bg: C.rowAlt })] }),
      new TableRow({ children: [bodyCell("2", 500, { align: AlignmentType.CENTER }), bodyCell("Duplicate Check", 2000, { bold: true }), bodyCell("SELECT id FROM attendance WHERE user_id=@uid AND event_id=@eid AND attendance_date=@d. Returns 400 if already checked in today.", 6860)] }),
      new TableRow({ children: [bodyCell("3", 500, { align: AlignmentType.CENTER, bg: C.rowAlt }), bodyCell("Lateness Calc", 2000, { bold: true, bg: C.rowAlt }), bodyCell("Reads lateness_threshold from system_settings (default 15 min). Queries schedules for the event/date to get start_time. Compares current time with threshold → sets status = 'present' or 'late'.", 6860, { bg: C.rowAlt })] }),
      new TableRow({ children: [bodyCell("4", 500, { align: AlignmentType.CENTER }), bodyCell("Insert Record", 2000, { bold: true }), bodyCell("INSERT INTO attendance with user_id, event_id, today's date, current datetime, computed status, and device_info = 'Self Check-in'.", 6860)] }),
      new TableRow({ children: [bodyCell("5", 500, { align: AlignmentType.CENTER, bg: C.rowAlt }), bodyCell("Response", 2000, { bold: true, bg: C.rowAlt }), bodyCell("Returns HTTP 201 with the inserted row plus { status, message } for the frontend to display.", 6860, { bg: C.rowAlt })] }),
    ]
  }));

  content.push(spacer(150, 100));
  content.push(h3("1.4.2 Attendance Trend Function — GET /api/attendance/trend"));
  content.push(para("Purpose: Returns daily attendance counts for the last N days, used to populate the trend chart on the admin dashboard."));
  content.push(code("SELECT CONVERT(NVARCHAR(10), attendance_date, 23) as attendance_date,"));
  content.push(code("       COUNT(*) as total,"));
  content.push(code("       SUM(CASE WHEN status IN ('present','late') THEN 1 ELSE 0 END) as present"));
  content.push(code("FROM attendance"));
  content.push(code("WHERE attendance_date >= DATEADD(DAY, -@days, GETDATE()) [AND event_id=@eid]"));
  content.push(code("GROUP BY attendance_date ORDER BY attendance_date"));
  content.push(spacer(80, 80));
  content.push(note("The optional eventId filter allows admins to see trends for a specific event rather than all events combined."));

  content.push(spacer(150, 100));
  content.push(h3("1.4.3 Leaderboard Function — GET /api/attendance/leaderboard"));
  content.push(para("Purpose: Ranks all active users by attendance percentage over a selected period. Returns data for both the user-facing leaderboard page and the admin leaderboard page."));

  content.push(new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [1600, 7760],
    rows: [
      new TableRow({ children: [hdrCell("period param", 1600), hdrCell("SQL DATEADD Translation", 7760)] }),
      new TableRow({ children: [bodyCell("week", 1600, { mono: true, bg: C.rowAlt }), bodyCell("DATEADD(DAY, -7, GETDATE()) → last 7 days", 7760, { mono: true, bg: C.rowAlt })] }),
      new TableRow({ children: [bodyCell("month", 1600, { mono: true }), bodyCell("DATEADD(DAY, -30, GETDATE()) → last 30 days", 7760, { mono: true })] }),
      new TableRow({ children: [bodyCell("semester", 1600, { mono: true, bg: C.rowAlt }), bodyCell("DATEADD(DAY, -180, GETDATE()) → last 180 days", 7760, { mono: true, bg: C.rowAlt })] }),
    ]
  }));
  content.push(spacer(80, 80));
  content.push(para("The attendance_percentage formula uses a safe division to avoid divide-by-zero:"));
  content.push(code("CAST(ROUND(CAST(COUNT(CASE WHEN status IN('present','late') THEN 1 END) AS FLOAT)"));
  content.push(code("  / NULLIF(COUNT(*), 0) * 100, 2) AS DECIMAL(5,2)) as attendance_percentage"));

  content.push(spacer(150, 100));
  content.push(h3("1.4.4 My Stats Function — GET /api/attendance/my/stats"));
  content.push(para("Purpose: Returns personal attendance summary and streak count for the logged-in user's dashboard."));
  content.push(para("The streak is calculated in JavaScript after querying the last 60 records ordered by most recent date:"));
  content.push(code("let streak = 0;"));
  content.push(code("for (const row of streakR.recordset) {   // ordered by attendance_date DESC"));
  content.push(code("  if (['present', 'late'].includes(row.status)) streak++;"));
  content.push(code("  else break;  // stops at first non-attendance"));
  content.push(code("}"));

  content.push(spacer(200, 100));
  content.push(divider());

  // ─── 1.5 QR Token Functions ───────────────────────────────────────────────
  content.push(h2("1.5 QR Token Module"));
  content.push(para(
    "The QR token module enables admins to generate time-limited codes that members can use for self check-in. " +
    "This provides an alternative to face recognition for situations where the camera is unavailable."
  ));

  content.push(h3("1.5.1 Generate QR Token — POST /api/qr/generate"));
  content.push(para("Generates a cryptographically secure random token and stores it in the database with an expiry time."));
  content.push(code("const token = crypto.randomBytes(32).toString('hex');  // 64-char hex string"));
  content.push(code("const expires = new Date(Date.now() + Number(expMin) * 60000);"));
  content.push(code(""));
  content.push(code("await pool.request()"));
  content.push(code("  .input('tok', sql.NVarChar, token)"));
  content.push(code("  .input('exp', sql.DateTime, expires)"));
  content.push(code("  .query('INSERT INTO qr_tokens (event_id, token, valid_date, expires_at, created_by) ...');"));
  content.push(spacer(80, 80));
  content.push(note("Expiry minutes defaults to the system setting qr_expiry_minutes (default 60). Admins can override per token."));

  content.push(spacer(200, 100));
  content.push(divider());

  // ─── 1.6 Reports Module ───────────────────────────────────────────────────
  content.push(h2("1.6 Reports Generation Function — POST /api/reports/generate"));
  content.push(para(
    "The reports module dynamically selects a SQL query based on the reportType parameter, executes it with " +
    "the specified period and optional event filter, and returns the raw row data to the frontend. " +
    "The frontend then exports it as CSV or triggers browser print for PDF."
  ));

  content.push(new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2800, 6560],
    rows: [
      new TableRow({ children: [hdrCell("reportType Value", 2800), hdrCell("Query Focus", 6560)] }),
      new TableRow({ children: [bodyCell("attendance-summary", 2800, { mono: true, bg: C.rowAlt }), bodyCell("All attendance columns including check-in time, check-out time, status, device info per member per event.", 6560, { bg: C.rowAlt })] }),
      new TableRow({ children: [bodyCell("lateness-report", 2800, { mono: true }), bodyCell("Filters WHERE status='late' only. Shows who arrived late and when.", 6560)] }),
      new TableRow({ children: [bodyCell("student-performance", 2800, { mono: true, bg: C.rowAlt }), bodyCell("Groups by user. Returns totals for present, late, absent, excused, sick, and computed attendance percentage.", 6560, { bg: C.rowAlt })] }),
      new TableRow({ children: [bodyCell("absence-analysis", 2800, { mono: true }), bodyCell("Groups by user AND event. Shows absent, excused, sick counts ordered by most absent first.", 6560)] }),
      new TableRow({ children: [bodyCell("class-statistics", 2800, { mono: true, bg: C.rowAlt }), bodyCell("Falls through to the default attendance-summary query (all columns, all statuses).", 6560, { bg: C.rowAlt })] }),
    ]
  }));

  content.push(spacer(200, 100));
  content.push(divider());

  // ─── 1.7 Python AI Bridge ─────────────────────────────────────────────────
  content.push(h2("1.7 Python AI Bridge — Face Recognition Module"));
  content.push(para(
    "The face-ai folder contains a Python subprocess bridge called by the Express backend for all AI operations. " +
    "The bridge is invoked via command-line using backend_bridge.py and communicates through stdin/stdout as JSON."
  ));
  content.push(callout("File: face-ai/app/backend_bridge.py", "📁"));
  content.push(spacer(80, 80));

  content.push(h3("1.7.1 FaceDetector Class (detector.py)"));
  content.push(para(
    "Wraps OpenCV's YuNet face detection model. Handles model loading, input size configuration, " +
    "and returns a list of Detection dataclass objects sorted by area descending (largest face first)."
  ));

  content.push(new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2400, 6960],
    rows: [
      new TableRow({ children: [hdrCell("Method / Attribute", 2400), hdrCell("Description", 6960)] }),
      new TableRow({ children: [bodyCell("__init__(model_path, ...)", 2400, { mono: true, bg: C.rowAlt }), bodyCell("Loads YuNet ONNX model via cv2.FaceDetectorYN_create(). Sets score_threshold=0.8, nms_threshold=0.3.", 6960, { bg: C.rowAlt })] }),
      new TableRow({ children: [bodyCell("detect(image)", 2400, { mono: true }), bodyCell("Sets input size to image dimensions. Calls detector.detect(). Parses raw float32 rows into Detection objects (x, y, w, h, score, 5 landmark points).", 6960)] }),
      new TableRow({ children: [bodyCell("get_primary_detection()", 2400, { mono: true, bg: C.rowAlt }), bodyCell("Returns detections[0] (largest face). Returns None if list is empty.", 6960, { bg: C.rowAlt })] }),
      new TableRow({ children: [bodyCell("draw(image, detections)", 2400, { mono: true }), bodyCell("Draws bounding boxes and landmark circles onto a copy of the image. Used in CLI mode for visual debugging.", 6960)] }),
    ]
  }));

  content.push(spacer(150, 100));
  content.push(h3("1.7.2 ArcFaceEmbedder Class (embedder.py)"));
  content.push(para(
    "Wraps the ArcFace ONNX model (w600k_r50.onnx) to extract normalized 512-dimensional face embeddings. " +
    "Face alignment is performed before embedding to normalize pose and position."
  ));

  content.push(new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2400, 6960],
    rows: [
      new TableRow({ children: [hdrCell("Method", 2400), hdrCell("Description", 6960)] }),
      new TableRow({ children: [bodyCell("align_face(image, landmarks)", 2400, { mono: true, bg: C.rowAlt }), bodyCell("Uses cv2.estimateAffinePartial2D() to compute a 2D affine transform from the 5 detected landmarks to the ArcFace canonical template. Warps to 112×112 pixels.", 6960, { bg: C.rowAlt })] }),
      new TableRow({ children: [bodyCell("embed(image, landmarks)", 2400, { mono: true }), bodyCell("Aligns face → creates normalized blob (mean=127.5, std=127.5) → runs through ArcFace network → L2-normalizes the 512-dim output vector.", 6960)] }),
      new TableRow({ children: [bodyCell("cosine_similarity(a, b)", 2400, { mono: true, bg: C.rowAlt }), bodyCell("Simple dot product of two L2-normalized vectors. Returns float in range [-1, 1]. Values ≥ 0.45 (threshold) indicate a match.", 6960, { bg: C.rowAlt })] }),
    ]
  }));

  content.push(spacer(150, 100));
  content.push(h3("1.7.3 Bridge Commands (backend_bridge.py)"));
  content.push(para("The bridge accepts a command as a CLI argument and reads JSON payload from stdin:"));

  content.push(new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2600, 6760],
    rows: [
      new TableRow({ children: [hdrCell("Command", 2600), hdrCell("What It Does", 6760)] }),
      new TableRow({ children: [bodyCell("preview-detection", 2600, { mono: true, bg: C.rowAlt }), bodyCell("Decodes base64 image → runs FaceDetector → returns { detected: bool, faceDetection: { confidence, box, landmarks } }.", 6760, { bg: C.rowAlt })] }),
      new TableRow({ children: [bodyCell("capture-registration", 2600, { mono: true }), bodyCell("Adds one face sample to a pending session (stored in JSON file). Requires 3 non-duplicate samples (similarity ≤ 0.985 with existing). Returns { sessionId, sampleCount, remainingCaptures }.", 6760)] }),
      new TableRow({ children: [bodyCell("finalize-registration", 2600, { mono: true, bg: C.rowAlt }), bodyCell("Reads the pending session, saves all 3 embeddings to storage/users/{userId}.json via EmbeddingStore, deletes the pending session file.", 6760, { bg: C.rowAlt })] }),
      new TableRow({ children: [bodyCell("verify", 2600, { mono: true }), bodyCell("Detects face → embeds → iterates all registered users, finds best cosine similarity. Returns { matched, matchedUserId, matchedName, confidence, code }. Threshold default = 0.45.", 6760)] }),
    ]
  }));

  content.push(spacer(80, 80));
  content.push(note("The REQUIRED_TRAINING_SAMPLES constant is set to 3. Three diverse face samples improve recognition accuracy under varying lighting and angles."));

  content.push(spacer(150, 100));
  content.push(h3("1.7.4 EmbeddingStore Class (store.py)"));
  content.push(para(
    "Manages persistent storage of face embeddings as JSON files in the storage/users/ directory. " +
    "Each user file contains metadata and an array of sample objects with their embeddings."
  ));
  content.push(code("# User file format: storage/users/{user_id}.json"));
  content.push(code("{"));
  content.push(code('  "user_id": "DAMDY-154078",'));
  content.push(code('  "name": "damdy",'));
  content.push(code('  "detector": "YuNet",'));
  content.push(code('  "embedder": "ArcFace",'));
  content.push(code('  "embedding_dim": 512,'));
  content.push(code('  "samples": [   // 3 samples per user'));
  content.push(code('    { "detector_score": 0.929, "bbox": {...}, "landmarks": [...], "embedding": [/* 512 floats */] },'));
  content.push(code("    ..."));
  content.push(code("  ]"));
  content.push(code("}"));

  content.push(spacer(200, 100));
  content.push(divider());

  // ─── 1.8 Frontend Auth & API Service ─────────────────────────────────────
  content.push(h2("1.8 Frontend Functions & Service Layer"));

  content.push(h3("1.8.1 Session Management (client/lib/auth.ts)"));
  content.push(para("The auth library manages the client-side session using localStorage and cookies. It uses CryptoJS AES encryption for the session object."));

  content.push(new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2200, 7160],
    rows: [
      new TableRow({ children: [hdrCell("Function", 2200), hdrCell("Purpose", 7160)] }),
      new TableRow({ children: [bodyCell("setSession(user, tokens)", 2200, { mono: true, bg: C.rowAlt }), bodyCell("Stores { user, accessToken, refreshToken, expiresAt, lastActivity } in localStorage under key 'session'. Also writes the refresh token to a secure cookie (7-day expiry).", 7160, { bg: C.rowAlt })] }),
      new TableRow({ children: [bodyCell("getSession()", 2200, { mono: true }), bodyCell("Reads and parses session from localStorage. Checks expiry — calls clearSession() if expired. Extends lastActivity timestamp on each read.", 7160)] }),
      new TableRow({ children: [bodyCell("clearSession()", 2200, { mono: true, bg: C.rowAlt }), bodyCell("Removes 'session' from localStorage and deletes the refreshToken cookie.", 7160, { bg: C.rowAlt })] }),
      new TableRow({ children: [bodyCell("refreshAccessToken(rt)", 2200, { mono: true }), bodyCell("Calls POST /api/auth/refresh with the refresh token. Patches the stored session with the new access token on success.", 7160)] }),
      new TableRow({ children: [bodyCell("isRole(...roles)", 2200, { mono: true, bg: C.rowAlt }), bodyCell("Reads the role from getSessionUser() and checks if it is included in the provided roles array. Used for conditional UI rendering.", 7160, { bg: C.rowAlt })] }),
    ]
  }));

  content.push(spacer(150, 100));
  content.push(h3("1.8.2 Axios API Service Layer (client/services/api.ts)"));
  content.push(para("A centralized Axios instance with request/response interceptors handles all HTTP communication with the backend. Named API objects (authApi, attendanceApi, etc.) group related endpoints."));

  content.push(code("// Axios interceptor — auto-attaches JWT token to every request"));
  content.push(code("api.interceptors.request.use((config) => {"));
  content.push(code("  const token = readToken('accessToken');  // reads from localStorage session"));
  content.push(code("  if (token) config.headers.Authorization = `Bearer ${token}`;"));
  content.push(code("  return config;"));
  content.push(code("});"));
  content.push(spacer(80, 80));
  content.push(code("// Response interceptor — auto-refreshes expired tokens"));
  content.push(code("api.interceptors.response.use(null, async (err) => {"));
  content.push(code("  if (err.response?.status === 401 && !orig._retry) {"));
  content.push(code("    // Calls /api/auth/refresh, patches localStorage, retries original request"));
  content.push(code("    // If refresh fails → clears session, redirects to /login"));
  content.push(code("  }"));
  content.push(code("});"));

  content.push(spacer(150, 100));
  content.push(h3("1.8.3 RouteGuard Component (client/components/guards/RouteGuard.tsx)"));
  content.push(para("A React component that wraps protected routes. It reads the current session and redirects unauthorized users."));
  content.push(code("// Usage in App.tsx:"));
  content.push(code('<Route path="/admin" element={'));
  content.push(code('  <RouteGuard requiredRoles={["super_admin", "admin"]}>'));
  content.push(code('    <AppLayout role="admin" />'));
  content.push(code('  </RouteGuard>'));
  content.push(code("} />"));
  content.push(spacer(80, 80));
  content.push(para("The guard reads the session, checks role inclusion, and navigates to the appropriate dashboard or /login if unauthorized. This implements client-side route protection that mirrors the server-side RBAC."));

  return content;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2 — Database Implementation
// ═══════════════════════════════════════════════════════════════════════════════

function makeSection2() {
  const content = [];

  content.push(h1("2. Database Implementation"));
  content.push(para(
    "VISIATTEND uses Microsoft SQL Server (MSSQL) as its relational database. The schema is defined in " +
    "server/db/schema.sql and migrated programmatically via server/db/migrate.ts (v1) and " +
    "server/db/migrate_v2.ts (v2). The database connection pool is managed in server/db/config.ts.",
    { color: C.gray }
  ));
  content.push(spacer(100, 100));

  // ─── 2.1 DB Config ────────────────────────────────────────────────────────
  content.push(h2("2.1 Database Connection Configuration"));
  content.push(callout("File: server/db/config.ts", "📁"));
  content.push(spacer(80, 80));
  content.push(para(
    "The getConnection() function implements a singleton connection pool pattern. The pool is created " +
    "only once and reused for all subsequent queries, minimizing connection overhead."
  ));

  content.push(code("const dbConfig: sql.config = {"));
  content.push(code("  user:     process.env.DB_USER,"));
  content.push(code("  password: process.env.DB_PASSWORD,"));
  content.push(code("  server:   process.env.DB_HOST || 'localhost',"));
  content.push(code("  database: process.env.DB_NAME,"));
  content.push(code("  port:     parseInt(process.env.DB_PORT || '1433'),"));
  content.push(code("  options:  { encrypt: false, trustServerCertificate: true },"));
  content.push(code("};"));
  content.push(spacer(80, 80));

  content.push(new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2400, 6960],
    rows: [
      new TableRow({ children: [hdrCell("Config Option", 2400), hdrCell("Purpose", 6960)] }),
      new TableRow({ children: [bodyCell("encrypt: false", 2400, { mono: true, bg: C.rowAlt }), bodyCell("Disables SSL encryption for local development. Should be set to true in production with a valid certificate.", 6960, { bg: C.rowAlt })] }),
      new TableRow({ children: [bodyCell("trustServerCertificate", 2400, { mono: true }), bodyCell("Allows self-signed certificates in the development environment.", 6960)] }),
      new TableRow({ children: [bodyCell("Singleton pool", 2400, { mono: true, bg: C.rowAlt }), bodyCell("The module-level 'pool' variable is null initially and created on first call. All routes share the same connection pool for efficiency.", 6960, { bg: C.rowAlt })] }),
    ]
  }));

  content.push(spacer(200, 100));
  content.push(divider());

  // ─── 2.2 Table Schemas ────────────────────────────────────────────────────
  content.push(h2("2.2 Table Schemas"));
  content.push(para("VISIATTEND's V2 schema consists of 11 tables. The following subsections describe each table, its columns, constraints, and relationships."));

  // users
  content.push(h3("2.2.1 Table: users"));
  content.push(para("Central table for all accounts. Supports three system roles (super_admin, admin, user) and organizational metadata (jabatan, division, avatar_url) added in V2 migration."));

  content.push(new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [1800, 1600, 900, 5060],
    rows: [
      new TableRow({ children: [hdrCell("Column", 1800), hdrCell("Data Type", 1600), hdrCell("Nullable", 900), hdrCell("Description", 5060)] }),
      new TableRow({ children: [bodyCell("id", 1800, { mono: true, bold: true, bg: C.rowAlt }), bodyCell("INT IDENTITY", 1600, { mono: true, bg: C.rowAlt }), bodyCell("NO", 900, { align: AlignmentType.CENTER, bg: C.rowAlt }), bodyCell("Primary key. Auto-incremented.", 5060, { bg: C.rowAlt })] }),
      new TableRow({ children: [bodyCell("full_name", 1800, { mono: true }), bodyCell("NVARCHAR(100)", 1600, { mono: true }), bodyCell("NO", 900, { align: AlignmentType.CENTER }), bodyCell("Member's full display name.", 5060)] }),
      new TableRow({ children: [bodyCell("member_id", 1800, { mono: true, bg: C.rowAlt }), bodyCell("NVARCHAR(50)", 1600, { mono: true, bg: C.rowAlt }), bodyCell("NO", 900, { align: AlignmentType.CENTER, bg: C.rowAlt }), bodyCell("Unique human-readable ID. Format: USR0001 or ADM0001. Generated on creation.", 5060, { bg: C.rowAlt })] }),
      new TableRow({ children: [bodyCell("email", 1800, { mono: true }), bodyCell("NVARCHAR(100)", 1600, { mono: true }), bodyCell("NO", 900, { align: AlignmentType.CENTER }), bodyCell("Unique. Used for login. Stored lowercase.", 5060)] }),
      new TableRow({ children: [bodyCell("password_hash", 1800, { mono: true, bg: C.rowAlt }), bodyCell("NVARCHAR(255)", 1600, { mono: true, bg: C.rowAlt }), bodyCell("NO", 900, { align: AlignmentType.CENTER, bg: C.rowAlt }), bodyCell("bcrypt hash (12 rounds). Never stored in plain text.", 5060, { bg: C.rowAlt })] }),
      new TableRow({ children: [bodyCell("role", 1800, { mono: true }), bodyCell("NVARCHAR(20)", 1600, { mono: true }), bodyCell("NO", 900, { align: AlignmentType.CENTER }), bodyCell("CHECK: super_admin | admin | user. Only super_admin can assign admin role.", 5060)] }),
      new TableRow({ children: [bodyCell("jabatan", 1800, { mono: true, bg: C.rowAlt }), bodyCell("NVARCHAR(50)", 1600, { mono: true, bg: C.rowAlt }), bodyCell("YES", 900, { align: AlignmentType.CENTER, bg: C.rowAlt }), bodyCell("Organizational position: preacher | ketua | wakil_ketua | kepala_divisi | member_divisi | peserta. Added in V2.", 5060, { bg: C.rowAlt })] }),
      new TableRow({ children: [bodyCell("division", 1800, { mono: true }), bodyCell("NVARCHAR(100)", 1600, { mono: true }), bodyCell("YES", 900, { align: AlignmentType.CENTER }), bodyCell("Name of the division the member belongs to. Free-text matching divisions.name. Added in V2.", 5060)] }),
      new TableRow({ children: [bodyCell("avatar_url", 1800, { mono: true, bg: C.rowAlt }), bodyCell("NVARCHAR(500)", 1600, { mono: true, bg: C.rowAlt }), bodyCell("YES", 900, { align: AlignmentType.CENTER, bg: C.rowAlt }), bodyCell("URL to profile photo. Added in V2.", 5060, { bg: C.rowAlt })] }),
      new TableRow({ children: [bodyCell("phone_number", 1800, { mono: true }), bodyCell("NVARCHAR(20)", 1600, { mono: true }), bodyCell("YES", 900, { align: AlignmentType.CENTER }), bodyCell("Optional contact number.", 5060)] }),
      new TableRow({ children: [bodyCell("is_active", 1800, { mono: true, bg: C.rowAlt }), bodyCell("BIT", 1600, { mono: true, bg: C.rowAlt }), bodyCell("NO", 900, { align: AlignmentType.CENTER, bg: C.rowAlt }), bodyCell("Default 1. Deactivated users cannot login. Used instead of hard delete to preserve referential integrity.", 5060, { bg: C.rowAlt })] }),
      new TableRow({ children: [bodyCell("last_login", 1800, { mono: true }), bodyCell("DATETIME", 1600, { mono: true }), bodyCell("YES", 900, { align: AlignmentType.CENTER }), bodyCell("Updated on each successful login via UPDATE users SET last_login=GETDATE().", 5060)] }),
      new TableRow({ children: [bodyCell("created_at", 1800, { mono: true, bg: C.rowAlt }), bodyCell("DATETIME", 1600, { mono: true, bg: C.rowAlt }), bodyCell("NO", 900, { align: AlignmentType.CENTER, bg: C.rowAlt }), bodyCell("Default GETDATE(). Creation timestamp.", 5060, { bg: C.rowAlt })] }),
    ]
  }));

  content.push(spacer(150, 100));

  // events
  content.push(h3("2.2.2 Table: events"));
  content.push(para("Stores RESC activities. Each event can have multiple attendance records, schedules, and QR tokens."));

  content.push(new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [1800, 1600, 900, 5060],
    rows: [
      new TableRow({ children: [hdrCell("Column", 1800), hdrCell("Data Type", 1600), hdrCell("Nullable", 900), hdrCell("Description", 5060)] }),
      new TableRow({ children: [bodyCell("id", 1800, { mono: true, bold: true, bg: C.rowAlt }), bodyCell("INT IDENTITY", 1600, { mono: true, bg: C.rowAlt }), bodyCell("NO", 900, { align: AlignmentType.CENTER, bg: C.rowAlt }), bodyCell("Primary key.", 5060, { bg: C.rowAlt })] }),
      new TableRow({ children: [bodyCell("event_code", 1800, { mono: true }), bodyCell("NVARCHAR(20)", 1600, { mono: true }), bodyCell("NO", 900, { align: AlignmentType.CENTER }), bodyCell("UNIQUE. Short uppercase identifier, e.g. W001, M002. Stored as uppercase.", 5060)] }),
      new TableRow({ children: [bodyCell("event_name", 1800, { mono: true, bg: C.rowAlt }), bodyCell("NVARCHAR(100)", 1600, { mono: true, bg: C.rowAlt }), bodyCell("NO", 900, { align: AlignmentType.CENTER, bg: C.rowAlt }), bodyCell("Full event name, e.g. 'Sunday Worship Service'.", 5060, { bg: C.rowAlt })] }),
      new TableRow({ children: [bodyCell("event_type", 1800, { mono: true }), bodyCell("NVARCHAR(20)", 1600, { mono: true }), bodyCell("NO", 900, { align: AlignmentType.CENTER }), bodyCell("CHECK: worship | meeting | study | fellowship | outreach.", 5060)] }),
      new TableRow({ children: [bodyCell("preacher_id", 1800, { mono: true, bg: C.rowAlt }), bodyCell("INT (FK)", 1600, { mono: true, bg: C.rowAlt }), bodyCell("YES", 900, { align: AlignmentType.CENTER, bg: C.rowAlt }), bodyCell("FK → users.id. ON DELETE SET NULL. The event continues to exist even if the preacher is removed.", 5060, { bg: C.rowAlt })] }),
      new TableRow({ children: [bodyCell("season", 1800, { mono: true }), bodyCell("NVARCHAR(50)", 1600, { mono: true }), bodyCell("YES", 900, { align: AlignmentType.CENTER }), bodyCell("Optional period label, e.g. '2024 Season'. Used for grouping in reports.", 5060)] }),
      new TableRow({ children: [bodyCell("is_active", 1800, { mono: true, bg: C.rowAlt }), bodyCell("BIT", 1600, { mono: true, bg: C.rowAlt }), bodyCell("NO", 900, { align: AlignmentType.CENTER, bg: C.rowAlt }), bodyCell("Default 1. Inactive events are excluded from check-in options.", 5060, { bg: C.rowAlt })] }),
    ]
  }));

  content.push(spacer(150, 100));

  // attendance
  content.push(h3("2.2.3 Table: attendance (Core Transaction Table)"));
  content.push(para(
    "The most frequently written table. Each row represents one member's attendance at one event on one date. " +
    "The UNIQUE constraint on (user_id, event_id, attendance_date) prevents duplicate check-ins."
  ));

  content.push(new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [1800, 1600, 900, 5060],
    rows: [
      new TableRow({ children: [hdrCell("Column", 1800), hdrCell("Data Type", 1600), hdrCell("Nullable", 900), hdrCell("Description", 5060)] }),
      new TableRow({ children: [bodyCell("id", 1800, { mono: true, bold: true, bg: C.rowAlt }), bodyCell("INT IDENTITY", 1600, { mono: true, bg: C.rowAlt }), bodyCell("NO", 900, { align: AlignmentType.CENTER, bg: C.rowAlt }), bodyCell("Primary key.", 5060, { bg: C.rowAlt })] }),
      new TableRow({ children: [bodyCell("user_id", 1800, { mono: true }), bodyCell("INT (FK)", 1600, { mono: true }), bodyCell("NO", 900, { align: AlignmentType.CENTER }), bodyCell("FK → users.id. ON DELETE CASCADE — deleting a user removes all their attendance records.", 5060)] }),
      new TableRow({ children: [bodyCell("event_id", 1800, { mono: true, bg: C.rowAlt }), bodyCell("INT (FK)", 1600, { mono: true, bg: C.rowAlt }), bodyCell("NO", 900, { align: AlignmentType.CENTER, bg: C.rowAlt }), bodyCell("FK → events.id. ON DELETE CASCADE.", 5060, { bg: C.rowAlt })] }),
      new TableRow({ children: [bodyCell("attendance_date", 1800, { mono: true }), bodyCell("DATE", 1600, { mono: true }), bodyCell("NO", 900, { align: AlignmentType.CENTER }), bodyCell("The calendar date of the event (YYYY-MM-DD). Used in UNIQUE constraint.", 5060)] }),
      new TableRow({ children: [bodyCell("check_in_time", 1800, { mono: true, bg: C.rowAlt }), bodyCell("DATETIME", 1600, { mono: true, bg: C.rowAlt }), bodyCell("NO", 900, { align: AlignmentType.CENTER, bg: C.rowAlt }), bodyCell("Full datetime of when the member checked in. Used to compute lateness.", 5060, { bg: C.rowAlt })] }),
      new TableRow({ children: [bodyCell("check_out_time", 1800, { mono: true }), bodyCell("DATETIME", 1600, { mono: true }), bodyCell("YES", 900, { align: AlignmentType.CENTER }), bodyCell("Optional. Nullable — not all check-in methods record check-out.", 5060)] }),
      new TableRow({ children: [bodyCell("status", 1800, { mono: true, bg: C.rowAlt }), bodyCell("NVARCHAR(20)", 1600, { mono: true, bg: C.rowAlt }), bodyCell("NO", 900, { align: AlignmentType.CENTER, bg: C.rowAlt }), bodyCell("CHECK (V2): present | late | excused | sick | absent.", 5060, { bg: C.rowAlt })] }),
      new TableRow({ children: [bodyCell("confidence_score", 1800, { mono: true }), bodyCell("DECIMAL(5,2)", 1600, { mono: true }), bodyCell("YES", 900, { align: AlignmentType.CENTER }), bodyCell("AI face recognition confidence (0–100%). Null for manual or QR check-ins.", 5060)] }),
      new TableRow({ children: [bodyCell("liveness_verified", 1800, { mono: true, bg: C.rowAlt }), bodyCell("BIT", 1600, { mono: true, bg: C.rowAlt }), bodyCell("YES", 900, { align: AlignmentType.CENTER, bg: C.rowAlt }), bodyCell("Liveness detection result (anti-spoofing). Default 0.", 5060, { bg: C.rowAlt })] }),
      new TableRow({ children: [bodyCell("device_info", 1800, { mono: true }), bodyCell("NVARCHAR(255)", 1600, { mono: true }), bodyCell("YES", 900, { align: AlignmentType.CENTER }), bodyCell("Identifies the check-in method: 'Self Check-in', 'Manual Entry – Admin', 'Face Recognition'.", 5060)] }),
      new TableRow({ children: [bodyCell("notes", 1800, { mono: true, bg: C.rowAlt }), bodyCell("NVARCHAR(500)", 1600, { mono: true, bg: C.rowAlt }), bodyCell("YES", 900, { align: AlignmentType.CENTER, bg: C.rowAlt }), bodyCell("Free-text notes. Added in V2 migration. Supports admin annotations.", 5060, { bg: C.rowAlt })] }),
    ]
  }));

  content.push(spacer(80, 80));
  content.push(callout("UNIQUE CONSTRAINT: (user_id, event_id, attendance_date) — prevents double check-in per event per day.", "🔒"));

  content.push(spacer(150, 100));

  // sessions
  content.push(h3("2.2.4 Table: sessions"));
  content.push(para("Stores active JWT sessions. Used to validate token freshness, enable logout from all devices, and enforce session expiry."));

  content.push(new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [1800, 1600, 900, 5060],
    rows: [
      new TableRow({ children: [hdrCell("Column", 1800), hdrCell("Data Type", 1600), hdrCell("Nullable", 900), hdrCell("Description", 5060)] }),
      new TableRow({ children: [bodyCell("user_id", 1800, { mono: true, bg: C.rowAlt }), bodyCell("INT (FK)", 1600, { mono: true, bg: C.rowAlt }), bodyCell("NO", 900, { align: AlignmentType.CENTER, bg: C.rowAlt }), bodyCell("FK → users.id. ON DELETE CASCADE.", 5060, { bg: C.rowAlt })] }),
      new TableRow({ children: [bodyCell("access_token", 1800, { mono: true }), bodyCell("NVARCHAR(500)", 1600, { mono: true }), bodyCell("NO", 900, { align: AlignmentType.CENTER }), bodyCell("The JWT access token string.", 5060)] }),
      new TableRow({ children: [bodyCell("refresh_token", 1800, { mono: true, bg: C.rowAlt }), bodyCell("NVARCHAR(500)", 1600, { mono: true, bg: C.rowAlt }), bodyCell("NO", 900, { align: AlignmentType.CENTER, bg: C.rowAlt }), bodyCell("Currently the same as access_token. Architecture supports separate refresh tokens in the future.", 5060, { bg: C.rowAlt })] }),
      new TableRow({ children: [bodyCell("expires_at", 1800, { mono: true }), bodyCell("DATETIME", 1600, { mono: true }), bodyCell("NO", 900, { align: AlignmentType.CENTER }), bodyCell("Session expiry: created_at + 24 hours. Checked in WHERE expires_at > GETDATE().", 5060)] }),
      new TableRow({ children: [bodyCell("ip_address", 1800, { mono: true, bg: C.rowAlt }), bodyCell("NVARCHAR(45)", 1600, { mono: true, bg: C.rowAlt }), bodyCell("YES", 900, { align: AlignmentType.CENTER, bg: C.rowAlt }), bodyCell("Client IP at login time. Supports IPv6 (up to 45 chars).", 5060, { bg: C.rowAlt })] }),
      new TableRow({ children: [bodyCell("user_agent", 1800, { mono: true }), bodyCell("NVARCHAR(255)", 1600, { mono: true }), bodyCell("YES", 900, { align: AlignmentType.CENTER }), bodyCell("Browser/device user agent string at login.", 5060)] }),
    ]
  }));

  content.push(spacer(150, 100));

  // other tables summary
  content.push(h3("2.2.5 Supporting Tables — Summary"));

  content.push(new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2000, 7360],
    rows: [
      new TableRow({ children: [hdrCell("Table Name", 2000), hdrCell("Purpose & Key Columns", 7360)] }),
      new TableRow({ children: [bodyCell("schedules", 2000, { mono: true, bg: C.rowAlt }), bodyCell("Event schedules with date, start_time, end_time, location, notes. FK → events(id) CASCADE. Referenced by check-in for lateness detection.", 7360, { bg: C.rowAlt })] }),
      new TableRow({ children: [bodyCell("announcements", 2000, { mono: true }), bodyCell("Org-wide announcements. Columns: title, body, author_id (FK→users), is_active, pinned. Pinned announcements appear at the top.", 7360)] }),
      new TableRow({ children: [bodyCell("qr_tokens", 2000, { mono: true, bg: C.rowAlt }), bodyCell("Time-limited check-in tokens. Columns: event_id (FK), token (UNIQUE 64-hex string), valid_date (DATE), expires_at (DATETIME), created_by (FK→users).", 7360, { bg: C.rowAlt })] }),
      new TableRow({ children: [bodyCell("divisions", 2000, { mono: true }), bodyCell("Organizational divisions. Columns: name, description, leader_id (FK→users SET NULL), is_active. Created in V2.", 7360)] }),
      new TableRow({ children: [bodyCell("event_enrollments", 2000, { mono: true, bg: C.rowAlt }), bodyCell("Many-to-many: users ↔ events. Columns: event_id, user_id, enrolled_at, is_active. UNIQUE(event_id, user_id). Both FKs CASCADE.", 7360, { bg: C.rowAlt })] }),
      new TableRow({ children: [bodyCell("activity_logs", 2000, { mono: true }), bodyCell("Audit trail. Columns: user_id (SET NULL), action (VARCHAR 50), entity_type, entity_id, description, ip_address, created_at. Written by the log() helper.", 7360)] }),
      new TableRow({ children: [bodyCell("system_settings", 2000, { mono: true, bg: C.rowAlt }), bodyCell("Key-value config store. Columns: setting_key (UNIQUE), setting_value, setting_type (string|integer|boolean), description. Writable only by super_admin.", 7360, { bg: C.rowAlt })] }),
      new TableRow({ children: [bodyCell("password_resets", 2000, { mono: true }), bodyCell("OTP for password recovery. Columns: user_id (CASCADE), reset_code (6-digit), expires_at (1 hr), is_used (BIT, default 0). Marked is_used=1 after use.", 7360)] }),
    ]
  }));

  content.push(spacer(200, 100));
  content.push(divider());

  // ─── 2.3 Relationships ────────────────────────────────────────────────────
  content.push(h2("2.3 Entity Relationships"));
  content.push(para("The following table summarizes the foreign key relationships between tables in the VISIATTEND database:"));
  content.push(spacer(80, 80));

  content.push(new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2000, 1800, 2000, 3560],
    rows: [
      new TableRow({ children: [hdrCell("Child Table", 2000), hdrCell("FK Column", 1800), hdrCell("References", 2000), hdrCell("On Delete Behavior", 3560)] }),
      new TableRow({ children: [bodyCell("events", 2000, { mono: true, bg: C.rowAlt }), bodyCell("preacher_id", 1800, { mono: true, bg: C.rowAlt }), bodyCell("users.id", 2000, { mono: true, bg: C.rowAlt }), bodyCell("SET NULL — event remains when preacher deleted.", 3560, { bg: C.rowAlt })] }),
      new TableRow({ children: [bodyCell("event_enrollments", 2000, { mono: true }), bodyCell("event_id, user_id", 1800, { mono: true }), bodyCell("events.id, users.id", 2000, { mono: true }), bodyCell("CASCADE on both — enrollment deleted with event or user.", 3560)] }),
      new TableRow({ children: [bodyCell("attendance", 2000, { mono: true, bg: C.rowAlt }), bodyCell("user_id, event_id", 1800, { mono: true, bg: C.rowAlt }), bodyCell("users.id, events.id", 2000, { mono: true, bg: C.rowAlt }), bodyCell("CASCADE on both — all records deleted with event or user.", 3560, { bg: C.rowAlt })] }),
      new TableRow({ children: [bodyCell("sessions", 2000, { mono: true }), bodyCell("user_id", 1800, { mono: true }), bodyCell("users.id", 2000, { mono: true }), bodyCell("CASCADE — all sessions invalidated when user is deleted.", 3560)] }),
      new TableRow({ children: [bodyCell("qr_tokens", 2000, { mono: true, bg: C.rowAlt }), bodyCell("event_id, created_by", 1800, { mono: true, bg: C.rowAlt }), bodyCell("events.id, users.id", 2000, { mono: true, bg: C.rowAlt }), bodyCell("CASCADE (event), SET NULL (creator).", 3560, { bg: C.rowAlt })] }),
      new TableRow({ children: [bodyCell("schedules", 2000, { mono: true }), bodyCell("event_id, created_by", 1800, { mono: true }), bodyCell("events.id, users.id", 2000, { mono: true }), bodyCell("CASCADE (event), SET NULL (creator).", 3560)] }),
      new TableRow({ children: [bodyCell("announcements", 2000, { mono: true, bg: C.rowAlt }), bodyCell("author_id", 1800, { mono: true, bg: C.rowAlt }), bodyCell("users.id", 2000, { mono: true, bg: C.rowAlt }), bodyCell("SET NULL — announcement retained, author set to null.", 3560, { bg: C.rowAlt })] }),
      new TableRow({ children: [bodyCell("divisions", 2000, { mono: true }), bodyCell("leader_id", 1800, { mono: true }), bodyCell("users.id", 2000, { mono: true }), bodyCell("SET NULL — division retained, leader cleared.", 3560)] }),
      new TableRow({ children: [bodyCell("activity_logs", 2000, { mono: true, bg: C.rowAlt }), bodyCell("user_id", 1800, { mono: true, bg: C.rowAlt }), bodyCell("users.id", 2000, { mono: true, bg: C.rowAlt }), bodyCell("SET NULL — audit history preserved anonymously.", 3560, { bg: C.rowAlt })] }),
      new TableRow({ children: [bodyCell("password_resets", 2000, { mono: true }), bodyCell("user_id", 1800, { mono: true }), bodyCell("users.id", 2000, { mono: true }), bodyCell("CASCADE — reset codes removed with user account.", 3560)] }),
    ]
  }));

  content.push(spacer(200, 100));
  content.push(divider());

  // ─── 2.4 Migration Strategy ───────────────────────────────────────────────
  content.push(h2("2.4 Migration Strategy (V1 → V2)"));
  content.push(para(
    "VISIATTEND uses a two-stage iterative migration approach. The V1 migration (migrate.ts) creates the initial " +
    "schema. The V2 migration (migrate_v2.ts) safely upgrades the running database without data loss."
  ));
  content.push(spacer(80, 80));

  content.push(new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [1000, 2400, 5960],
    rows: [
      new TableRow({ children: [hdrCell("Phase", 1000), hdrCell("Migration File", 2400), hdrCell("Actions", 5960)] }),
      new TableRow({ children: [
        bodyCell("V1", 1000, { bold: true, align: AlignmentType.CENTER, bg: C.rowAlt }),
        bodyCell("server/db/migrate.ts", 2400, { mono: true, bg: C.rowAlt }),
        bodyCell("Creates: users, events, event_enrollments, attendance, sessions, activity_logs, system_settings. All IF NOT EXISTS guarded. Inserts 5 default system settings.", 5960, { bg: C.rowAlt }),
      ]}),
      new TableRow({ children: [
        bodyCell("V2", 1000, { bold: true, align: AlignmentType.CENTER }),
        bodyCell("server/db/migrate_v2.ts", 2400, { mono: true }),
        bodyCell("Drops old role CHECK constraint → migrates 'member/preacher/staff' → 'user' → adds new CK_users_role_v2. Adds jabatan, division, avatar_url columns to users. Creates: divisions, schedules, announcements, qr_tokens, password_resets. Updates system_settings with 13 configuration keys.", 5960),
      ]}),
      new TableRow({ children: [
        bodyCell("Seed V2", 1000, { bold: true, align: AlignmentType.CENTER, bg: C.rowAlt }),
        bodyCell("server/db/seed_v2.ts", 2400, { mono: true, bg: C.rowAlt }),
        bodyCell("Creates a single super_admin account (configurable via SA_EMAIL, SA_PASSWORD env vars). All other users are created through the application UI by the super_admin.", 5960, { bg: C.rowAlt }),
      ]}),
    ]
  }));

  content.push(spacer(80, 80));
  content.push(note("All V2 migration steps use IF NOT EXISTS or CHECK before altering, making the migration safely idempotent — it can be run multiple times without errors."));

  content.push(spacer(200, 100));
  content.push(divider());

  // ─── 2.5 System Settings ─────────────────────────────────────────────────
  content.push(h2("2.5 System Settings Table — Key-Value Configuration"));
  content.push(para(
    "Instead of hardcoding behavioral constants, VISIATTEND stores configurable system parameters in the " +
    "system_settings table. The super_admin can change these through the UI without code changes or redeployment."
  ));
  content.push(spacer(80, 80));

  content.push(new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2400, 1200, 5760],
    rows: [
      new TableRow({ children: [hdrCell("setting_key", 2400), hdrCell("Type / Default", 1200), hdrCell("Description", 5760)] }),
      new TableRow({ children: [bodyCell("lateness_threshold", 2400, { mono: true, bg: C.rowAlt }), bodyCell("int / 15", 1200, { bg: C.rowAlt }), bodyCell("Minutes after event start_time before status changes from 'present' to 'late'.", 5760, { bg: C.rowAlt })] }),
      new TableRow({ children: [bodyCell("attendance_window", 2400, { mono: true }), bodyCell("int / 120", 1200), bodyCell("Duration in minutes that the check-in window remains open after event start.", 5760)] }),
      new TableRow({ children: [bodyCell("qr_expiry_minutes", 2400, { mono: true, bg: C.rowAlt }), bodyCell("int / 60", 1200, { bg: C.rowAlt }), bodyCell("Default QR token validity period in minutes. Overridable per token generation.", 5760, { bg: C.rowAlt })] }),
      new TableRow({ children: [bodyCell("allow_self_checkin", 2400, { mono: true }), bodyCell("bool / true", 1200), bodyCell("Enables or disables the member self check-in feature globally.", 5760)] }),
      new TableRow({ children: [bodyCell("ranking_enabled", 2400, { mono: true, bg: C.rowAlt }), bodyCell("bool / true", 1200, { bg: C.rowAlt }), bodyCell("Shows or hides the leaderboard from all member views.", 5760, { bg: C.rowAlt })] }),
      new TableRow({ children: [bodyCell("ranking_period", 2400, { mono: true }), bodyCell("string / month", 1200), bodyCell("Default leaderboard period: week | month | semester.", 5760)] }),
      new TableRow({ children: [bodyCell("streak_enabled", 2400, { mono: true, bg: C.rowAlt }), bodyCell("bool / true", 1200, { bg: C.rowAlt }), bodyCell("Enables attendance streak tracking displayed on member dashboard.", 5760, { bg: C.rowAlt })] }),
      new TableRow({ children: [bodyCell("maintenance_mode", 2400, { mono: true }), bodyCell("bool / false", 1200), bodyCell("When true, blocks all logins except super_admin. Checked at application startup.", 5760)] }),
      new TableRow({ children: [bodyCell("org_name", 2400, { mono: true, bg: C.rowAlt }), bodyCell("string", 1200, { bg: C.rowAlt }), bodyCell("Organization display name shown in the UI header and reports.", 5760, { bg: C.rowAlt })] }),
      new TableRow({ children: [bodyCell("enable_notifications", 2400, { mono: true }), bodyCell("bool / true", 1200), bodyCell("Email notification toggle for attendance-related events.", 5760)] }),
      new TableRow({ children: [bodyCell("auto_backup", 2400, { mono: true, bg: C.rowAlt }), bodyCell("bool / false", 1200, { bg: C.rowAlt }), bodyCell("Enables automatic daily database backup. Implementation handled by scheduled job.", 5760, { bg: C.rowAlt })] }),
    ]
  }));

  content.push(spacer(80, 80));
  content.push(para(
    "Settings are read via GET /api/settings/system. Non-super_admin roles receive a filtered subset " +
    "(org_name, ranking_enabled, etc.) to prevent exposure of sensitive configuration keys."
  ));

  content.push(spacer(200, 100));
  content.push(divider());

  // ─── 2.6 Indexes ─────────────────────────────────────────────────────────
  content.push(h2("2.6 Database Indexes for Performance"));
  content.push(para(
    "To support frequent query patterns — especially attendance trend and leaderboard queries — " +
    "the following indexes are defined in schema.sql:"
  ));

  content.push(new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2400, 2000, 4960],
    rows: [
      new TableRow({ children: [hdrCell("Index Name", 2400), hdrCell("Table.Column(s)", 2000), hdrCell("Query Pattern Supported", 4960)] }),
      new TableRow({ children: [bodyCell("idx_users_email", 2400, { mono: true, bg: C.rowAlt }), bodyCell("users.email", 2000, { mono: true, bg: C.rowAlt }), bodyCell("Login lookup: WHERE email=@e. Every login call benefits from this.", 4960, { bg: C.rowAlt })] }),
      new TableRow({ children: [bodyCell("idx_users_member_id", 2400, { mono: true }), bodyCell("users.member_id", 2000, { mono: true }), bodyCell("Member search by ID in the admin members list.", 4960)] }),
      new TableRow({ children: [bodyCell("idx_attendance_user", 2400, { mono: true, bg: C.rowAlt }), bodyCell("attendance.user_id", 2000, { mono: true, bg: C.rowAlt }), bodyCell("My attendance, my stats — all filtered by user_id.", 4960, { bg: C.rowAlt })] }),
      new TableRow({ children: [bodyCell("idx_attendance_event", 2400, { mono: true }), bodyCell("attendance.event_id", 2000, { mono: true }), bodyCell("Event-level filtering in admin attendance view and reports.", 4960)] }),
      new TableRow({ children: [bodyCell("idx_attendance_date", 2400, { mono: true, bg: C.rowAlt }), bodyCell("attendance.attendance_date", 2000, { mono: true, bg: C.rowAlt }), bodyCell("Trend queries use DATEADD range scans. Date index is critical.", 4960, { bg: C.rowAlt })] }),
      new TableRow({ children: [bodyCell("idx_attendance_user_date", 2400, { mono: true }), bodyCell("attendance.(user_id, date)", 2000, { mono: true }), bodyCell("Composite index for the duplicate check on self check-in.", 4960)] }),
      new TableRow({ children: [bodyCell("idx_sessions_access_token", 2400, { mono: true, bg: C.rowAlt }), bodyCell("sessions.access_token", 2000, { mono: true, bg: C.rowAlt }), bodyCell("Logout: DELETE FROM sessions WHERE access_token=@t.", 4960, { bg: C.rowAlt })] }),
      new TableRow({ children: [bodyCell("idx_activity_created", 2400, { mono: true }), bodyCell("activity_logs.created_at", 2000, { mono: true }), bodyCell("Audit log queries ordered by created_at DESC OFFSET FETCH.", 4960)] }),
    ]
  }));

  content.push(spacer(200, 100));

  // Summary callout
  content.push(new Paragraph({
    spacing: { before: 200, after: 200 },
    indent: { left: 360, right: 360 },
    shading: { fill: C.greenBg, type: ShadingType.CLEAR },
    border: { left: { style: BorderStyle.SINGLE, size: 16, color: C.green, space: 8 } },
    children: [
      new TextRun({ text: "✅  Implementation Summary", bold: true, size: 24, font: "Arial", color: C.green }),
      new TextRun({ text: " — VISIATTEND implements a complete three-tier architecture: ", size: 22, font: "Arial", color: C.black }),
      new TextRun({ text: "(1) React TypeScript frontend with session-based auth and role-guarded routes, ", size: 22, font: "Arial", color: C.black }),
      new TextRun({ text: "(2) Express/TypeScript backend with RBAC middleware, 11+ API modules, and a centralized audit logger, ", size: 22, font: "Arial", color: C.black }),
      new TextRun({ text: "(3) Python AI bridge with YuNet face detection, ArcFace embedding, and cosine-similarity matching, ", size: 22, font: "Arial", color: C.black }),
      new TextRun({ text: "all backed by a normalized MSSQL database with 11 tables, strategic indexes, and a version-controlled two-stage migration system.", size: 22, font: "Arial", color: C.black }),
    ],
  }));

  return content;
}

// ─── Build Document ───────────────────────────────────────────────────────────
async function build() {
  const allContent = [
    ...makeTitlePage(),
    new Paragraph({ children: [new PageBreak()] }),
    ...makeSection1(),
    new Paragraph({ children: [new PageBreak()] }),
    ...makeSection2(),
  ];

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: "bullets",
          levels: [{
            level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          }],
        },
        {
          reference: "numbers",
          levels: [{
            level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          }],
        },
      ],
    },
    styles: {
      default: {
        document: { run: { font: "Arial", size: 22 } },
      },
      paragraphStyles: [
        {
          id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 36, bold: true, font: "Arial", color: C.primary },
          paragraph: { spacing: { before: 400, after: 200 }, outlineLevel: 0 },
        },
        {
          id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 28, bold: true, font: "Arial", color: C.accent },
          paragraph: { spacing: { before: 300, after: 150 }, outlineLevel: 1 },
        },
        {
          id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 24, bold: true, font: "Arial", color: C.primary },
          paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 2 },
        },
      ],
    },
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, right: 1080, bottom: 1440, left: 1080 },
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.border, space: 4 } },
            children: [new TextRun({ text: "VISIATTEND — Design Implementation Documentation", size: 18, color: C.gray, font: "Arial" })],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            border: { top: { style: BorderStyle.SINGLE, size: 4, color: C.border, space: 4 } },
            children: [
              new TextRun({ text: "Page ", size: 18, color: C.gray, font: "Arial" }),
              new TextRun({ children: [PageNumber.CURRENT], size: 18, color: C.gray, font: "Arial" }),
              new TextRun({ text: " | RESC Capstone Project 2026", size: 18, color: C.gray, font: "Arial" }),
            ],
          })],
        }),
      },
      children: allContent,
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync("./outputs/VISIATTEND_Design_Implementation.docx", buffer);
  console.log("Done!");
}

build().catch(console.error);