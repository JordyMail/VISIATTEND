// client/lib/auth.ts
import Cookies from "js-cookie";
import CryptoJS from "crypto-js";

const SECRET =
  (import.meta as any).env?.VITE_ENCRYPTION_KEY ||
  "your-secret-key-min-32-chars-long!!";
const SESSION_TTL = 8 * 60 * 60 * 1000; // 8 hours

export type AppRole = "super_admin" | "admin" | "user" | "attendance";

export interface SessionUser {
  id: number;
  full_name: string;
  email: string;
  role: AppRole;
  jabatan?: string;
  division?: string;
  avatar_url?: string;
  permissions: string[];
}

export interface StoredSession {
  user: SessionUser;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  lastActivity: number;
}

// ─── Crypto ───────────────────────────────────────────────────────────────────
export const encryptData = (s: string) =>
  CryptoJS.AES.encrypt(s, SECRET).toString();

export const decryptData = (s: string): string => {
  try {
    return CryptoJS.AES.decrypt(s, SECRET).toString(CryptoJS.enc.Utf8) || s;
  } catch {
    return s;
  }
};

// ─── Session management ───────────────────────────────────────────────────────
export const setSession = (
  user: SessionUser,
  tokens: { accessToken: string; refreshToken: string }
): void => {
  const session: StoredSession = {
    user,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: Date.now() + SESSION_TTL,
    lastActivity: Date.now(),
  };
  localStorage.setItem("session", JSON.stringify(session));
  Cookies.set("refreshToken", tokens.refreshToken, {
    expires: 7,
    secure: location.protocol === "https:",
    sameSite: "strict",
    path: "/",
  });
};

export const getSession = (): StoredSession | null => {
  try {
    const raw = localStorage.getItem("session");
    if (!raw) return null;
    const s: StoredSession = JSON.parse(raw);
    if (Date.now() > s.expiresAt) {
      clearSession();
      return null;
    }
    // Extend TTL on activity
    s.lastActivity = Date.now();
    localStorage.setItem("session", JSON.stringify(s));
    return s;
  } catch {
    clearSession();
    return null;
  }
};

export const getSessionUser = (): SessionUser | null =>
  getSession()?.user ?? null;

export const clearSession = (): void => {
  localStorage.removeItem("session");
  Cookies.remove("refreshToken", { path: "/" });
};

export const updateLastActivity = (): void => {
  try {
    const raw = localStorage.getItem("session");
    if (!raw) return;
    const s = JSON.parse(raw);
    s.lastActivity = Date.now();
    localStorage.setItem("session", JSON.stringify(s));
  } catch {
    /* ignore */
  }
};

// ─── Token refresh (used by ProtectedRoute) ────────────────────────────────
export const refreshAccessToken = async (
  refreshToken: string
): Promise<string | null> => {
  try {
    const response = await fetch("/api/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (data.accessToken) {
      // Patch stored session with new access token
      const raw = localStorage.getItem("session");
      if (raw) {
        const s: StoredSession = JSON.parse(raw);
        s.accessToken = data.accessToken;
        s.expiresAt = Date.now() + SESSION_TTL;
        localStorage.setItem("session", JSON.stringify(s));
      }
      return data.accessToken;
    }
    return null;
  } catch {
    return null;
  }
};

// ─── Permission helpers ───────────────────────────────────────────────────────
export const hasPermission = (permission: string): boolean => {
  const user = getSessionUser();
  return user?.permissions?.includes(permission) ?? false;
};

export const isRole = (...roles: AppRole[]): boolean => {
  const user = getSessionUser();
  return user ? roles.includes(user.role) : false;
};

export const isSuperAdmin = () => isRole("super_admin");
export const isAdmin = () => isRole("super_admin", "admin");
export const isUser = () => isRole("user");