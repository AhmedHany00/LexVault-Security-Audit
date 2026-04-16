import {
  createContext, useContext, useState, useEffect,
  useCallback, useRef, type ReactNode,
} from 'react';
import { secureGet, secureSet, secureClear } from '../utils/secureStorage';
export interface AuthUser {
  token: string;
  role: string;
  userId?: string;
  email?: string;
  name?: string;
}
interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (token: string, role: string, email?: string, name?: string) => void;
  logout: () => void;
}
interface JwtPayload {
  exp?: number;
  userId?: string;
  role?: string;
}
export const parseJwt = (token: string): JwtPayload | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const json = decodeURIComponent(
      atob(padded)
        .split('')
        .map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('')
    );
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
};
/** Returns true if the JWT `exp` claim is in the future. */
export const isTokenValid = (token: string): boolean => {
  const payload = parseJwt(token);
  if (!payload) return false;
  if (!payload.exp) return true;   // no expiry claim — treat as valid
  return Date.now() / 1000 < payload.exp;
};
// ─── Context ──────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextType | null>(null);
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Clears all auth state and stored credentials. */
  const logout = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    secureClear();
    setUser(null);
  }, []);
  /**
   * Schedules an automatic logout exactly when the JWT expires.
   * This ensures sessions are terminated server-side and client-side at the
   * same time, preventing stale token usage.
   */
  const scheduleAutoLogout = useCallback((exp: number) => {
    const msRemaining = exp * 1000 - Date.now();
    if (msRemaining <= 0) {
      logout();
      return;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      console.warn('[Auth] Session expired — logging out automatically.');
      logout();
    }, msRemaining);
  }, [logout]);
  /** Sets auth state and schedules auto-logout. */
  const login = useCallback((token: string, role: string, email?: string, name?: string) => {
    secureSet('token', token);
    secureSet('role', role);
    if (email) secureSet('email', email);
    if (name)  secureSet('name', name);
    const payload = parseJwt(token);
    setUser({ token, role, userId: payload?.userId, email, name });
    if (payload?.exp) scheduleAutoLogout(payload.exp);
  }, [scheduleAutoLogout]);
  useEffect(() => {
    const token = secureGet('token');
    const role  = secureGet('role');
    if (token && role) {
      if (!isTokenValid(token)) {
        console.warn('[Auth] Stored token is expired — clearing session.');
        logout();
      } else {
        const payload = parseJwt(token);
        const email   = secureGet('email') ?? undefined;
        const name    = secureGet('name')  ?? undefined;
        setUser({ token, role, userId: payload?.userId, email, name });
        if (payload?.exp) scheduleAutoLogout(payload.exp);
      }
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [logout, scheduleAutoLogout]);
  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an <AuthProvider>.');
  return ctx;
};
