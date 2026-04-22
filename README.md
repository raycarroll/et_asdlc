# Idea Workflow

A workflow system for validating and publishing ideas with guided prompts, atomic publishing, and searchable repository.

## Features

- **Guided Idea Validation** - Interactive prompts to refine raw ideas into complete specifications
- **Atomic Publishing** - Dual-write to git repository and database with automatic rollback
- **Searchable Repository** - Full-text search, filtering, and pagination
- **Template Management** - Administrator interface for managing validation templates
- **Auto-Updates** - Automatic template updates from central repository

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Docker and OpenShift CLI (for deployment)
- Quay.io account (for container registry)

### Local Development

```bash
# Install dependencies
npm install

# Setup database
createdb idea_workflow
npm run migrate

# Start backend
cd backend
npm run dev

# Start frontend (in another terminal)
cd frontend
npm run dev
```

### Deployment to OpenShift

See [Deployment Guide](docs/DEPLOYMENT.md) for complete instructions.

**Quick deployment:**
```bash
# Set your Quay.io username
export QUAY_USERNAME=your-quay-username

# One-command deployment
./scripts/deploy-to-openshift.sh -u $QUAY_USERNAME
```

## Documentation

- **[Deployment Guide](docs/DEPLOYMENT.md)** - Complete build and deployment instructions
- **[Quick Reference](docs/DEPLOYMENT-QUICK-REF.md)** - Essential deployment commands
- **[Specification](specs/001-idea-spec-workflow/spec.md)** - Feature requirements
- **[Implementation Plan](specs/001-idea-spec-workflow/plan.md)** - Technical architecture
- **[Tasks](specs/001-idea-spec-workflow/tasks.md)** - Implementation task breakdown

## Architecture

### Technology Stack

- **Backend**: Node.js, TypeScript, Express.js, PostgreSQL
- **Frontend**: React, Next.js, TypeScript, Tailwind CSS
- **Infrastructure**: OpenShift, Quay.io, Git

### Project Structure

```
.
├── backend/          # Express.js API server
│   ├── src/
│   │   ├── api/      # REST API endpoints
│   │   ├── models/   # Domain models
│   │   └── services/ # Business logic
│   └── Dockerfile
├── frontend/         # Next.js React application
│   ├── frontend/src/
│   │   ├── app/      # Next.js pages
│   │   ├── components/ # React components
│   │   └── services/ # API clients
│   └── Dockerfile
├── shared/           # Shared types and utilities
├── templates/        # Validation templates
├── openshift/        # OpenShift deployment manifests
├── scripts/          # Build and deployment scripts
└── docs/            # Documentation
```

## User Stories

### 1. Validate and Expand Raw Idea (P1 - MVP)
Users can run `/expand_idea` command to validate ideas through guided prompts and generate specifications.

**Status**: ✅ Implemented

### 2. Publish Idea to Central Repository (P2)
Users can publish completed specs atomically to git repository with database registration.

**Status**: ✅ Implemented

### 3. Browse and View Ideas (P2)
Users can browse, filter, and search published ideas through a web UI.

**Status**: ✅ Implemented

### 4. Manage Templates and Guidelines (P3)
Administrators can view and edit templates through the UI with validation.

**Status**: ✅ Implemented

### 5. Auto-Update Templates (P3)
System automatically checks for and downloads template updates from central repository.

**Status**: 🚧 In Progress (10 tasks remaining)

## API Endpoints

### Authentication
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Refresh token

### Ideas
- `GET /api/v1/ideas` - List ideas (with pagination, filtering, search)
- `GET /api/v1/ideas/:id` - Get idea details
- `POST /api/v1/ideas` - Publish new idea

### Templates (Admin Only)
- `GET /api/v1/templates` - List templates
- `GET /api/v1/templates/:id` - Get template content
- `PUT /api/v1/templates/:id` - Update template

### Health
- `GET /api/v1/health` - Health check

## Development

### Running Tests

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# E2E tests
npm run test:e2e
```

### Database Migrations

```bash
# Run migrations
npm run migrate

# Rollback migration
npm run migrate:rollback

# Create new migration
npm run migrate:create add_new_table
```

### Code Quality

```bash
# Lint
npm run lint

# Format
npm run format

# Type check
npm run type-check
```

## Deployment

### Build Images

```bash
# Build both backend and frontend
./scripts/build-and-push.sh -u your-quay-username

# Build with specific tag
./scripts/build-and-push.sh -u your-quay-username -t v1.0.0

# Build only backend
./scripts/build-and-push.sh -u your-quay-username --backend-only
```

### Deploy to OpenShift

```bash
# Complete deployment
./scripts/deploy-to-openshift.sh -u your-quay-username

# Deploy specific version
./scripts/deploy-to-openshift.sh -u your-quay-username -t v1.0.0

# Skip building (use existing images)
./scripts/deploy-to-openshift.sh -u your-quay-username --skip-build
```

### Update Deployment

```bash
# Update image references
./openshift/update-images.sh -u your-quay-username -t v1.1.0

# Apply changes
oc apply -f openshift/backend.yaml
oc apply -f openshift/frontend.yaml
```

## Monitoring

### Check Status

```bash
# Pod status
oc get pods

# Service URLs
oc get routes

# Logs
oc logs -f deployment/backend
oc logs -f deployment/frontend
```

### Health Check

```bash
# Get backend URL
BACKEND_URL=$(oc get route backend -o jsonpath='{.spec.host}')

# Check health
curl https://$BACKEND_URL/api/v1/health
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run tests: `npm test`
5. Commit: `git commit -am 'Add feature'`
6. Push: `git push origin feature/my-feature`
7. Create a Pull Request

## Troubleshooting

### Image Pull Failures

If pods fail with `ImagePullBackOff`:

1. Make Quay.io repositories public, OR
2. Create a pull secret:
   ```bash
   oc create secret docker-registry quay-pull-secret \
     --docker-server=quay.io \
     --docker-username=USERNAME \
     --docker-password=PASSWORD
   ```

### Database Connection Issues

```bash
# Check PostgreSQL status
oc get pods -l app=postgresql

# View logs
oc logs -f statefulset/postgresql

# Test connection
oc rsh deployment/backend
psql $DATABASE_URL
```

### Build Failures

If Docker builds fail:
- Ensure Docker has at least 4GB memory
- Build for correct platform: `--platform linux/amd64`

## License

MIT

## Support

For issues and questions:
- GitHub Issues: [Create an issue](https://github.com/your-repo/issues)
- Documentation: [docs/](docs/)
- Quick Reference: [DEPLOYMENT-QUICK-REF.md](docs/DEPLOYMENT-QUICK-REF.md)
