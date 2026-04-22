# API Contract

**Version**: 1.0  
**Base URL**: `/api/v1`  
**Authentication**: JWT Bearer token in `Authorization` header

---

## Authentication

### POST /auth/login
**Description**: Authenticate user and receive JWT token

**Request**:
```json
{
  "email": "user@example.com",
  "password": "hashed-password"
}
```

**Response** (200 OK):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User Name",
    "role": "user" | "administrator"
  },
  "expiresAt": "2026-04-22T14:30:00Z"
}
```

**Errors**:
- 401: Invalid credentials
- 400: Malformed request

---

### POST /auth/refresh
**Description**: Refresh an expiring token

**Request**:
```json
{
  "token": "current-token-here"
}
```

**Response** (200 OK):
```json
{
  "token": "new-token-here",
  "expiresAt": "2026-04-22T14:30:00Z"
}
```

**Errors**:
- 401: Token invalid or expired
- 400: Malformed request

---

## Ideas

### GET /ideas
**Description**: List published ideas with pagination and filtering

**Query Parameters**:
- `page` (integer, default: 1): Page number
- `pageSize` (integer, default: 20, max: 100): Items per page
- `author` (string, optional): Filter by author email
- `status` (enum, optional): Filter by status (`published`, `draft`, `archived`)
- `tags` (comma-separated strings, optional): Filter by tags (OR logic)
- `dateFrom` (ISO 8601, optional): Filter by creation date >= this value
- `dateTo` (ISO 8601, optional): Filter by creation date <= this value
- `search` (string, optional): Full-text search across summary, goals, requirements

**Response** (200 OK):
```json
{
  "ideas": [
    {
      "id": "uuid",
      "title": "Idea Title",
      "author": {
        "id": "uuid",
        "name": "Author Name",
        "email": "author@example.com"
      },
      "status": "published",
      "summary": "Brief summary excerpt...",
      "tags": ["backend", "api", "authentication"],
      "createdAt": "2026-04-20T10:00:00Z",
      "publishedAt": "2026-04-20T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 157,
    "totalPages": 8
  }
}
```

**Errors**:
- 400: Invalid query parameters
- 401: Not authenticated

---

### GET /ideas/:id
**Description**: Get detailed information for a single idea

**Path Parameters**:
- `id` (UUID): Idea identifier

**Response** (200 OK):
```json
{
  "id": "uuid",
  "title": "Idea Title",
  "author": {
    "id": "uuid",
    "name": "Author Name",
    "email": "author@example.com"
  },
  "status": "published",
  "metadata": {
    "summary": "Brief summary excerpt...",
    "goals": "Full goals section from spec...",
    "requirements": "Full requirements list from spec...",
    "tags": ["backend", "api"]
  },
  "artifacts": [
    {
      "id": "uuid",
      "filePath": "spec.md",
      "fileType": "specification",
      "contentType": "text/markdown",
      "sizeBytes": 12345,
      "url": "/git/ideas/001/spec.md"
    }
  ],
  "gitPath": "ideas/001",
  "gitCommitSha": "abc123...",
  "createdAt": "2026-04-20T10:00:00Z",
  "publishedAt": "2026-04-20T12:00:00Z",
  "updatedAt": "2026-04-20T12:00:00Z"
}
```

**Errors**:
- 404: Idea not found
- 401: Not authenticated

---

### POST /ideas
**Description**: Publish a new idea (creates both git commit and database record atomically)

**Request**:
```json
{
  "title": "Idea Title",
  "specification": "# Spec content in markdown...",
  "artifacts": [
    {
      "filePath": "diagrams/architecture.png",
      "content": "base64-encoded-content",
      "contentType": "image/png"
    }
  ],
  "tags": ["backend", "api"],
  "metadata": {
    "summary": "Auto-extracted or user-provided summary",
    "goals": "Extracted goals section",
    "requirements": "Extracted requirements"
  }
}
```

**Response** (201 Created):
```json
{
  "id": "uuid",
  "title": "Idea Title",
  "gitPath": "ideas/002",
  "gitCommitSha": "def456...",
  "status": "published",
  "createdAt": "2026-04-21T14:30:00Z",
  "publishedAt": "2026-04-21T14:30:00Z"
}
```

**Errors**:
- 400: Invalid request (validation failure)
- 401: Not authenticated
- 409: Conflict (duplicate title or git path collision)
- 500: Atomic transaction failure (partial publish - both git and DB rolled back)

---

## Templates (Admin Only)

### GET /templates
**Description**: List available templates

**Query Parameters**:
- `type` (enum, optional): Filter by type (`spec`, `guideline`)

**Response** (200 OK):
```json
{
  "templates": [
    {
      "id": "uuid",
      "name": "default-spec-template",
      "filePath": "spec-templates/default.md",
      "templateType": "spec",
      "currentVersionSha": "abc123...",
      "lastSyncAt": "2026-04-21T10:00:00Z"
    }
  ]
}
```

**Errors**:
- 401: Not authenticated
- 403: Not an administrator

---

### GET /templates/:id
**Description**: Get template content

**Path Parameters**:
- `id` (UUID): Template identifier

**Response** (200 OK):
```json
{
  "id": "uuid",
  "name": "default-spec-template",
  "content": "# Template content in markdown...",
  "filePath": "spec-templates/default.md",
  "templateType": "spec",
  "currentVersionSha": "abc123...",
  "lastSyncAt": "2026-04-21T10:00:00Z"
}
```

**Errors**:
- 404: Template not found
- 401: Not authenticated
- 403: Not an administrator

---

### PUT /templates/:id
**Description**: Update template content (validates, commits to git)

**Path Parameters**:
- `id` (UUID): Template identifier

**Request**:
```json
{
  "content": "# Updated template content...",
  "commitMessage": "Update spec template to include new section"
}
```

**Response** (200 OK):
```json
{
  "id": "uuid",
  "currentVersionSha": "new-sha-here...",
  "validationResults": {
    "syntax": "valid",
    "semantic": "valid"
  },
  "updatedAt": "2026-04-21T14:35:00Z"
}
```

**Errors**:
- 400: Validation failure (syntax or semantic errors)
- 401: Not authenticated
- 403: Not an administrator
- 404: Template not found
- 500: Git commit failed

---

## Health & Status

### GET /health
**Description**: Health check endpoint

**Response** (200 OK):
```json
{
  "status": "healthy",
  "timestamp": "2026-04-21T14:30:00Z",
  "services": {
    "database": "connected",
    "git": "accessible",
    "templateSync": "up-to-date"
  }
}
```

**Errors**: None (always returns 200, status field indicates health)

---

## Error Response Format

All error responses follow this structure:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "Specific field that failed",
      "reason": "Detailed reason"
    }
  },
  "timestamp": "2026-04-21T14:30:00Z"
}
```

---

## Rate Limiting

- **Authenticated requests**: 1000 requests per hour per user
- **Unauthenticated requests**: 100 requests per hour per IP
- **Template updates**: 10 updates per hour per administrator

Rate limit headers included in all responses:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining in current window
- `X-RateLimit-Reset`: Timestamp when limit resets

---

## Versioning

API version specified in URL path (`/api/v1`). Breaking changes require new version (`/api/v2`).

**Deprecation Policy**: Versions supported for 12 months after new version release.
