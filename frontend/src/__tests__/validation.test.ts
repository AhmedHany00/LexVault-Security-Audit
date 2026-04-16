import { describe, it, expect } from 'vitest';
import {
  validateEmail,
  validatePassword,
  checkPasswordStrength,
  validateName,
  validateCaseNumber,
  validateTitle,
  validateFile,
} from '../utils/validation';
describe('validateEmail', () => {
  it('accepts a valid email address', () => {
    expect(validateEmail('lawyer@firm.com').valid).toBe(true);
  });
  it('accepts email with subdomain', () => {
    expect(validateEmail('user@mail.example.co.uk').valid).toBe(true);
  });
  it('rejects email without @', () => {
    expect(validateEmail('notanemail').valid).toBe(false);
  });
  it('rejects email without domain TLD', () => {
    expect(validateEmail('user@domain').valid).toBe(false);
  });
  it('rejects empty string', () => {
    const r = validateEmail('');
    expect(r.valid).toBe(false);
    expect(r.message).toContain('required');
  });
  it('rejects email longer than 254 characters', () => {
    const localPart = 'a'.repeat(64); 
    const domainPart = 'b'.repeat(185) + '.com'; 
    const long = `${localPart}@${domainPart}`; 
    expect(validateEmail(long + 'm').valid).toBe(false); 
  });
  it('rejects email with spaces', () => {
    expect(validateEmail('user @example.com').valid).toBe(false);
  });
});
describe('validatePassword', () => {
  it('accepts a fully compliant password', () => {
    expect(validatePassword('SecureP@ss1!').valid).toBe(true);
  });
  it('rejects a password shorter than 8 characters', () => {
    const r = validatePassword('Ab1!');
    expect(r.valid).toBe(false);
    expect(r.message).toContain('8 characters');
  });
  it('rejects a password without uppercase letters', () => {
    const r = validatePassword('lowercase1!');
    expect(r.valid).toBe(false);
    expect(r.message).toContain('uppercase');
  });
  it('rejects a password without lowercase letters', () => {
    const r = validatePassword('UPPERCASE1!');
    expect(r.valid).toBe(false);
    expect(r.message).toContain('lowercase');
  });
  it('rejects a password without a numeric digit', () => {
    const r = validatePassword('NoNumbers!');
    expect(r.valid).toBe(false);
    expect(r.message).toContain('number');
  });
  it('rejects a password without a special character', () => {
    const r = validatePassword('NoSpecial1');
    expect(r.valid).toBe(false);
    expect(r.message).toContain('special');
  });
  it('rejects an empty password', () => {
    const r = validatePassword('');
    expect(r.valid).toBe(false);
    expect(r.message).toContain('required');
  });
  it('rejects a password exceeding 128 characters', () => {
    const r = validatePassword('Aa1!' + 'x'.repeat(125));
    expect(r.valid).toBe(false);
    expect(r.message).toContain('128');
  });
});
describe('checkPasswordStrength', () => {
  it('scores 0 for an empty password', () => {
    expect(checkPasswordStrength('').score).toBe(0);
  });
  it('scores 1 for only 8+ chars criterion met', () => {
    expect(checkPasswordStrength('longenough').score).toBe(2); 
  });
  it('scores 5 for a fully complex password', () => {
    const s = checkPasswordStrength('Secure@Pass1!');
    expect(s.score).toBe(5);
    expect(s.label).toBe('Very Strong');
  });
  it('assigns "Weak" label for score 1', () => {
    expect(checkPasswordStrength('a').label).toBe('Weak');
  });
  it('reflects correct colour at each strength level', () => {
    const weak   = checkPasswordStrength('abc');   
    const strong = checkPasswordStrength('Secure@1!Pass');
    expect(weak.color).not.toBe(strong.color);
  });
  it('correctly reports individual checks', () => {
    const s = checkPasswordStrength('Hello@1!');
    expect(s.checks.uppercase).toBe(true);
    expect(s.checks.lowercase).toBe(true);
    expect(s.checks.number).toBe(true);
    expect(s.checks.special).toBe(true);
    expect(s.checks.length).toBe(true);
  });
});
describe('validateName', () => {
  it('accepts a simple valid name', () => {
    expect(validateName('Alice', 'First name').valid).toBe(true);
  });
  it('accepts names with hyphens and apostrophes', () => {
    expect(validateName("O'Brien", 'Last name').valid).toBe(true);
    expect(validateName('Smith-Jones', 'Last name').valid).toBe(true);
  });
  it('rejects names shorter than 2 characters', () => {
    expect(validateName('A', 'First name').valid).toBe(false);
  });
  it('rejects names longer than 50 characters', () => {
    expect(validateName('A'.repeat(51), 'First name').valid).toBe(false);
  });
  it('rejects names containing numbers', () => {
    expect(validateName('Alice1', 'First name').valid).toBe(false);
  });
  it('rejects empty name', () => {
    const r = validateName('', 'First name');
    expect(r.valid).toBe(false);
    expect(r.message).toContain('required');
  });
});
describe('validateCaseNumber', () => {
  it('accepts standard case number format', () => {
    expect(validateCaseNumber('CASE-2025-001').valid).toBe(true);
  });
  it('accepts slash-separated format', () => {
    expect(validateCaseNumber('2025/CIV/42').valid).toBe(true);
  });
  it('rejects case numbers with spaces', () => {
    expect(validateCaseNumber('CASE 001').valid).toBe(false);
  });
  it('rejects case numbers with special characters', () => {
    expect(validateCaseNumber('CASE#001').valid).toBe(false);
  });
  it('rejects empty case number', () => {
    expect(validateCaseNumber('').valid).toBe(false);
  });
  it('rejects case number shorter than 3 characters', () => {
    expect(validateCaseNumber('AB').valid).toBe(false);
  });
});
describe('validateTitle', () => {
  it('accepts a normal title', () => {
    expect(validateTitle('Smith Inheritance Case 2025').valid).toBe(true);
  });
  it('rejects empty title', () => {
    expect(validateTitle('').valid).toBe(false);
  });
  it('rejects title shorter than 3 characters', () => {
    expect(validateTitle('Hi').valid).toBe(false);
  });
  it('rejects title longer than 200 characters', () => {
    expect(validateTitle('A'.repeat(201)).valid).toBe(false);
  });
});
describe('validateFile', () => {
  const makeFile = (name: string, type: string, sizeBytes: number): File => {
    const blob = new Blob([new Uint8Array(sizeBytes)], { type });
    return new File([blob], name, { type });
  };
  it('accepts a valid PDF file under 10 MB', () => {
    const f = makeFile('doc.pdf', 'application/pdf', 1024 * 1024);
    expect(validateFile(f).valid).toBe(true);
  });
  it('accepts a plain text file', () => {
    const f = makeFile('notes.txt', 'text/plain', 512);
    expect(validateFile(f).valid).toBe(true);
  });
  it('accepts a JPEG image', () => {
    const f = makeFile('scan.jpg', 'image/jpeg', 2048);
    expect(validateFile(f).valid).toBe(true);
  });
  it('rejects an executable file type', () => {
    const f = makeFile('virus.exe', 'application/x-msdownload', 1024);
    const r = validateFile(f);
    expect(r.valid).toBe(false);
    expect(r.message).toContain('not allowed');
  });
  it('rejects a ZIP archive', () => {
    const f = makeFile('archive.zip', 'application/zip', 1024);
    expect(validateFile(f).valid).toBe(false);
  });
  it('rejects a file exceeding the 10 MB size limit', () => {
    const elevenMB = 11 * 1024 * 1024;
    const f = makeFile('large.pdf', 'application/pdf', elevenMB);
    const r = validateFile(f);
    expect(r.valid).toBe(false);
    expect(r.message).toContain('10 MB');
  });
  it('accepts a file exactly at the 10 MB boundary', () => {
    const tenMB = 10 * 1024 * 1024;
    const f = makeFile('exact.pdf', 'application/pdf', tenMB);
    expect(validateFile(f).valid).toBe(true);
  });
});
