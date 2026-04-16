# Phase 3 — Frontend / API Security: Role-Specific Documentation

**Module:** Frontend Security  
**Role:** Lojaina Ahmed (235097) — Frontend Developer  
**Project:** Secure Legal Case & Document Management System  
**Module:** 25CSCI34H Computer Systems Security — Dr. Ghada Elsayed  
**Date:** March 2026

---

## 1. Module Overview

This document details the design, implementation, and testing of the **Frontend Security Module** of the Secure Legal Management System (SLMS). The frontend is a React + TypeScript single-page application (SPA) responsible for:

- Authenticating users and managing session tokens
- Enforcing role-based access control (RBAC) at the UI layer
- Sanitizing all user inputs to prevent Cross-Site Scripting (XSS)
- Validating form data on the client side before API submission
- Securely managing browser storage for credentials
- Enforcing Content Security Policy (CSP) headers

---

## 2. Security Architecture

### 2.1 Layered Defence Model

The frontend applies a **defence-in-depth** strategy with four distinct security layers:

```
Layer 1: HTTP Security Headers (CSP, X-Frame-Options, X-Content-Type-Options)
         ↓
Layer 2: Input Validation (format, length, allowlist checks — validation.ts)
         ↓
Layer 3: Input Sanitization (DOMPurify XSS stripping — sanitize.ts)
         ↓
Layer 4: Secure Storage (sessionStorage + obfuscation — secureStorage.ts)
```

Each layer is independently implemented and tested, meaning a bypass of one layer is still caught by the next.

### 2.2 Component Architecture

```
src/
├── context/
│   └── AuthContext.tsx        # Centralised auth state, JWT parsing, auto-logout
├── utils/
│   ├── sanitize.ts            # DOMPurify XSS sanitization
│   ├── validation.ts          # Input validation (email, password, file, etc.)
│   └── secureStorage.ts       # Secure sessionStorage wrapper
├── components/
│   ├── LandingPage.tsx        # Public home page
│   ├── Login.tsx              # Authentication with attempt throttling
│   ├── Signup.tsx             # Registration with password strength enforcement
│   ├── Dashboard.tsx          # Main app — cases, documents, RBAC UI
│   ├── PasswordStrengthMeter.tsx  # Real-time password complexity indicator
│   ├── ProtectedRoute.tsx     # Authentication + authorisation route guard
│   └── UnauthorizedPage.tsx   # Shown on RBAC rejection
├── __tests__/
│   ├── setup.ts               # Vitest + Testing Library setup
│   ├── sanitize.test.ts       # XSS sanitization tests
│   ├── validation.test.ts     # Input validation tests
│   ├── secureStorage.test.ts  # Storage security tests
│   ├── authContext.test.ts    # JWT decode/validation tests
│   └── components.test.tsx    # Component-level security behaviour tests
├── App.tsx                    # Router with AuthProvider and ProtectedRoute guards
├── main.tsx                   # Entry point
index.html                     # CSP meta tag, security meta headers
vite.config.ts                 # HTTP security headers + Vitest config
```

---

## 3. Security Mechanisms Implemented

### 3.1 Content Security Policy (CSP)

**File:** `vite.config.ts`, `index.html`

CSP is enforced at two levels:

1. **HTTP response headers** (via Vite dev server config) — the authoritative enforcement mechanism
2. **HTML meta tag** (in `index.html`) — a secondary fallback

The policy applied:

```
default-src 'self';
script-src 'self' 'unsafe-inline';   ← required for Vite HMR & MUI emotion
style-src 'self' 'unsafe-inline';    ← required for MUI emotion CSS-in-JS
img-src 'self' data: blob:;
font-src 'self';
connect-src 'self' http://localhost:3000;
frame-src 'none';                    ← prevents clickjacking via iframes
object-src 'none';                   ← blocks Flash/plugin injection
```

**Security Impact:** Prevents unauthorised scripts from executing even if an XSS payload bypasses sanitization. Disabling `frame-src` prevents clickjacking.

**Additional headers:**
- `X-Frame-Options: DENY` — legacy clickjacking protection
- `X-Content-Type-Options: nosniff` — prevents MIME-type confusion attacks
- `X-XSS-Protection: 1; mode=block` — activates browser's built-in XSS filter
- `Referrer-Policy: strict-origin-when-cross-origin` — limits URL leakage
- `Permissions-Policy` — disables camera, microphone, geolocation

---

### 3.2 XSS Prevention — Input Sanitization

**File:** `src/utils/sanitize.ts`

All user-provided text inputs are sanitized using **DOMPurify** before being sent to the API. DOMPurify uses an allowlist approach — only known-safe HTML constructs survive.

For all form fields (case titles, names, descriptions, document titles), the configuration is:

```typescript
DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
```

This removes **all** HTML tags, leaving only the text content.

**Key function:** `sanitizeFormData(data)` — sanitizes every string field in a form object in one call, applied universally before every API submission.

