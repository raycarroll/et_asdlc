# GitHub Integration Guide

This document explains how the GitHub repository serves as both the codebase and central storage for the idea workflow system.

## Repository Structure

**GitHub URL**: https://github.com/raycarroll/et_asdlc.git

The repository has a dual purpose:

### 1. Codebase (Development)
```
et_asdlc/
  ├── backend/           # Node.js API with TypeScript
  ├── frontend/          # Next.js UI
  ├── shared/            # Shared TypeScript types
  ├── openshift/         # Kubernetes/OpenShift deployment configs
  ├── scripts/           # Database setup and utilities
  └── specs/             # Feature specifications (Spec Kit workflow)
```

### 2. Central Storage (Runtime)
```
et_asdlc/
  ├── ideas/             # Published ideas registry
  │   ├── README.md
  │   ├── .gitkeep
  │   └── YYYYMMDD-HHMMSS-idea-slug/
  │       ├── spec.md
  │       ├── metadata.json
  │       └── artifacts/
  │
  └── templates/         # Validation guidelines & spec templates
      ├── README.md
      ├── validation-guidelines/
      │   ├── default-questions.yaml
      │   └── default.yml
      └── spec-templates/
          ├── default-spec.md
          └── default.md
```

## How It Works

### Template Auto-Updates

**Backend Service**: `TemplateUpdateChecker` + `TemplateDownloadService`

Every 24 hours (configurable), the backend:

1. **Checks** GitHub `main` branch for template updates
   ```typescript
   const latestSha = await git.revparse(['origin/main']);
   const currentSha = await db.query('SELECT version_sha FROM template_cache');
   ```

2. **Downloads** if updates exist
   ```bash
   git fetch origin
   git reset --hard origin/main
   ```

3. **Caches** version SHA in PostgreSQL
   ```sql
   INSERT INTO template_cache (version_sha, last_check, updated)
   VALUES ($1, NOW(), true);
   ```

4. **Notifies** users about template updates

**Configuration** (OpenShift):
```yaml
# ConfigMap
TEMPLATES_REPO_PATH: "/app/data/templates-repo"
TEMPLATE_UPDATE_INTERVAL_HOURS: "24"

# Secret
TEMPLATES_REPO_URL: "https://github.com/raycarroll/et_asdlc.git"
```

### Idea Publishing Workflow

**Command**: `/expand-idea <description>`

1. **User invokes** `/expand-idea` in Claude Code
2. **Interactive validation** - asks questions from `templates/validation-guidelines/`
3. **Spec generation** - uses template from `templates/spec-templates/`
4. **Atomic publish**:
   ```typescript
   // Database transaction + Git commit
   await db.query('BEGIN');
   await git.commit(`Add idea: ${title}`);
   await db.query('INSERT INTO ideas ...');
   await git.push('origin', 'main');
   await db.query('COMMIT');
   ```

5. **Result**: New directory in `ideas/` with spec.md + metadata

**Rollback** on failure:
```typescript
if (error) {
  await git.revert(commitSha);
  await db.query('ROLLBACK');
}
```

## Environment Variables

### Backend Pod Configuration

```bash
# Git Repository URLs (from Secret)
IDEAS_REPO_URL=https://github.com/raycarroll/et_asdlc.git
TEMPLATES_REPO_URL=https://github.com/raycarroll/et_asdlc.git

# Local Paths (from ConfigMap)
IDEAS_REPO_PATH=/app/data/ideas-repo
TEMPLATES_REPO_PATH=/app/data/templates-repo

# Update Interval (from ConfigMap)
TEMPLATE_UPDATE_INTERVAL_HOURS=24
```

### How to Update

**Via kubectl:**
```bash
# Update secret
kubectl patch secret idea-workflow-secrets -n idea-workflow \
  --type='json' -p='[
    {"op": "replace", "path": "/data/IDEAS_REPO_URL", 
     "value": "'$(echo -n "https://github.com/raycarroll/et_asdlc.git" | base64)'"}
  ]'

# Update configmap
kubectl patch configmap idea-workflow-config -n idea-workflow \
  --type='merge' -p='{"data":{"TEMPLATE_UPDATE_INTERVAL_HOURS":"12"}}'

# Restart backend
kubectl delete pods -n idea-workflow -l app=backend
```

## Git Operations

### Clone on First Start

Backend initializes local git clones:

```typescript
// On startup if repos don't exist
await git.clone(
  'https://github.com/raycarroll/et_asdlc.git',
  '/app/data/templates-repo'
);

await git.clone(
  'https://github.com/raycarroll/et_asdlc.git',
  '/app/data/ideas-repo'
);
```

### Periodic Template Updates

```typescript
// Every 24 hours (background worker)
await git.fetch('origin');
const remoteSha = await git.revparse(['origin/main']);

if (remoteSha !== localSha) {
  await git.reset('--hard', remoteSha);
  logger.info('Templates updated', { from: localSha, to: remoteSha });
}
```

### Publishing Ideas

