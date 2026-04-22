# Quickstart Guide: Idea Validation Workflow

**Feature**: Idea Validation and Spec Generation Workflow  
**For**: Developers implementing this feature  
**Prerequisites**: Node.js 18+, PostgreSQL 14+, Git 2.30+

---

## 1. Environment Setup

### Install Dependencies

```bash
# Clone the repository
git clone <repo-url>
cd idea-workflow

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Install shared types
cd ../shared
npm install
```

### Configure Environment

Create `backend/.env`:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/ideas
DATABASE_POOL_SIZE=20

# Git Repository
IDEAS_REPO_URL=git@github.com:org/ideas-repository.git
IDEAS_REPO_PATH=./data/ideas-repo
TEMPLATES_REPO_URL=git@github.com:org/idea-templates.git
TEMPLATES_REPO_PATH=./data/templates-repo

# Authentication
JWT_SECRET=your-secret-key-here
JWT_EXPIRATION=24h

# API
API_PORT=3001
API_BASE_URL=http://localhost:3001

# Template Updates
TEMPLATE_UPDATE_INTERVAL_HOURS=24
TEMPLATE_UPDATE_CACHE_PATH=./data/template-cache.json
```

Create `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:3001/api/v1
```

---

## 2. Database Setup

### Run Migrations

```bash
cd backend

# Create database
createdb ideas

# Run migrations
npm run migrate:up

# Seed initial data (optional)
npm run seed
```

### Verify Schema

```bash
psql ideas -c "\dt"  # List tables
```

Expected tables:
- `users`
- `ideas`
- `metadata_records`
- `artifacts`
- `tags`
- `idea_tags`
- `conversation_sessions`
- `templates`
- `template_update_cache`

---

## 3. Git Repositories

### Clone Ideas Repository

```bash
mkdir -p backend/data
cd backend/data

# Clone (or init if new)
git clone git@github.com:org/ideas-repository.git ideas-repo

# Or create new
git init ideas-repo
cd ideas-repo
mkdir ideas templates
git add .
git commit -m "Initial commit"
git remote add origin git@github.com:org/ideas-repository.git
git push -u origin main
```

### Clone Templates Repository

```bash
cd backend/data
git clone git@github.com:org/idea-templates.git templates-repo

# Verify structure
ls templates-repo/
# Should see: validation-guidelines/ spec-templates/
```

---

## 4. Run Services

### Start Backend

```bash
cd backend
npm run dev
```

Backend runs on: `http://localhost:3001`

Endpoints:
- Health: `http://localhost:3001/health`
- API docs: `http://localhost:3001/api-docs` (if Swagger enabled)

### Start Frontend

```bash
cd frontend
npm run dev
```

Frontend runs on: `http://localhost:5173` (Vite default)

---

## 5. Test the Workflow

### Create Test User

```bash
# Via API
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword",
    "name": "Test User"
  }'
```

### Login

```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword"
  }'

# Save the token
export TOKEN="eyJhbGciOiJIUzI1NiIs..."
```

### Publish an Idea (Manual API Test)

```bash
curl -X POST http://localhost:3001/api/v1/ideas \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Test Idea",
    "specification": "# Test Idea\n\nThis is a test specification.",
    "tags": ["test", "demo"],
    "metadata": {
      "summary": "A test idea for quickstart validation",
      "goals": "Verify the publishing workflow works",
      "requirements": "System must publish to git and database"
    }
  }'
```

### Verify in Git

```bash
cd backend/data/ideas-repo
git pull
ls ideas/
# Should see: 001-test-idea/

cat ideas/001-test-idea/spec.md
cat ideas/001-test-idea/metadata.json
```

### Query via API

```bash
curl http://localhost:3001/api/v1/ideas \
  -H "Authorization: Bearer $TOKEN"
```

---

## 6. Test Custom Command

### Install Claude Code Skill

```bash
# Copy skill to Claude Code skills directory
cp -r .claude/skills/expand-idea ~/.claude/skills/

# Reload Claude Code (if running)
# The skill should appear in /skills list
```

### Run the Command

In Claude Code:

```
/expand_idea Create a user authentication system with OAuth2 support
```

Expected flow:
1. Session created
2. Validation questions presented
3. User responds interactively
4. Specification generated
5. Optional: Publish to repository

