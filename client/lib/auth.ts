// client/lib/auth.ts
import Cookies from 'js-cookie';
import CryptoJS from 'crypto-js';

const SECRET_KEY = (import.meta as any).env?.VITE_ENCRYPTION_KEY || 'your-secret-key-min-32-chars-long!!';
const SESSION_TIMEOUT = 8 * 60 * 60 * 1000; // 8 hours

// ─── Crypto helpers ───────────────────────────────────────────────────────────
export const encryptData = (data: string): string => {
  return CryptoJS.AES.encrypt(data, SECRET_KEY).toString();
};

export const decryptData = (encryptedData: string): string => {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, SECRET_KEY);
    const result = bytes.toString(CryptoJS.enc.Utf8);
    return result || encryptedData;
  } catch {
    return encryptedData;
  }
};

// ─── Cookies ──────────────────────────────────────────────────────────────────
export const setSecureCookie = (name: string, value: string, days = 7) => {
  Cookies.set(name, value, { expires: days, secure: true, sameSite: 'strict', path: '/' });
};

export const getSecureCookie = (name: string): string | undefined => Cookies.get(name);

export const removeSecureCookie = (name: string) => Cookies.remove(name, { path: '/' });

// ─── Session ─────────────────────────────────────────────────────────────────
/**
 * Store session.
 * Tokens are stored as-is (plain JWT) so the api.ts interceptor can read them
 * directly without decryption. User data is encrypted for privacy.
 */
export const setSession = (
  userData: any,
  tokens: { accessToken: string; refreshToken: string }
) => {
  const sessionData = {
    user: encryptData(JSON.stringify(userData)),
    // Tokens stored plain so api.ts can read them without extra logic
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    lastActivity: Date.now(),
    expiresAt: Date.now() + SESSION_TIMEOUT,
  };

  localStorage.setItem('session', JSON.stringify(sessionData));
  setSecureCookie('refreshToken', tokens.refreshToken, 7);
};

export const getSession = (): { user: any; accessToken: string; refreshToken: string } | null => {
  try {
    const sessionStr = localStorage.getItem('session');
    if (!sessionStr) return null;

    const session = JSON.parse(sessionStr);

    if (Date.now() > session.expiresAt) {
      clearSession();
      return null;
    }

    // Extend session on activity
    session.lastActivity = Date.now();
    localStorage.setItem('session', JSON.stringify(session));

    return {
      user: JSON.parse(decryptData(session.user)),
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    };
  } catch {
    clearSession();
    return null;
  }
};

export const clearSession = () => {
  localStorage.removeItem('session');
  removeSecureCookie('refreshToken');
  removeSecureCookie('accessToken');
};

// ─── Activity tracker ────────────────────────────────────────────────────────
export const updateLastActivity = () => {
  try {
    const sessionStr = localStorage.getItem('session');
    if (!sessionStr) return;
    const session = JSON.parse(sessionStr);
    session.lastActivity = Date.now();
    localStorage.setItem('session', JSON.stringify(session));
  } catch { /* ignore */ }
};

export const refreshAccessToken = async (refreshToken: string): Promise<string | null> => {
  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!response.ok) throw new Error('Refresh failed');
    const data = await response.json();
    return data.accessToken;
  } catch {
    return null;
  }
};