**Example OWASP vectors neutralized:**
- `<script>alert("xss")</script>` → `""`
- `<img src=x onerror="alert(1)">` → `""`
- `<a href="javascript:void(0)">` → `""`
- `<<script>>alert(1)<</script>>` → `""`

**References:** Chechet et al. (2024); Ekpobimi et al. (2024)

---

### 3.3 Input Validation

**File:** `src/utils/validation.ts`

Client-side validation enforces data integrity and provides immediate user feedback. It complements (but does not replace) backend validation.

| Function | Rules Enforced |
|---|---|
| `validateEmail` | RFC 5322 format, max 254 chars |
| `validatePassword` | ≥8 chars, uppercase, lowercase, digit, special char, ≤128 chars |
| `checkPasswordStrength` | 5-criterion score + label + colour |
| `validateName` | Letters/hyphens/apostrophes only, 2–50 chars |
| `validateCaseNumber` | Alphanumeric + hyphens/slashes, 3–50 chars |
| `validateTitle` | 3–200 chars |
| `validateFile` | MIME allowlist (PDF, DOCX, TXT, JPEG, PNG), max 10 MB |

**Password complexity** (NIST SP 800-63B compliant):
> At least 8 characters, one uppercase, one lowercase, one digit, one special character. Maximum 128 characters to prevent bcrypt truncation DoS.

**File type allowlist** prevents malicious file uploads (executables, archives, scripts) from being submitted to the backend.

---

### 3.4 Authentication — JWT Management

**File:** `src/context/AuthContext.tsx`

The `AuthContext` module provides centralised, secure authentication state:

