# Deployment Guide

This guide covers deploying the Idea Validation and Spec Generation Workflow application in various environments.

## Table of Contents

- [Local Development (Docker Compose)](#local-development-docker-compose)
- [OpenShift Deployment](#openshift-deployment)
- [Building Container Images](#building-container-images)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Troubleshooting](#troubleshooting)

---

## Local Development (Docker Compose)

### Prerequisites

- Docker and Docker Compose installed
- At least 4GB of available RAM
- Ports 3000, 3001, and 5432 available

### Quick Start

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Stop and remove volumes (data will be lost)
docker-compose down -v
```

### Accessing Services

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Backend Health**: http://localhost:3001/health
- **PostgreSQL**: localhost:5432

### Running Database Migrations

```bash
# Run migrations
docker-compose exec backend npm run migrate:up

# Rollback migrations
docker-compose exec backend npm run migrate:down

# Create new migration
docker-compose exec backend npm run migrate:create my-migration-name
```

### Rebuilding Images

```bash
# Rebuild all images
docker-compose build

# Rebuild specific service
docker-compose build backend

# Rebuild and restart
docker-compose up -d --build
```

---

## OpenShift Deployment

Complete OpenShift deployment guide is available in [`openshift/README.md`](./openshift/README.md).

### Quick OpenShift Deployment

```bash
# Login to OpenShift
oc login <your-cluster-url>

# Deploy using automated script
cd openshift
./deploy.sh

# Or deploy manually
oc apply -f openshift/namespace.yaml
oc project idea-workflow

# Create secrets (IMPORTANT: Update with real values!)
oc create secret generic idea-workflow-secrets \
  --from-literal=DATABASE_URL='postgresql://ideas:PASSWORD@postgresql:5432/ideas' \
  --from-literal=JWT_SECRET='your-secure-secret' \
  --from-literal=IDEAS_REPO_URL='https://github.com/org/ideas.git' \
  --from-literal=TEMPLATES_REPO_URL='https://github.com/org/templates.git'

# Deploy components
oc apply -f openshift/configmap.yaml
oc apply -f openshift/postgresql.yaml
oc apply -f openshift/backend.yaml
oc apply -f openshift/frontend.yaml

# Check status
oc get pods
oc get routes
```

### Accessing OpenShift Deployment

```bash
# Get application URLs
oc get routes -n idea-workflow

# Frontend URL
echo "https://$(oc get route frontend -n idea-workflow -o jsonpath='{.spec.host}')"

# Backend URL
echo "https://$(oc get route backend -n idea-workflow -o jsonpath='{.spec.host}')"
```

---

## Building Container Images

### Backend Image

```bash
# Build backend image
docker build -t idea-workflow-backend:latest ./backend

# Test backend image
docker run -p 3001:3001 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/db" \
  -e JWT_SECRET="test-secret-32-chars-minimum" \
  idea-workflow-backend:latest

# Push to registry
docker tag idea-workflow-backend:latest registry.example.com/idea-workflow-backend:v1.0.0
docker push registry.example.com/idea-workflow-backend:v1.0.0
```

### Frontend Image

```bash
# Build frontend image
docker build -t idea-workflow-frontend:latest ./frontend

# Test frontend image
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL="http://localhost:3001/api/v1" \
  idea-workflow-frontend:latest

# Push to registry
docker tag idea-workflow-frontend:latest registry.example.com/idea-workflow-frontend:v1.0.0
docker push registry.example.com/idea-workflow-frontend:v1.0.0
```

### Building in OpenShift

```bash
# Build from Git repository
oc new-app https://github.com/your-org/idea-workflow.git \
  --context-dir=backend \
  --name=backend

# Build from local source
oc new-build --name=backend --binary --strategy=docker
oc start-build backend --from-dir=./backend --follow

# Tag and deploy
oc tag backend:latest backend:v1.0.0
```

---

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/ideas` |
| `JWT_SECRET` | Secret for JWT token signing (min 32 chars) | `your-secure-random-secret` |
| `IDEAS_REPO_URL` | Git repository URL for ideas | `https://github.com/org/ideas.git` |
| `TEMPLATES_REPO_URL` | Git repository URL for templates | `https://github.com/org/templates.git` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `API_PORT` | Backend API port | `3001` |
| `DATABASE_POOL_SIZE` | PostgreSQL connection pool size | `20` |
| `JWT_EXPIRATION` | JWT token expiration time | `24h` |
| `LOG_LEVEL` | Logging level (debug, info, warn, error) | `info` |
| `TEMPLATE_UPDATE_INTERVAL_HOURS` | Template update check interval | `24` |
| `NODE_ENV` | Node environment | `production` |

### Frontend Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL (public) | `http://localhost:3001/api/v1` |

---

## Database Setup

### Initialize Database Schema

```bash
# Using Docker Compose
docker-compose exec postgresql psql -U ideas -d ideas -f /docker-entrypoint-initdb.d/schema.sql

# Using OpenShift
BACKEND_POD=$(oc get pods -l app=backend -o jsonpath='{.items[0].metadata.name}')
oc exec -it ${BACKEND_POD} -- npm run migrate:up

# Directly with psql
psql postgresql://ideas:password@localhost:5432/ideas -f backend/src/db/schema.sql
```

### Backup Database

```bash
# Docker Compose
docker-compose exec postgresql pg_dump -U ideas ideas > backup.sql

# OpenShift
oc exec postgresql-0 -- pg_dump -U ideas ideas > backup.sql

# Restore
docker-compose exec -T postgresql psql -U ideas ideas < backup.sql
```

---

## Troubleshooting

### Backend Not Starting

**Check logs:**
```bash
# Docker Compose
docker-compose logs backend

# OpenShift
oc logs -f deployment/backend
```

**Common issues:**
- Database connection failed → Check `DATABASE_URL` is correct
- JWT secret too short → Ensure `JWT_SECRET` is at least 32 characters
- Port already in use → Change `API_PORT` or stop conflicting service

### Frontend Not Connecting to Backend

**Check API URL:**
```bash
# Verify environment variable
docker-compose exec frontend env | grep NEXT_PUBLIC_API_URL

# Test backend from frontend container
docker-compose exec frontend curl http://backend:3001/health
```

**Common issues:**
- Wrong API URL → Update `NEXT_PUBLIC_API_URL`
- Backend not ready → Wait for backend to start
- CORS issues → Check backend CORS configuration

### Database Connection Issues

**Test database connectivity:**
```bash
# Docker Compose
docker-compose exec backend node -e "const pg = require('pg'); const client = new pg.Client(process.env.DATABASE_URL); client.connect().then(() => console.log('Connected')).catch(err => console.error(err))"

# Check PostgreSQL logs
docker-compose logs postgresql

# OpenShift
oc logs -f statefulset/postgresql
```

**Common issues:**
- Wrong credentials → Update `DATABASE_URL`
- Database not ready → Wait for PostgreSQL to start
- Connection pool exhausted → Increase `DATABASE_POOL_SIZE`

### OpenShift Image Build Failures

**Check build logs:**
```bash
oc logs -f bc/backend
```

**Common issues:**
- Insufficient resources → Increase build limits
- npm install failures → Check network connectivity
- Docker build context too large → Update `.dockerignore`

### Health Check Failures

**Check health endpoint:**
```bash
# Backend
curl http://localhost:3001/health

# OpenShift
BACKEND_URL=$(oc get route backend -o jsonpath='{.spec.host}')
curl https://${BACKEND_URL}/health
```

**Common issues:**
- Database not connected → Check database status
- Git repositories not accessible → Verify git URLs and credentials

---

## Production Checklist

Before deploying to production:

- [ ] Generate secure `JWT_SECRET` (min 64 characters)
- [ ] Use strong database password
- [ ] Configure SSL/TLS certificates
- [ ] Set up database backups
- [ ] Configure monitoring and alerting
- [ ] Set appropriate resource limits
- [ ] Enable auto-scaling (OpenShift HPA)
- [ ] Configure log aggregation
- [ ] Review security policies
- [ ] Set up CI/CD pipeline
- [ ] Test disaster recovery procedures
- [ ] Document runbook procedures

---

## Performance Tuning

### Database

```bash
# Increase connection pool
DATABASE_POOL_SIZE=50

# PostgreSQL tuning (in postgresql.yaml)
# - shared_buffers: 256MB → 512MB
# - max_connections: 100 → 200
# - effective_cache_size: 1GB → 2GB
```

### Backend

```bash
# Increase replicas
docker-compose up --scale backend=3

# OpenShift
oc scale deployment/backend --replicas=3

# Resource limits (OpenShift)
oc set resources deployment/backend \
  --requests=cpu=500m,memory=1Gi \
  --limits=cpu=2,memory=2Gi
```

### Frontend

```bash
# Enable caching
# - Add Redis for session storage
# - Configure Next.js caching
# - Use CDN for static assets
```

---

## Monitoring

### Health Checks

```bash
# Backend health
curl http://localhost:3001/health

# Frontend health
curl http://localhost:3000/

# Database health
docker-compose exec postgresql pg_isready -U ideas
```

### Logs

```bash
# Docker Compose - All services
docker-compose logs -f

# Docker Compose - Specific service
docker-compose logs -f backend

# OpenShift - All pods
oc logs -f -l app=idea-workflow

# OpenShift - Specific deployment
oc logs -f deployment/backend
```

### Metrics

```bash
# OpenShift resource usage
oc adm top pods

# Docker resource usage
docker stats
```

---

## Support

For deployment issues:
1. Check logs for error messages
2. Verify all environment variables are set correctly
3. Ensure all required services are running
4. Review this troubleshooting guide
5. Check OpenShift/Docker documentation
6. Open an issue with logs and configuration details
