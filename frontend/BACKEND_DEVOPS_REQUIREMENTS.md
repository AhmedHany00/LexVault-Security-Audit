# Backend & DevOps Requirements
## For Frontend Completion — Secure Legal Case & Document Management System
**Prepared by:** Frontend Team (Lojaina Ahmed — 235097)
**Date:** March 2026

---

## Overview

The frontend is fully built and tested. The following API endpoints and infrastructure changes are required from the backend and DevOps teams to activate all remaining frontend features. Every feature listed below has its UI already implemented — it is waiting on the server routes.

---

## 1. BACKEND — Required API Endpoints

### 1.1 Case Management

#### `PUT /api/cases/:id` — Edit an existing case
**Required by:** Edit Case modal (admin + assigned lawyer)

Request body:
```json
{
  "title":             "Updated Title",
  "description":       "Updated description text",
  "status":            "Active",
  "lawyerId":          "uuid-of-lawyer",
  "clientId":          "uuid-of-client",
  "attachDocumentIds": ["doc-uuid-1", "doc-uuid-2"],
  "detachDocumentIds": ["doc-uuid-3"]
}
```

All fields are optional — only send what changed.

**Access control:**
- `ADMIN`: can update all fields including `lawyerId` and `clientId`
- `LAWYER`: can update `title`, `description`, `status`, `attachDocumentIds`, `detachDocumentIds` only for cases where `assignedLawyer.id === req.user.userId`
- Others: `403 Forbidden`

**Frontend behaviour when this is added:** The Edit Case modal will immediately start saving changes. Currently it silently ignores the `404` response to avoid confusing the user.

---

### 1.2 Document Management

#### `PUT /api/documents/:id` — Edit document metadata
**Required by:** Document edit functionality

Request body:
```json
{
  "title":  "Updated document title",
  "caseId": "uuid-of-new-case"
}
```

**Access control:**
- `ADMIN` and `LAWYER` (who uploaded it): can update
- Others: `403 Forbidden`

**Frontend behaviour when this is added:** The Document View modal will allow editing title and re-assigning to a different case. Currently the info button shows document details read-only.

---

#### `POST /api/documents` — Support independent (case-less) document upload
**Required by:** Uploading documents without linking them to a case

Currently the backend requires `caseId` as a mandatory field. Making it optional would allow:
- Documents to be uploaded without a case
- Documents to be linked to a case later via `PUT /api/documents/:id`

**Frontend note:** The upload dialog already shows an informational message about this limitation.

---

### 1.3 User Management

#### `GET /api/users` — List all registered users
**Required by:** Lawyer/client dropdowns in Create Case and Edit Case dialogs

Response shape:
```json
{
  "users": [
    {
      "id":        "uuid",
      "firstName": "Jane",
      "lastName":  "Smith",
      "email":     "jane@firm.com",
      "role":      "lawyer"
    }
  ]
}
```

**Access control:**
- `ADMIN`: full list
- `LAWYER`: only users with role `client` and `paralegal`
- Others: `403 Forbidden`

**Frontend behaviour when this is added:** Replace the current `localStorage` registry workaround. All registered users will appear in dropdowns immediately, even if they have never been linked to a case.

**Current workaround:** The frontend maintains a `slms_user_registry` in `localStorage` populated on every successful login. This works but only shows users who have logged in at least once on this browser.

---

#### `PUT /api/auth/profile` — Update user profile (name and email)
**Required by:** Profile modal "Edit" functionality

Request body:
```json
{
  "firstName": "Jane",
  "lastName":  "Smith",
  "email":     "newemail@firm.com"
}
```

**Access control:** Authenticated user can only update their own profile.

**Frontend note:** Name/email edits currently save to `localStorage` only and update the UI locally. Once this endpoint exists, the frontend will send the update to the server and the changes will persist across all devices/browsers.

---

#### `POST /api/auth/change-password` — Change account password
**Required by:** Profile modal "Change Password" section

Request body:
```json
{
  "currentPassword": "OldPassword1!",
  "newPassword":     "NewPassword2@"
}
```

**Access control:** Authenticated user only.

**Frontend behaviour:** The Change Password form is already built. It shows the server's error message if the current password is wrong. Currently it shows a generic "not yet supported" error on failure.

---

### 1.4 Audit Log (optional enhancement)

#### `GET /api/audit` — Retrieve audit log entries
**Required by:** Audit log viewer (can be added as a new tab in the dashboard for admins)

