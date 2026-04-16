export interface ValidationResult {
  valid: boolean;
  message: string;
}
export interface PasswordStrength {
  score: number;   
  label: 'Very Weak' | 'Weak' | 'Fair' | 'Strong' | 'Very Strong';
  color: string;
  checks: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    special: boolean;
  };
}
export const validateEmail = (email: string): ValidationResult => {
  if (!email || email.trim().length === 0) {
    return { valid: false, message: 'Email is required.' };
  }
  const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email.trim())) {
    return { valid: false, message: 'Please enter a valid email address.' };
  }
  if (email.length > 254) {
    return { valid: false, message: 'Email address is too long.' };
  }
  return { valid: true, message: '' };
};
// ─── Password ─────────────────────────────────────────────────────────────────
/**
 * Checks password against all complexity requirements.
 * Returns detailed per-criterion breakdown for the strength meter.
 */
export const checkPasswordStrength = (password: string): PasswordStrength => {
  const checks = {
    length:    password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number:    /[0-9]/.test(password),
    special:   /[^A-Za-z0-9]/.test(password),
  };
  const score = Object.values(checks).filter(Boolean).length;
  const labels: PasswordStrength['label'][] = [
    'Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong',
  ];
  const colors = ['#d32f2f', '#f57c00', '#fbc02d', '#388e3c', '#1b5e20'];
  return {
    score,
    label:  labels[Math.min(score, 4)] ?? 'Very Weak',
    color:  colors[Math.min(score, 4)] ?? '#d32f2f',
    checks,
  };
};
export const validatePassword = (password: string): ValidationResult => {
  if (!password) {
    return { valid: false, message: 'Password is required.' };
  }
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter.' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter.' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number.' };
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one special character (!@#$%^&* etc.).' };
  }
  if (password.length > 128) {
    return { valid: false, message: 'Password must not exceed 128 characters.' };
  }
  return { valid: true, message: '' };
};
// ─── Name ─────────────────────────────────────────────────────────────────────
/**
 * Validates a person's first or last name.
 */
export const validateName = (name: string, field = 'Name'): ValidationResult => {
  if (!name || name.trim().length === 0) {
    return { valid: false, message: `${field} is required.` };
  }
  if (name.trim().length < 2) {
    return { valid: false, message: `${field} must be at least 2 characters.` };
  }
  if (name.trim().length > 50) {
    return { valid: false, message: `${field} must be at most 50 characters.` };
  }
  if (!/^[a-zA-Z\s'\-]+$/.test(name.trim())) {
    return { valid: false, message: `${field} may only contain letters, spaces, hyphens, and apostrophes.` };
  }
  return { valid: true, message: '' };
};
// ─── Case fields ──────────────────────────────────────────────────────────────
/**
 * Validates a legal case number (alphanumeric, hyphens, slashes).
 * Example valid formats: CASE-2025-001, 2025/CIV/42
 */
export const validateCaseNumber = (caseNumber: string): ValidationResult => {
  if (!caseNumber || caseNumber.trim().length === 0) {
    return { valid: false, message: 'Case number is required.' };
  }
  if (caseNumber.trim().length < 3) {
    return { valid: false, message: 'Case number must be at least 3 characters.' };
  }
  if (caseNumber.trim().length > 50) {
    return { valid: false, message: 'Case number must be at most 50 characters.' };
  }
  if (!/^[A-Za-z0-9\-\/]+$/.test(caseNumber.trim())) {
    return {
      valid: false,
      message: 'Case number may only contain letters, numbers, hyphens, and forward-slashes.',
    };
  }
  return { valid: true, message: '' };
};
/**
 * Validates a generic title field (case title, document title).
 */
export const validateTitle = (title: string, field = 'Title'): ValidationResult => {
  if (!title || title.trim().length === 0) {
    return { valid: false, message: `${field} is required.` };
  }
  if (title.trim().length < 3) {
    return { valid: false, message: `${field} must be at least 3 characters.` };
  }
  if (title.trim().length > 200) {
    return { valid: false, message: `${field} must be at most 200 characters.` };
  }
  return { valid: true, message: '' };
};
// ─── File upload ──────────────────────────────────────────────────────────────
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/jpeg',
  'image/png',
];
const MAX_FILE_SIZE_MB = 10;
export const generateCaseNumber = (): string => {
  const year  = new Date().getFullYear();
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const rand  = Array.from(
    { length: 6 },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join('');
  return `CASE-${year}-${rand}`;
};
export const validateFile = (file: File): ValidationResult => {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      message: `File type "${file.type}" is not allowed. Accepted types: PDF, Word, TXT, JPEG, PNG.`,
    };
  }
  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB > MAX_FILE_SIZE_MB) {
    return {
      valid: false,
      message: `File size (${sizeMB.toFixed(1)} MB) exceeds the ${MAX_FILE_SIZE_MB} MB limit.`,
    };
  }
  return { valid: true, message: '' };
};
