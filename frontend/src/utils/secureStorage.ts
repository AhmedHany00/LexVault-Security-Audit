const PREFIX = 'slms_';
const obfuscate = (value: string): string => {
  try {
    return btoa(value.split('').reverse().join(''));
  } catch {
    return value;
  }
};
/** Reverse the obfuscation */
const deobfuscate = (value: string): string => {
  try {
    return atob(value).split('').reverse().join('');
  } catch {
    return value;
  }
};
/**
 * Stores a value securely in sessionStorage with namespace prefix + obfuscation.
 */
export const secureSet = (key: string, value: string): void => {
  try {
    sessionStorage.setItem(PREFIX + key, obfuscate(value));
  } catch (e) {
    console.error('[SecureStorage] Failed to store item:', key, e);
  }
};
/**
 * Retrieves and de-obfuscates a value from sessionStorage.
 * Returns null if the key does not exist or an error occurs.
 */
export const secureGet = (key: string): string | null => {
  try {
    const raw = sessionStorage.getItem(PREFIX + key);
    if (raw === null) return null;
    return deobfuscate(raw);
  } catch (e) {
    console.error('[SecureStorage] Failed to retrieve item:', key, e);
    return null;
  }
};
/**
 * Removes a single key from secure storage.
 */
export const secureRemove = (key: string): void => {
  try {
    sessionStorage.removeItem(PREFIX + key);
  } catch (e) {
    console.error('[SecureStorage] Failed to remove item:', key, e);
  }
};
/**
 * Clears ALL keys belonging to this application from sessionStorage.
 * Call this on logout to ensure no residual session data remains.
 */
export const secureClear = (): void => {
  try {
    const keysToRemove = Object.keys(sessionStorage).filter(k =>
      k.startsWith(PREFIX)
    );
    keysToRemove.forEach(k => sessionStorage.removeItem(k));
  } catch (e) {
    console.error('[SecureStorage] Failed to clear storage:', e);
  }
};