Response shape:
```json
{
  "logs": [
    {
      "id":        "uuid",
      "action":    "UPLOAD_DOCUMENT",
      "details":   "Document abc uploaded to case CASE-2025-001",
      "userId":    "uuid",
      "createdAt": "2025-03-22T10:00:00Z"
    }
  ]
}
```

**Access control:** `ADMIN` only.

---

## 2. BACKEND — Route Registration

All new routes must be registered in `src/app.ts`. Current routing structure:

```typescript
if (url.startsWith('/api/auth'))      → handleAuthRoutes
if (url.startsWith('/api/cases'))     → handleCaseRoutes      // add PUT /:id here
if (url.startsWith('/api/documents')) → handleDocumentRoutes  // add PUT /:id here
// ADD:
if (url.startsWith('/api/users'))     → handleUserRoutes      // new
```

---

## 3. BACKEND — Database / Entity Changes

### 3.1 Document entity — make `caseId` optional
In `src/entities/Document.ts`, change the `case` relation to allow null:

```typescript
// Current:
@ManyToOne(() => Case, legalCase => legalCase.documents)
case!: Case;

// Required:
@ManyToOne(() => Case, legalCase => legalCase.documents, { nullable: true, eager: true })
case!: Case | null;
```

Also update `DocumentController.uploadDocument` to make `caseId` optional.

### 3.2 Document entity — add `eager: true` to case relation
The `GET /api/documents` response currently does not include the linked case data. Adding `eager: true` lets the frontend always resolve which case a document belongs to without a separate API call:

```typescript
@ManyToOne(() => Case, legalCase => legalCase.documents, { eager: true, nullable: true })
case!: Case | null;
```

---

## 4. DEVOPS — CI/CD Pipeline Updates

### 4.1 Environment variables
Add the following to `.env` and the Docker/pipeline configs when new routes are deployed:

```env
# Already present:
JWT_SECRET=your_secret
DB_PATH=./secure_legal_db.sqlite

# Add when profile endpoint is added:
ALLOW_PROFILE_UPDATE=true
```

### 4.2 CORS — restrict origin in production
Current `app.ts` sets `Access-Control-Allow-Origin: *`. In production, restrict to the deployed frontend domain:

```typescript
res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*');
```

Add `FRONTEND_URL` to the deployment environment variables.

### 4.3 Rate limiting
The frontend already implements client-side attempt throttling (5 failed logins → 30s lockout). The backend should add server-side rate limiting on:
- `POST /api/auth/login` — max 10 requests/minute per IP
- `POST /api/auth/register` — max 5 requests/minute per IP

Recommended: `express-rate-limit` or equivalent for Node.js.

### 4.4 HTTPS / TLS in production
The frontend currently connects to `http://localhost:3000`. In production, all API calls must use HTTPS. Update the `API` constant in the frontend once the deployment URL is known:

```typescript
// src/components/Dashboard.tsx (and other files)
const API = process.env.VITE_API_URL || 'http://localhost:3000';
```

Add `VITE_API_URL` to the Vite build config and Docker environment.

### 4.5 Database — production migration
The current SQLite database (`secure_legal_db.sqlite`) is fine for development. For production:
- Use PostgreSQL or MySQL
- Update `src/config/database.ts` with production connection details
- Run TypeORM migrations instead of `synchronize: true`

---

## 5. Summary Table

| Feature | Endpoint Needed | Team | Priority |
|---|---|---|---|
| Edit case (title, status, lawyer, client) | `PUT /api/cases/:id` | Backend | **High** |
| Edit document (title, re-link case) | `PUT /api/documents/:id` | Backend | **High** |
| Independent document upload | Make `caseId` optional in upload | Backend | **Medium** |
| Full user list in dropdowns | `GET /api/users` | Backend | **High** |
| Update profile (name, email) | `PUT /api/auth/profile` | Backend | **Medium** |
| Change password | `POST /api/auth/change-password` | Backend | **Medium** |
| Audit log viewer | `GET /api/audit` | Backend | Low |
| Document always shows linked case | `eager: true` on Document.case | Backend | **High** |
| Production HTTPS | Deployment config | DevOps | **High** |
| CORS restriction | `FRONTEND_URL` env var | DevOps | **High** |
| Server-side rate limiting | Login/register routes | Backend + DevOps | **Medium** |
| Production database | PostgreSQL migration | Backend + DevOps | **Medium** |

---

*All frontend UI for these features is already implemented and waiting. No frontend changes are needed once these backend routes are added.*
