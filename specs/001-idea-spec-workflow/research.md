# Research & Technical Decisions

**Feature**: Idea Validation and Spec Generation Workflow  
**Date**: 2026-04-21  
**Status**: Phase 0 Complete

## Research Questions

### 1. Primary Implementation Language

**Decision**: TypeScript with Node.js runtime

**Rationale**:
- Claude Code skills are typically implemented in TypeScript/JavaScript
- Node.js provides excellent git library support (isomorphic-git, simple-git)
- Strong ecosystem for web servers (Express, Fastify, Next.js)
- JWT libraries mature and well-supported (jsonwebtoken, jose)
- Template engines readily available (Handlebars, EJS, Liquid)
- Unified language across frontend, backend, and CLI components

**Alternatives Considered**:
- **Python**: Strong for CLI and data processing, but would split stack (Python CLI + JS frontend + ? backend)
- **Rust**: Excellent performance and safety, but steeper learning curve and less suitable for rapid prototype/iteration
- **Go**: Good for backend services, but less ideal for Claude Code skills which favor JS/TS

---

### 2. Testing Framework

**Decision**: Vitest for backend/shared code, Jest for frontend

**Rationale**:
- Vitest: Fast, modern, ESM-native test runner compatible with Vite build tool
- Jest: Industry standard for React/frontend testing, mature ecosystem
- Both support TypeScript natively
- Similar API (Vitest is Jest-compatible)allows code reuse

**Alternatives Considered**:
- **Mocha + Chai**: More configuration required, less integrated
- **AVA**: Excellent but less commonly used, smaller ecosystem
- **Node test runner**: Built-in but less feature-complete than Vitest/Jest

---

### 3. Database Choice

**Decision**: PostgreSQL 14+

**Rationale**:
- Full-text search capabilities (tsvector, tsquery) for idea content
- JSON/JSONB support for flexible metadata storage
- Strong ACID guarantees for atomic transaction rollback
- Mature ecosystem with excellent Node.js drivers (pg, node-postgres)
- Free and open-source
- Supports role-based access control natively

**Alternatives Considered**:
- **MongoDB**: Good for document storage but weaker transaction semantics
- **SQLite**: Simpler but limited concurrency, less suitable for web app
- **MySQL/MariaDB**: Viable but PostgreSQL's full-text search is superior

---

### 4. Git Library

**Decision**: simple-git (Node.js wrapper for git CLI)

**Rationale**:
- Wraps native git commands - leverages battle-tested git implementation
- Supports all git operations needed (clone, fetch, pull, push, commit)
- Handles authentication via git credential helpers
- Mature library with active maintenance
- Better performance for large repos than pure-JS alternatives

**Alternatives Considered**:
- **isomorphic-git**: Pure JavaScript implementation, no git CLI dependency, but slower for large ops
- **nodegit**: Native bindings to libgit2, fast but complex build requirements
- **Direct CLI spawning**: More control but requires more error handling

---

### 5. JWT Library

**Decision**: jsonwebtoken (node-jsonwebtoken)

**Rationale**:
- Industry standard for Node.js JWT handling
- Supports all major algorithms (RS256, HS256, etc.)
- Simple API for sign/verify operations
- Widely used and well-documented
- Integrates well with Express/Fastify middleware

**Alternatives Considered**:
- **jose**: More modern, standards-compliant, but less adoption
- **passport-jwt**: Higher-level but more opinionated, ties to Passport ecosystem

---

### 6. Template Engine

**Decision**: Handlebars

**Rationale**:
- Logic-less templates enforce separation of concerns
- Simple variable substitution and iteration
- Pre-compilation for performance
- No arbitrary code execution (security benefit)
- Markdown-friendly (templates can be valid Markdown)

**Alternatives Considered**:
- **EJS**: Allows JavaScript in templates (security risk)
- **Liquid**: Good but more complex syntax
- **Mustache**: Too minimal, lacks helpers

---

### 7. Frontend Framework

**Decision**: React with Next.js

