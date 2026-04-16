import { describe, it, expect, beforeEach } from 'vitest';
import { secureSet, secureGet, secureRemove, secureClear } from '../utils/secureStorage';
const PREFIX = 'slms_';
beforeEach(() => {
  sessionStorage.clear();
});
describe('secureSet / secureGet — round-trip correctness', () => {
  it('retrieves the exact value that was stored', () => {
    secureSet('token', 'abc123');
    expect(secureGet('token')).toBe('abc123');
  });
  it('correctly stores and retrieves a JWT-like string', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxIn0.sig';
    secureSet('token', jwt);
    expect(secureGet('token')).toBe(jwt);
  });
  it('correctly stores and retrieves a role value', () => {
    secureSet('role', 'LAWYER');
    expect(secureGet('role')).toBe('LAWYER');
  });
});
describe('secureSet — obfuscation (plaintext is NOT stored)', () => {
  it('does not store the raw value in sessionStorage', () => {
    secureSet('token', 'supersecret');
    const raw = sessionStorage.getItem(PREFIX + 'token');
    expect(raw).not.toBe('supersecret');
  });
  it('uses the slms_ namespace prefix for all keys', () => {
    secureSet('mykey', 'val');
    const keys = Object.keys(sessionStorage);
    expect(keys.some(k => k.startsWith(PREFIX))).toBe(true);
  });
  it('does not expose the value without going through secureGet', () => {
    secureSet('token', 'my-secret-jwt');
    const raw = sessionStorage.getItem(PREFIX + 'token') || '';
    expect(raw).not.toContain('my-secret-jwt');
  });
});
describe('secureGet — missing keys', () => {
  it('returns null for a key that has never been set', () => {
    expect(secureGet('nonexistent')).toBeNull();
  });
  it('returns null after the key has been removed', () => {
    secureSet('temp', 'value');
    secureRemove('temp');
    expect(secureGet('temp')).toBeNull();
  });
});
describe('secureRemove', () => {
  it('removes only the specified key', () => {
    secureSet('token', 'tok');
    secureSet('role',  'ADMIN');
    secureRemove('token');
    expect(secureGet('token')).toBeNull();
    expect(secureGet('role')).toBe('ADMIN');
  });
  it('does not throw when removing a non-existent key', () => {
    expect(() => secureRemove('doesNotExist')).not.toThrow();
  });
});
describe('secureClear', () => {
  it('removes all app-prefixed keys', () => {
    secureSet('token', 'tok');
    secureSet('role',  'LAWYER');
    secureClear();
    expect(secureGet('token')).toBeNull();
    expect(secureGet('role')).toBeNull();
  });
  it('does not remove keys that do not have the app prefix', () => {
    sessionStorage.setItem('other_app_key', 'should_remain');
    secureSet('token', 'tok');
    secureClear();
    expect(sessionStorage.getItem('other_app_key')).toBe('should_remain');
  });
  it('does not throw when storage is already empty', () => {
    expect(() => secureClear()).not.toThrow();
  });
});