### Verify Session State

```bash
cat ~/.claude/idea-workflow/sessions/<session-id>.json
```

---

## 7. Test Template Updates

### Modify Template in Git

```bash
cd backend/data/templates-repo
cd spec-templates

# Edit default.md
vim default.md  # Add a new section

git add default.md
git commit -m "Add privacy section to spec template"
git push
```

### Trigger Update Check

```bash
# Wait 24 hours OR manually trigger
curl -X POST http://localhost:3001/api/v1/admin/templates/sync \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Verify Update

```bash
# Check template cache
cat backend/data/template-cache.json

# Check database
psql ideas -c "SELECT name, current_version_sha, last_sync_at FROM templates;"
```

---

## 8. Run Tests

### Backend Unit Tests

```bash
cd backend
npm test

# With coverage
npm run test:coverage
```

### Frontend Component Tests

```bash
cd frontend
npm test
```

### E2E Tests

```bash
# Start services first (backend + frontend)
cd e2e
npx playwright test

# With UI
npx playwright test --ui
```

---

## 9. Common Issues

### Database Connection Error

**Symptom**: `ECONNREFUSED` or `connection refused`

**Fix**:
```bash
# Check PostgreSQL is running
pg_isready

# If not running
brew services start postgresql  # macOS
sudo systemctl start postgresql  # Linux
```

### Git Authentication Failure

**Symptom**: `fatal: could not read Username` or `Permission denied (publickey)`

**Fix**:
```bash
# Set up SSH key
ssh-keygen -t ed25519 -C "your_email@example.com"
cat ~/.ssh/id_ed25519.pub  # Add to GitHub

# Or use credential helper for HTTPS
git config --global credential.helper osxkeychain  # macOS
git config --global credential.helper cache  # Linux
```

### Port Already in Use

**Symptom**: `EADDRINUSE` error

**Fix**:
```bash
# Find and kill process on port
lsof -ti:3001 | xargs kill  # Backend
lsof -ti:5173 | xargs kill  # Frontend

# Or change port in .env
```

### Template Not Found

**Symptom**: `Template not found` error in command execution

**Fix**:
```bash
# Ensure templates repository is cloned and up-to-date
cd backend/data/templates-repo
git pull

# Verify templates exist
ls validation-guidelines/
ls spec-templates/
```

---

## 10. Development Workflow

### Making Changes

1. **Backend changes**:
   ```bash
   cd backend
   # Edit code in src/
   npm run dev  # Auto-reloads
   npm test     # Run tests
   ```

2. **Frontend changes**:
   ```bash
   cd frontend
   # Edit code in src/
   # Hot reload is automatic
   npm test
   ```

3. **Database schema changes**:
   ```bash
   cd backend
   npm run migrate:create MyMigrationName
   # Edit migration file in db/migrations/
   npm run migrate:up
   ```

4. **Contract changes**:
   - Update relevant file in `specs/001-idea-spec-workflow/contracts/`
   - Ensure backward compatibility or version bump
   - Update tests to match new contract

### Debugging

```bash
# Backend with debugger
cd backend
node --inspect dist/index.js

# Attach debugger (VS Code launch.json or Chrome DevTools)
```

```json
// .vscode/launch.json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Backend",
  "program": "${workspaceFolder}/backend/dist/index.js",
  "outFiles": ["${workspaceFolder}/backend/dist/**/*.js"],
  "sourceMaps": true
}
```

---

## Next Steps

- Review [data-model.md](./data-model.md) for database schema details
- Review [contracts/](./contracts/) for API and interface specifications
- Check [tasks.md](./tasks.md) (after running `/speckit.tasks`) for implementation task breakdown
- Read [plan.md](./plan.md) for architectural overview

---

## Resources

- **PostgreSQL Docs**: https://www.postgresql.org/docs/
- **Node.js Best Practices**: https://github.com/goldbergyoni/nodebestpractices
- **Git Internals**: https://git-scm.com/book/en/v2/Git-Internals-Plumbing-and-Porcelain
- **JWT Auth Guide**: https://jwt.io/introduction
- **React + TypeScript**: https://react-typescript-cheatsheet.netlify.app/

---

**Last Updated**: 2026-04-21  
**Status**: Ready for implementation