**Rationale**:
- React: Component reusability, large ecosystem, strong TypeScript support
- Next.js: Built-in routing, API routes, SSR/SSG capabilities
- Excellent developer experience (hot reload, debugging)
- Can serve both static UI and API endpoints from same process
- Strong community and tooling

**Alternatives Considered**:
- **Vue + Nuxt**: Simpler learning curve but smaller ecosystem
- **Svelte + SvelteKit**: Excellent performance but less mature tooling
- **Vanilla JS**: Too much boilerplate for complex UI

---

### 8. API Framework

**Decision**: Express.js (within Next.js API routes initially, can extract later)

**Rationale**:
- Minimal, unopinionated framework
- Middleware ecosystem for auth, validation, logging
- Can embed in Next.js or run standalone
- Battle-tested and well-understood
- Easy to add OpenAPI/Swagger documentation

**Alternatives Considered**:
- **Fastify**: Faster but less ecosystem maturity
- **Nest.js**: Full-featured but heavy, over-engineered for this scope
- **Hono**: Modern and fast but less adoption

---

### 9. Atomic Transaction Strategy

**Decision**: Saga pattern with compensating transactions

**Implementation**:
1. Begin transaction: Mark intent in database
2. Execute git push
3. If git succeeds: Commit database transaction
4. If git fails: Roll back database entry
5. If database fails after git: Revert git commit via `git reset --hard HEAD~1 && git push --force` (requires careful coordination)

**Alternative**: Two-phase commit protocol (more complex, requires distributed transaction coordinator)

**Rationale**: Saga pattern is simpler for this use case, handles network failures better, and git operations can be compensated via force-push if needed (acceptable since we control the repo).

---

### 10. Session State Storage Format

**Decision**: JSON files in `~/.claude/idea-workflow/sessions/`

**Rationale**:
- Simple read/write operations
- Human-readable for debugging
- No database dependency for session state
- Session ID can be UUID in filename
- Automatic cleanup via cron/scheduled task

**Alternatives Considered**:
- **Database**: Adds complexity, not needed for ephemeral data
- **In-memory**: Lost on restart, not suitable for pause/resume

---

### 11. Template Update Caching

**Decision**: Last-check timestamp file in `~/.claude/idea-workflow/template-cache.json`

**Format**:
```json
{
  "lastCheckTimestamp": "2026-04-21T14:30:00Z",
  "lastSuccessfulUpdate": "2026-04-21T14:30:00Z",
  "currentVersion": "commit-sha-here"
}
```

**Rationale**: Simple file-based cache, no database needed, timestamp comparison for 24-hour intervals.

---

## Technology Stack Summary

**Frontend**:
- React 18+ with TypeScript
- Next.js 14+ (App Router)
- TanStack Query for data fetching
- Tailwind CSS for styling

**Backend**:
- Node.js 18+ LTS
- Express.js (via Next.js API routes)
- PostgreSQL 14+
- simple-git for git operations
- jsonwebtoken for authentication

**CLI/Skills**:
- TypeScript
- Claude Code SDK (for custom commands)
- Handlebars for template rendering

**Testing**:
- Vitest for backend/shared unit tests
- Jest + React Testing Library for frontend
- Playwright for E2E testing

**Infrastructure** (deferred to implementation):
- Git repository hosting (GitHub, GitLab, Gitea)
- PostgreSQL hosting (Docker, managed service)
- Web hosting (Node.js server, Vercel, etc.)

---

## Open Questions (Deferred to Implementation)

1. **Git authentication**: SSH keys vs. HTTPS tokens vs. git credential helper?
2. **Template repository structure**: Monorepo vs. separate repos for guidelines vs. templates?
3. **Database connection pooling**: pg-pool configuration for concurrent requests?
4. **Rate limiting**: Needed for API endpoints to prevent abuse?
5. **Monitoring/observability**: What telemetry is needed? (logs, metrics, traces)

These questions don't block design and can be resolved during implementation based on deployment environment.