```typescript
// When user publishes an idea
await git.add(`ideas/${timestamp}-${slug}/`);
await git.commit(`Add idea: ${title}\n\nAuthor: ${user.email}`);
await git.push('origin', 'main');
```

## Database Schema

### Template Cache

```sql
CREATE TABLE template_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version_sha VARCHAR(40) NOT NULL,
  last_check TIMESTAMP NOT NULL,
  updated BOOLEAN NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stores git commit SHA of current template version
-- Updated every 24 hours when checking for updates
```

### Ideas

```sql
CREATE TABLE ideas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(500) NOT NULL,
  status VARCHAR(50) NOT NULL, -- draft, published, implemented
  git_path VARCHAR(500) NOT NULL, -- Path in GitHub repo
  git_commit_sha VARCHAR(40),    -- Commit SHA for this idea
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  published_at TIMESTAMP
);

-- Links database records to GitHub files
-- Enables search while maintaining git history
```

## Deployment Workflow

### Initial Setup

1. **Push code to GitHub**
   ```bash
   git remote add origin https://github.com/raycarroll/et_asdlc.git
   git push -u origin master:main
   ```

2. **Build and push Docker images**
   ```bash
   docker build -f backend/Dockerfile -t quay.io/rcarroll/idea-workflow-backend:latest .
   docker push quay.io/rcarroll/idea-workflow-backend:latest
   ```

3. **Deploy to OpenShift**
   ```bash
   kubectl apply -f openshift/namespace.yaml
   kubectl apply -f openshift/secret.yaml
   kubectl apply -f openshift/configmap.yaml
   kubectl apply -f openshift/postgresql.yaml
   kubectl apply -f openshift/backend.yaml
   kubectl apply -f openshift/frontend.yaml
   ```

4. **Verify environment**
   ```bash
   kubectl get pods -n idea-workflow
   kubectl logs -n idea-workflow -l app=backend --tail=50
   ```

### Continuous Deployment

When you push code changes to GitHub:

1. **Backend changes** → Rebuild and push Docker image → Update deployment
2. **Template changes** → Backend auto-updates within 24 hours (or restart pod)
3. **Idea published** → Committed to `ideas/` directory automatically

## Troubleshooting

### Templates Not Updating

**Check backend logs:**
```bash
kubectl logs -n idea-workflow -l app=backend | grep -i template
```

**Verify git access:**
```bash
POD=$(kubectl get pods -n idea-workflow -l app=backend -o name | head -1)
kubectl exec -n idea-workflow $POD -- git ls-remote https://github.com/raycarroll/et_asdlc.git
```

**Check template cache:**
```bash
kubectl exec -n idea-workflow -l app=postgresql -- \
  psql -U ideas -d ideas -c "SELECT * FROM template_cache ORDER BY last_check DESC LIMIT 5;"
```

**Force update:**
```bash
# Delete cache entry to force re-check
kubectl exec -n idea-workflow -l app=postgresql -- \
  psql -U ideas -d ideas -c "DELETE FROM template_cache;"

# Restart backend
kubectl delete pods -n idea-workflow -l app=backend
```

### Idea Publishing Failures

**Check git credentials:**
```bash
# For HTTPS (no auth needed for public repos)
kubectl get secret idea-workflow-secrets -n idea-workflow -o jsonpath='{.data.IDEAS_REPO_URL}' | base64 -d

# For SSH (would need SSH key mounted)
# kubectl create secret generic git-ssh-key --from-file=ssh-privatekey=/path/to/key
```

**Check database connectivity:**
```bash
kubectl exec -n idea-workflow -l app=backend -- \
  env | grep DATABASE_URL
```

**Review transaction logs:**
```bash
kubectl logs -n idea-workflow -l app=backend | grep -i "publish\|rollback"
```

### Git Conflicts

If someone manually edits `ideas/` in GitHub and backend tries to push:

```bash
# Backend will fail to push
# Check for conflicts
kubectl exec -n idea-workflow -l app=backend -- \
  cat /app/data/ideas-repo/.git/FETCH_HEAD

# Resolve by pulling first (backend should do this automatically)
# If not, restart backend pod
```

## Best Practices

1. **Template Changes**: Test locally before pushing to GitHub
2. **Idea Publishing**: Happens via `/expand-idea` only (don't manually edit `ideas/`)
3. **Version Control**: Use git tags for major template changes
4. **Monitoring**: Set up alerts for failed template updates
5. **Backups**: GitHub serves as backup for both code and ideas

## Security Considerations

1. **Public Repository**: This repo is public, so no secrets in `ideas/`
2. **Authentication**: Backend uses JWT for API access
3. **Git Access**: HTTPS (no auth for public read, would need deploy keys for private)
4. **Database**: Credentials stored in Kubernetes Secret

## Future Enhancements

- [ ] Git SSH key support for private repositories
- [ ] Webhook to trigger immediate template updates
- [ ] Branch-per-idea workflow with PR review
- [ ] Template versioning with semantic versions
- [ ] Rollback mechanism for bad template updates
- [ ] Merge conflict resolution for concurrent idea publishes
