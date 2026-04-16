import DOMPurify from 'dompurify';
export const sanitizeText = (input: string): string => {
  if (typeof input !== 'string') return '';
  // ALLOWED_TAGS: [] removes every HTML tag (text nodes are preserved)
  // ALLOWED_ATTR: [] removes every attribute
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).trim();
};
/**
 * Sanitizes HTML content while preserving safe formatting tags.
 * Use ONLY when rich text display is intentional (e.g., pre-formatted case notes).
 * NOT for form inputs or API payloads.
 */
export const sanitizeHtml = (dirty: string): string => {
  if (typeof dirty !== 'string') return '';
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: [],
  });
};
export const sanitizeHtmlSafe = (dirty: string): string => {
  if (typeof dirty !== 'string') return '';
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: [],
  });
};
export const encodeHtmlEntities = (text: string): string => {
  if (typeof text !== 'string') return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};
export const sanitizeFormData = <T extends Record<string, unknown>>(data: T): T => {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    result[key] = typeof value === 'string' ? sanitizeText(value) : value;
  }
  return result as T;
};
