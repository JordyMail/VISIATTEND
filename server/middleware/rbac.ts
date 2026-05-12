// server/middleware/rbac.ts
// Role-Based Access Control
import jwt from "jsonwebtoken";

export type AppRole = "super_admin" | "admin" | "user";

// ─── Authenticate JWT ─────────────────────────────────────────────────────────
export const authenticateToken = (req: any, res: any, next: any) => {
  const header = req.headers["authorization"];
  const token = header?.split(" ")[1];
  if (!token) return res.status(401).json({ success: false, message: "Access token required" });

  jwt.verify(token, process.env.JWT_SECRET || "secret_key", (err: any, user: any) => {
    if (err) return res.status(403).json({ success: false, message: "Invalid or expired token" });
    req.user = user;
    next();
  });
};

// ─── Role guards ──────────────────────────────────────────────────────────────
export const requireRole = (...roles: AppRole[]) => (req: any, res: any, next: any) => {
  if (!req.user) return res.status(401).json({ success: false, message: "Not authenticated" });
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: `Access denied. Required: ${roles.join(" or ")}`,
    });
  }
  next();
};

export const requireSuperAdmin = requireRole("super_admin");
export const requireAdmin      = requireRole("super_admin", "admin");
export const requireAnyRole    = requireRole("super_admin", "admin", "user");

// ─── Self-or-admin: user can only access their own resource ──────────────────
export const requireSelfOrAdmin = (paramKey = "id") => (req: any, res: any, next: any) => {
  if (!req.user) return res.status(401).json({ success: false, message: "Not authenticated" });
  const isSelf  = String(req.user.id) === String(req.params[paramKey]);
  const isAdmin = ["super_admin", "admin"].includes(req.user.role);
  if (!isSelf && !isAdmin) return res.status(403).json({ success: false, message: "Access denied" });
  next();
};

// ─── Permission map (for frontend consumption via /api/auth/me) ───────────────
export const ROLE_PERMISSIONS: Record<AppRole, string[]> = {
  super_admin: [
    "manage_system_settings",
    "manage_roles",
    "view_audit_logs",
    "delete_any_user",
    "manage_divisions",
    "backup_database",
    "crud_users",
    "crud_events",
    "crud_attendance",
    "crud_announcements",
    "crud_schedules",
    "export_reports",
    "reset_any_password",
    "toggle_user_status",
    "generate_qr",
    "view_all_attendance",
    "view_leaderboard",
    "view_own_profile",
    "edit_own_profile",
    "self_checkin",
  ],
  admin: [
    "crud_users",          // cannot create admin/super_admin
    "crud_events",
    "crud_attendance",
    "crud_announcements",
    "crud_schedules",
    "export_reports",
    "reset_user_password", // cannot reset super_admin
    "toggle_user_status",  // cannot toggle super_admin
    "generate_qr",
    "view_all_attendance",
    "view_leaderboard",
    "view_own_profile",
    "edit_own_profile",
    "self_checkin",
  ],
  user: [
    "view_own_profile",
    "edit_own_profile",
    "self_checkin",
    "view_own_attendance",
    "view_leaderboard",
    "view_schedules",
    "view_announcements",
  ],
};