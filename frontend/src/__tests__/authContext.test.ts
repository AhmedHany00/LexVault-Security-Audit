import { describe, it, expect } from 'vitest';
import { parseJwt, isTokenValid } from '../context/AuthContext';
const makeJwt = (payload: Record<string, unknown>): string => {
  const header  = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const body    = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  return `${header}.${body}.fakesig`;
};
// ─── parseJwt ─────────────────────────────────────────────────────────────────
describe('parseJwt', () => {
  it('decodes userId and role from a valid JWT', () => {
    const token   = makeJwt({ userId: 'u-123', role: 'LAWYER', exp: 9999999999 });
    const payload = parseJwt(token);
    expect(payload).not.toBeNull();
    expect(payload?.userId).toBe('u-123');
    expect(payload?.role).toBe('LAWYER');
  });
  it('decodes the exp claim correctly', () => {
    const exp   = Math.floor(Date.now() / 1000) + 3600; 
    const token = makeJwt({ exp });
    const p     = parseJwt(token);
    expect(p?.exp).toBe(exp);
  });
  it('returns null for a completely invalid string', () => {
    expect(parseJwt('not.a.jwt.at.all.extra')).toBeNull();
  });
  it('returns null for an empty string', () => {
    expect(parseJwt('')).toBeNull();
  });
  it('returns null for a token with only two parts (missing signature)', () => {
    expect(parseJwt('header.payload')).toBeNull();
  });
  it('returns null when the payload is not valid base64', () => {
    expect(parseJwt('header.!!!.sig')).toBeNull();
  });
});
describe('isTokenValid', () => {
  it('returns true for a token that expires in the future', () => {
    const future = Math.floor(Date.now() / 1000) + 3600;
    const token  = makeJwt({ exp: future });
    expect(isTokenValid(token)).toBe(true);
  });
  it('returns false for a token that has already expired', () => {
    const past  = Math.floor(Date.now() / 1000) - 10; 
    const token = makeJwt({ exp: past });
    expect(isTokenValid(token)).toBe(false);
  });
  it('returns true for a token with no exp claim (non-expiring)', () => {
    const token = makeJwt({ userId: 'u-1', role: 'ADMIN' });
    expect(isTokenValid(token)).toBe(true);
  });
  it('returns false for a malformed/empty token', () => {
    expect(isTokenValid('')).toBe(false);
    expect(isTokenValid('bad.token')).toBe(false);
  });
  it('returns false for a token expiring exactly now (boundary)', () => {
    const now   = Math.floor(Date.now() / 1000) - 1;
    const token = makeJwt({ exp: now });
    expect(isTokenValid(token)).toBe(false);
  });
});
