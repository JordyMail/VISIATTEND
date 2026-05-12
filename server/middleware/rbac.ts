// server/middleware/rbac.ts
import jwt from "jsonwebtoken";

export type AppRole = "super_admin" | "admin" | "user";

// ─── Authenticate ─────────────────────────────────────────────────────────────
export const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ success: false, message: "Access token required" });
  }

  jwt.verify(token, process.env.JWT_SECRET || "secret_key", (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ success: false, message: "Invalid or expired token" });
    }
    req.user = user;
    next();
  });
};

// ─── Require specific roles ───────────────────────────────────────────────────
export const requireRole = (...roles: AppRole[]) => {
  return (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }
    if (!roles.includes(req.user.role as AppRole)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(" or ")}`,
      });
    }
    next();
  };
};

// ─── Shorthand guards ─────────────────────────────────────────────────────────
export const requireSuperAdmin = requireRole("super_admin");
export const requireAdmin = requireRole("super_admin", "admin");
export const requireAnyRole = requireRole("super_admin", "admin", "user");

// ─── Self-or-admin guard (user can only access own data unless admin+) ────────
export const requireSelfOrAdmin = (paramKey = "id") => {
  return (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }
    const isSelf = String(req.user.id) === String(req.params[paramKey]);
    const isAdmin = ["super_admin", "admin"].includes(req.user.role);
    if (!isSelf && !isAdmin) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    next();
  };
};

// ─── Permission matrix helper ─────────────────────────────────────────────────
export const PERMISSIONS = {
  // Super admin only
  BACKUP_DB:           ["super_admin"],
  MANAGE_SYSTEM:       ["super_admin"],
  MANAGE_ROLES:        ["super_admin"],
  VIEW_AUDIT_ALL:      ["super_admin"],
  DELETE_ANY_USER:     ["super_admin"],
  CHANGE_ROLE:         ["super_admin"],

  // Admin and above
  CRUD_ATTENDANCE:     ["super_admin", "admin"],
  CRUD_EVENTS:         ["super_admin", "admin"],
  CRUD_USERS:          ["super_admin", "admin"],
  VIEW_ALL_ATTENDANCE: ["super_admin", "admin"],
  EXPORT_REPORTS:      ["super_admin", "admin"],
  RESET_PASSWORD:      ["super_admin", "admin"],
  TOGGLE_USER_STATUS:  ["super_admin", "admin"],
  MANAGE_ENROLLMENTS:  ["super_admin", "admin"],
  MANUAL_ATTENDANCE:   ["super_admin", "admin"],

  // All roles
  VIEW_OWN_PROFILE:    ["super_admin", "admin", "user"],
  EDIT_OWN_PROFILE:    ["super_admin", "admin", "user"],
  VIEW_OWN_ATTENDANCE: ["super_admin", "admin", "user"],
  VIEW_LEADERBOARD:    ["super_admin", "admin", "user"],
  VIEW_SCHEDULE:       ["super_admin", "admin", "user"],
  CHECK_IN:            ["super_admin", "admin", "user"],
} as const;

export type Permission = keyof typeof PERMISSIONS;

export const hasPermission = (role: AppRole, permission: Permission): boolean => {
  return (PERMISSIONS[permission] as readonly string[]).includes(role);
};