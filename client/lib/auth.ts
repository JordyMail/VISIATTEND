// lib/auth.ts
import Cookies from 'js-cookie';
import CryptoJS from 'crypto-js';

const SECRET_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'your-secret-key-min-32-chars-long!!';
const TOKEN_REFRESH_INTERVAL = 15 * 60 * 1000; // 15 menit
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 menit

// Enkripsi data sensitif
export const encryptData = (data: string): string => {
  return CryptoJS.AES.encrypt(data, SECRET_KEY).toString();
};

export const decryptData = (encryptedData: string): string => {
  const bytes = CryptoJS.AES.decrypt(encryptedData, SECRET_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};

// Cookie operations (HTTP-only tidak bisa di JS, ini simulasi)
export const setSecureCookie = (name: string, value: string, days: number = 7) => {
  Cookies.set(name, value, {
    expires: days,
    secure: true,
    sameSite: 'strict',
    path: '/'
  });
};

export const getSecureCookie = (name: string): string | undefined => {
  return Cookies.get(name);
};

export const removeSecureCookie = (name: string) => {
  Cookies.remove(name, { path: '/' });
};

// Session management
export const setSession = (userData: any, tokens: { accessToken: string; refreshToken: string }) => {
  const sessionData = {
    user: encryptData(JSON.stringify(userData)),
    accessToken: encryptData(tokens.accessToken),
    refreshToken: encryptData(tokens.refreshToken),
    lastActivity: Date.now(),
    expiresAt: Date.now() + SESSION_TIMEOUT
  };
  
  localStorage.setItem('session', JSON.stringify(sessionData));
  setSecureCookie('refreshToken', tokens.refreshToken, 7);
};

export const getSession = () => {
  const sessionStr = localStorage.getItem('session');
  if (!sessionStr) return null;
  
  try {
    const session = JSON.parse(sessionStr);
    
    // Check session timeout
    if (Date.now() > session.expiresAt) {
      clearSession();
      return null;
    }
    
    // Update last activity
    session.lastActivity = Date.now();
    localStorage.setItem('session', JSON.stringify(session));
    
    return {
      user: JSON.parse(decryptData(session.user)),
      accessToken: decryptData(session.accessToken),
      refreshToken: decryptData(session.refreshToken)
    };
  } catch (error) {
    console.error('Failed to decrypt session:', error);
    clearSession();
    return null;
  }
};

export const clearSession = () => {
  localStorage.removeItem('session');
  removeSecureCookie('refreshToken');
  removeSecureCookie('accessToken');
};

// Token refresh
export const refreshAccessToken = async (refreshToken: string): Promise<string | null> => {
  try {
    // Simulasi API call ke backend
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });
    
    if (!response.ok) throw new Error('Failed to refresh token');
    
    const data = await response.json();
    return data.accessToken;
  } catch (error) {
    console.error('Token refresh failed:', error);
    return null;
  }
};

// Activity tracker
export const updateLastActivity = () => {
  const sessionStr = localStorage.getItem('session');
  if (sessionStr) {
    const session = JSON.parse(sessionStr);
    session.lastActivity = Date.now();
    localStorage.setItem('session', JSON.stringify(session));
  }
};