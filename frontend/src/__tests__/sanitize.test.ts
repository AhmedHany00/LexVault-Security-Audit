import { describe, it, expect } from 'vitest';
import { sanitizeText, encodeHtmlEntities, sanitizeFormData } from '../utils/sanitize';
describe('sanitizeText — XSS prevention', () => {
  it('strips a basic script tag injection', () => {
    const input  = '<script>alert("xss")</script>Hello';
    const result = sanitizeText(input);
    expect(result).toBe('Hello');
    expect(result).not.toContain('<script>');
  });
  it('strips an inline event-handler injection', () => {
    const input  = '<img src=x onerror="alert(1)">LegalDoc';
    const result = sanitizeText(input);
    expect(result).not.toContain('onerror');
    expect(result).not.toContain('<img');
  });
  it('strips a javascript: protocol URI', () => {
    const input  = '<a href="javascript:alert(1)">Click</a>';
    const result = sanitizeText(input);
    expect(result).not.toContain('javascript:');
    expect(result).not.toContain('<a');
  });
  it('strips SVG-based XSS vector', () => {
    const input  = '<svg onload="alert(1)"></svg>';
    const result = sanitizeText(input);
    expect(result).not.toContain('<svg');
    expect(result).not.toContain('onload');
  });
  it('preserves plain text untouched', () => {
    const input = 'Smith v Jones 2025 - Case Title';
    expect(sanitizeText(input)).toBe('Smith v Jones 2025 - Case Title');
  });
  it('trims leading and trailing whitespace', () => {
    expect(sanitizeText('  hello  ')).toBe('hello');
  });
  it('returns empty string for empty input', () => {
    expect(sanitizeText('')).toBe('');
  });
  it('handles non-string input gracefully', () => {
    expect(sanitizeText(null as any)).toBe('');
    // @ts-expect-error testing runtime safety
    expect(sanitizeText(undefined)).toBe('');
  });
  it('strips nested/encoded HTML attempts', () => {
    const input  = '<<script>>alert(1)<</script>>';
    const result = sanitizeText(input);
    expect(result).not.toContain('<script>');
  });
  it('strips HTML comments that could hide injection', () => {
    const input  = '<!-- <script>alert(1)</script> -->safe';
    const result = sanitizeText(input);
    expect(result).not.toContain('<script>');
  });
});
describe('encodeHtmlEntities', () => {
  it('encodes < and > characters', () => {
    expect(encodeHtmlEntities('<b>test</b>')).toBe('&lt;b&gt;test&lt;/b&gt;');
  });
  it('encodes ampersand', () => {
    expect(encodeHtmlEntities('Tom & Jerry')).toBe('Tom &amp; Jerry');
  });
  it('encodes double quote', () => {
    expect(encodeHtmlEntities('"hello"')).toBe('&quot;hello&quot;');
  });
  it('encodes single quote', () => {
    expect(encodeHtmlEntities("it's")).toBe('it&#39;s');
  });
  it('returns empty string for non-string input', () => {
    expect(encodeHtmlEntities(null as any)).toBe('');
  });
  it('leaves plain alphanumeric text unchanged', () => {
    expect(encodeHtmlEntities('CaseNumber123')).toBe('CaseNumber123');
  });
});
describe('sanitizeFormData — batch form sanitization', () => {
  it('sanitizes all string fields in a form object', () => {
    const raw = {
      title:       '<script>xss</script>My Case',
      description: 'Normal text',
      caseNumber:  'CASE-001',
    };
    const safe = sanitizeFormData(raw);
    expect(safe.title).toBe('My Case');
    expect(safe.description).toBe('Normal text');
    expect(safe.caseNumber).toBe('CASE-001');
  });
  it('leaves non-string fields (numbers, booleans) untouched', () => {
    const raw = { count: 42, active: true, name: '<b>Test</b>' };
    const safe = sanitizeFormData(raw);
    expect(safe.count).toBe(42);
    expect(safe.active).toBe(true);
    expect(safe.name).toBe('Test');
  });
  it('returns an object with the same keys', () => {
    const raw  = { a: 'hello', b: 'world' };
    const safe = sanitizeFormData(raw);
    expect(Object.keys(safe)).toEqual(['a', 'b']);
  });
});