1. **JWT Decoding** (`parseJwt`) — decodes the payload section of the JWT to read the `exp` (expiry) claim, without verifying the signature (which is the backend's responsibility on every API call).

2. **Expiry Validation** (`isTokenValid`) — checks whether `Date.now() / 1000 < exp`. Expired tokens stored in sessionStorage are rejected on page load.

3. **Auto-Logout Timer** — `setTimeout` is set to fire precisely when the JWT expires, clearing storage and resetting auth state.

4. **Session Expiry Warning** — a warning alert appears 5 minutes before token expiry, prompting the user to save their work.

5. **Redirect After Login** — `useLocation` state from `ProtectedRoute` allows users to be returned to the page they originally requested after authentication.

---

### 3.5 Secure Storage

**File:** `src/utils/secureStorage.ts`

Tokens and roles are stored in **sessionStorage** (not localStorage) via a secure wrapper:

| Feature | Implementation |
|---|---|
| **Storage type** | `sessionStorage` — cleared automatically when the tab closes |
| **Namespace prefix** | `slms_` prefix on all keys prevents collisions with third-party scripts |
| **Obfuscation** | Base64-encoded reversed string — defeats naive automated harvesting scripts |
| **Isolation** | `secureClear()` removes only `slms_*` keys, leaving unrelated storage intact |

**Security rationale:** Using `localStorage` is a known vulnerability — tokens persist across browser restarts and are accessible to any same-origin JavaScript (including injected scripts). `sessionStorage` is tab-scoped and cleared on close, significantly reducing the exposure window of a compromised token.

---

### 3.6 Role-Based Access Control (RBAC) — UI Layer

**Files:** `src/components/ProtectedRoute.tsx`, `src/components/Dashboard.tsx`

The system supports four roles: `ADMIN`, `LAWYER`, `PARALEGAL`, `CLIENT`.

**Route-level RBAC** (`ProtectedRoute`):
- Gate 1: Unauthenticated users are redirected to `/login`
- Gate 2: Users with insufficient roles are redirected to `/unauthorized`

**Feature-level RBAC** (Dashboard):
- "New Case" button: visible only to `ADMIN` and `LAWYER` roles
- Upload document: restricted to users who have at least one case
- Role chip displayed in the header for user awareness

**Note:** UI RBAC is a usability and first-line defence layer. The backend API enforces the same rules on every request via JWT role claims.

---

### 3.7 Login Attempt Throttling

**File:** `src/components/Login.tsx`

After **5 consecutive failed login attempts**, the login button is disabled for **30 seconds**. A countdown timer is displayed. This provides client-side rate-limit feedback, while the server enforces its own independent rate limiting.

**Generic error messages** are used — the UI never reveals whether the email or password was incorrect, preventing user enumeration attacks.

---

## 4. Functional Testing

### 4.1 Testing Framework

- **Vitest** — test runner (Jest-compatible, Vite-native)
- **@testing-library/react** — component rendering and interaction
- **@testing-library/user-event** — realistic user input simulation
- **@testing-library/jest-dom** — DOM assertion matchers
- **jsdom** — simulated browser environment

### 4.2 Test Files and Coverage

| Test File | Module Under Test | # Tests |
|---|---|---|
| `sanitize.test.ts` | `sanitize.ts` | 15 |
| `validation.test.ts` | `validation.ts` | 30 |
| `secureStorage.test.ts` | `secureStorage.ts` | 12 |
| `authContext.test.ts` | `AuthContext.tsx` (JWT utils) | 10 |
| `components.test.tsx` | Login, Signup, PasswordStrengthMeter, ProtectedRoute | 12 |
| **Total** | | **~79** |

### 4.3 Running the Tests

```bash
# Install dependencies
npm install

# Run all tests once
npm test

# Run tests in watch mode (development)
npm run test:watch

# Run with coverage report
npm run test:coverage
```

### 4.4 Key Test Scenarios

**XSS Prevention (sanitize.test.ts):**
- Script tag injection: `<script>alert("xss")</script>Hello` → `Hello`
- Inline event handler: `<img onerror="alert(1)">` → stripped
- javascript: URI: `<a href="javascript:...">` → stripped
- SVG XSS: `<svg onload="alert(1)">` → stripped
- Nested injection: `<<script>>` → stripped

**Password Validation (validation.test.ts):**
- Fully compliant password accepted
- Missing uppercase / lowercase / digit / special → specific error
- Password < 8 chars rejected; > 128 chars rejected
- Strength meter correctly scores 0–5 criteria

**Secure Storage (secureStorage.test.ts):**
- Raw value NOT stored in plaintext
- Namespace prefix applied to all keys
- `secureClear` removes only app keys, not third-party keys
- Retrieval of non-existent key returns null (no crash)

**JWT Validation (authContext.test.ts):**
- Future `exp` → valid
- Past `exp` → invalid
- No `exp` claim → valid (treated as non-expiring)
- Malformed token → null / false

**Component Behaviour (components.test.tsx):**
- Invalid email format → validation error shown (no API call)
- Empty password → error shown
- Password mismatch → error shown before API call
- Unauthenticated user → redirected to /login by ProtectedRoute
- PasswordStrengthMeter renders/updates dynamically

---

## 5. Interfaces with Other Modules

### 5.1 API Endpoints Consumed

| Endpoint | Method | Auth | Frontend Usage |
|---|---|---|---|
| `/api/auth/register` | POST | None | Signup form |
| `/api/auth/login` | POST | None | Login form |
| `/api/cases` | GET | Bearer JWT | Dashboard — load cases |
| `/api/cases` | POST | Bearer JWT | Dashboard — create case |
| `/api/documents` | GET | Bearer JWT | Dashboard — load documents |
| `/api/documents/upload` | POST | Bearer JWT | Dashboard — upload file |
| `/api/documents/:id` | GET | Bearer JWT | Dashboard — secure download |

### 5.2 Token Usage

- JWT received from `/api/auth/login` → stored via `secureStorage`
- Included as `Authorization: Bearer <token>` on every authenticated request
- Role claim extracted from JWT payload for UI RBAC decisions

### 5.3 Security Alerts from Backend

- HTTP `403` on document download → interpreted as SHA-256 hash mismatch → displayed as **Security Alert** to the user

---

## 6. Threats Mitigated

| Threat (from Risk Analysis) | Mitigation Implemented |
|---|---|
| XSS / Script Injection | DOMPurify sanitization + CSP headers |
| CSRF | Short-lived JWT (stateless) + CSP `connect-src` restriction |
| Clickjacking | `X-Frame-Options: DENY` + CSP `frame-src: none` |
| MIME Sniffing | `X-Content-Type-Options: nosniff` |
| Session Hijacking | sessionStorage (tab-scoped) + JWT expiry enforcement |
| Weak Credentials | Password complexity validation + strength meter |
| Unauthorised Access | ProtectedRoute + RBAC checks + JWT auto-logout |
| Document Tampering | SHA-256 mismatch alert surfaced from backend |
| Brute Force Login | UI attempt counter (5 attempts → 30s lockout) |
| Malicious File Upload | MIME type allowlist + 10 MB size cap |

---

## 7. References

1. K. Abdulghaffar, N. Elmrabit, and M. Yousefi, "Enhancing Web Application Security through Automated Penetration Testing with Multiple Vulnerability Scanners," *Computers*, vol. 12, no. 11, p. 235, Nov. 2023.
2. E. Hellquist, "Evaluating Security for JavaScript-based Frontend Frameworks," Master's thesis, Umeå University, 2024.
3. H. O. Ekpobimi, R. C. Kandekere, and A. A. Fasanmade, "Front-end development and cybersecurity: A conceptual approach to building secure web applications," *CSITRJ*, vol. 5, no. 9, pp. 2154–2168, Sept. 2024.
4. A. S. Chechet, M. V. Chernykh, I. S. Panasiuk, and I. I. Abdullin, "Front-end Security Architecture: Protection of User Data and Privacy," *Astana IT University*, 2024.
5. G. C. de Amorim and E. D. Canedo, "Micro-Frontend Architecture in Software Development," *ICSOFT*, 2023.
6. G. Ramakrishnan, "Scaling Modern Frontend Development," *IJCA*, vol. 186, no. 65, 2025.
