# Deployment Guide

Complete guide for building and deploying the Idea Workflow application to OpenShift using Quay.io as the container registry.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Detailed Steps](#detailed-steps)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)
- [Advanced Usage](#advanced-usage)

## Prerequisites

### Required Tools

1. **Docker** - For building images locally
   ```bash
   docker --version
   # Docker version 20.10.0 or higher
   ```

2. **OpenShift CLI (oc)** - For deploying to cluster
   ```bash
   oc version
   # Client Version: 4.12.0 or higher
   ```

3. **Quay.io Account** - Container registry
   - Sign up at https://quay.io
   - Note your username

### Access Requirements

1. **Quay.io Repository Access**
   - Login to quay.io
   - Create repositories (or they'll be auto-created on first push):
     - `idea-workflow-backend`
     - `idea-workflow-frontend`
   - Set repositories to public (or configure OpenShift pull secrets for private repos)

2. **OpenShift Cluster Access**
   - Login to your OpenShift cluster:
     ```bash
     oc login <your-cluster-url>
     ```

## Quick Start

### One-Command Deployment

Deploy everything with a single Make command:

```bash
# Set your Quay.io username
export QUAY_USERNAME=your-quay-username

# Deploy everything (build, push, deploy)
make image-all
```

This will:
1. Build both backend and frontend images locally
2. Push images to quay.io
3. Update OpenShift deployment files
4. Deploy to your OpenShift cluster

### First-Time Setup

If deploying for the first time, you need to configure secrets first:

```bash
# 1. Login to Quay.io
docker login quay.io

# 2. Login to OpenShift
oc login <your-cluster-url>

# 3. Create namespace
oc create namespace idea-workflow
oc project idea-workflow

# 4. Configure secrets (edit with your values)
cd openshift
cp secret.yaml secret.local.yaml
# Edit secret.local.yaml with your actual values
oc apply -f secret.local.yaml

# 5. Deploy
cd ..
export QUAY_USERNAME=your-quay-username
make image-all
```

## Detailed Steps

### Step 1: Build Images Locally

Build Docker images for both backend and frontend:

```bash
# Build both images
make image-build QUAY_USERNAME=your-quay-username

# Build with specific tag
make image-build QUAY_USERNAME=your-quay-username IMAGE_TAG=v1.0.0

# Build only backend
make backend-image-build QUAY_USERNAME=your-quay-username

# Build only frontend
make frontend-image-build QUAY_USERNAME=your-quay-username
```

**What this does:**
- Builds `backend/Dockerfile` from repository root
- Builds `frontend/Dockerfile` from repository root
- Tags images for quay.io: `quay.io/USERNAME/idea-workflow-backend:TAG`

**Platform Note:**
By default, images are built for `linux/amd64`. If needed, specify different platform:
```bash
make image-build QUAY_USERNAME=USERNAME PLATFORM=linux/arm64
```

### Step 2: Push Images to Quay.io

Push the built images to your Quay.io registry:

```bash
# Push both images
make image-push QUAY_USERNAME=your-quay-username

# Push with specific tag
make image-push QUAY_USERNAME=your-quay-username IMAGE_TAG=v1.0.0

# Backend only
make backend-image-push QUAY_USERNAME=your-quay-username

# Frontend only
make frontend-image-push QUAY_USERNAME=your-quay-username

# Build and push in one command
make backend-image QUAY_USERNAME=your-quay-username
make frontend-image QUAY_USERNAME=your-quay-username
```

**What this does:**
- Pushes images to quay.io registry
- Updates `backend.yaml` and `frontend.yaml` with image references
- Changes `imagePullPolicy` to `IfNotPresent`
- Creates backup files (`.bak`)

### Step 3: Deploy to OpenShift

Deploy to your OpenShift cluster:

```bash
# Ensure you're logged in
oc login <cluster-url>

# Deploy using Makefile
make deploy-openshift
```

This will automatically:
- Create namespace if it doesn't exist
- Deploy ConfigMap and Secret
- Deploy PostgreSQL StatefulSet
- Deploy Backend and Frontend
- Wait for rollouts to complete

### Step 4: Verify Deployment

Check that everything is running:

```bash
# Check pod status
oc get pods

# Should see:
# NAME                        READY   STATUS    RESTARTS   AGE
# backend-xxx                 1/1     Running   0          2m
# frontend-xxx                1/1     Running   0          2m
# postgresql-0                1/1     Running   0          5m

# Check service URLs
oc get routes

# Test backend health
BACKEND_URL=$(oc get route backend -o jsonpath='{.spec.host}')
curl https://$BACKEND_URL/api/v1/health

# Access frontend
FRONTEND_URL=$(oc get route frontend -o jsonpath='{.spec.host}')
echo "Frontend: https://$FRONTEND_URL"
```

## Configuration

### Environment Variables

All scripts support environment variables as alternatives to command-line flags:

```bash
# Quay.io configuration
export QUAY_USERNAME=your-username
export IMAGE_TAG=latest
export QUAY_REGISTRY=quay.io  # default

# OpenShift configuration
export NAMESPACE=idea-workflow  # default

# Build configuration
export PLATFORM=linux/amd64  # default
```

### Image Tags

Use semantic versioning for production deployments:

```bash
# Development
./scripts/deploy-to-openshift.sh -u USERNAME -t dev

# Staging
./scripts/deploy-to-openshift.sh -u USERNAME -t staging

# Production release
./scripts/deploy-to-openshift.sh -u USERNAME -t v1.0.0
```

### Secrets Configuration

The application requires these secrets (defined in `openshift/secret.yaml`):

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT token signing
- `GIT_REPO_URL` - Git repository for idea storage
- `GIT_ACCESS_TOKEN` - Token for git operations

**Create a local secret file:**
```bash
cd openshift
cp secret.yaml secret.local.yaml

# Edit with actual values
vi secret.local.yaml

# Apply (don't commit this file!)
oc apply -f secret.local.yaml
```

**Add to .gitignore:**
```bash
echo "openshift/secret.local.yaml" >> .gitignore
```

## Troubleshooting

### Image Pull Failures

**Problem:** Pods fail with `ImagePullBackOff`

**Solution 1 - Public Repository:**
Make your Quay.io repositories public:
1. Login to quay.io
2. Go to repository settings
3. Set visibility to "Public"

**Solution 2 - Pull Secret:**
Create a pull secret for private repositories:
```bash
# Create pull secret
oc create secret docker-registry quay-pull-secret \
  --docker-server=quay.io \
  --docker-username=YOUR_USERNAME \
  --docker-password=YOUR_PASSWORD \
  --docker-email=YOUR_EMAIL

# Link to default service account
oc secrets link default quay-pull-secret --for=pull
```

Then update deployments to use the secret (already configured in yaml files).

### Build Failures

**Problem:** Docker build fails with memory errors

**Solution:** Increase Docker memory limit:
```bash
# Docker Desktop: Settings → Resources → Memory (increase to 4GB+)
```

**Problem:** Build fails with platform mismatch

**Solution:** Explicitly set platform:
```bash
./scripts/build-and-push.sh -u USERNAME -p linux/amd64
```

### Connection Issues

**Problem:** Can't connect to backend/frontend

**Check Route:**
```bash
oc get routes
oc describe route backend
```

**Check Pod Logs:**
```bash
oc logs -f deployment/backend
oc logs -f deployment/frontend
```

**Check Service:**
```bash
oc get svc backend
oc describe svc backend
```

### Database Issues

**Problem:** Backend can't connect to database

**Check PostgreSQL:**
```bash
# Check if PostgreSQL is running
oc get pods -l app=postgresql

# Check logs
oc logs -f statefulset/postgresql

# Test connection from backend pod
oc rsh deployment/backend
psql $DATABASE_URL
```

**Check Secret:**
```bash
# Verify DATABASE_URL is set correctly
oc get secret idea-workflow-secrets -o yaml
```

## Advanced Usage

### Partial Deployments

**Deploy only backend:**
```bash
./scripts/deploy-to-openshift.sh -u USERNAME --backend-only
```

**Deploy only frontend:**
```bash
./scripts/deploy-to-openshift.sh -u USERNAME --frontend-only
```

### Skip Steps

**Skip building (use existing images):**
```bash
./scripts/deploy-to-openshift.sh -u USERNAME --skip-build
```

**Build and push only (no deployment):**
```bash
./scripts/build-and-push.sh -u USERNAME
```

**Update deployment files only:**
```bash
./openshift/update-images.sh -u USERNAME -t v1.0.0
oc apply -f openshift/backend.yaml
oc apply -f openshift/frontend.yaml
```

### Rolling Updates

**Update to new version:**
```bash
# Build new version
./scripts/build-and-push.sh -u USERNAME -t v1.1.0

# Update deployment
./openshift/update-images.sh -u USERNAME -t v1.1.0
oc apply -f openshift/backend.yaml

# Watch rollout
oc rollout status deployment/backend
```

**Rollback:**
```bash
oc rollout undo deployment/backend
oc rollout undo deployment/frontend
```

### Scaling

**Scale backend:**
```bash
# Note: Currently limited to 1 replica due to RWO PVC
# To scale, need to change to ReadWriteMany storage or remove PVC

oc scale deployment/backend --replicas=2
```

**Scale frontend:**
```bash
oc scale deployment/frontend --replicas=3
```

### Monitoring

**Watch pods:**
```bash
watch oc get pods
```

**View logs:**
```bash
# Follow logs
oc logs -f deployment/backend
oc logs -f deployment/frontend

# View previous logs (after restart)
oc logs deployment/backend --previous
```

**Resource usage:**
```bash
oc adm top pods
oc adm top nodes
```

### Debug Access

**Shell into pod:**
```bash
oc rsh deployment/backend
oc rsh deployment/frontend
```

**Port forwarding:**
```bash
# Access backend locally on port 3001
oc port-forward deployment/backend 3001:3001

# Access PostgreSQL
oc port-forward statefulset/postgresql 5432:5432
```

**Run commands:**
```bash
# Run one-off command
oc exec deployment/backend -- npm run migrate

# Interactive
oc exec -it deployment/backend -- /bin/bash
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy to OpenShift

on:
  push:
    branches: [main]
    tags: ['v*']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Login to Quay.io
        run: docker login quay.io -u ${{ secrets.QUAY_USERNAME }} -p ${{ secrets.QUAY_PASSWORD }}

      - name: Build and Push
        run: |
          export QUAY_USERNAME=${{ secrets.QUAY_USERNAME }}
          export IMAGE_TAG=${GITHUB_REF#refs/tags/}
          ./scripts/build-and-push.sh -u $QUAY_USERNAME -t $IMAGE_TAG

      - name: Deploy to OpenShift
        run: |
          oc login --token=${{ secrets.OPENSHIFT_TOKEN }} --server=${{ secrets.OPENSHIFT_SERVER }}
          ./scripts/deploy-to-openshift.sh -u ${{ secrets.QUAY_USERNAME }} -t $IMAGE_TAG --skip-build
```

## Summary

**For regular deployments:**
```bash
export QUAY_USERNAME=your-username
./scripts/deploy-to-openshift.sh -u $QUAY_USERNAME
```

**For production releases:**
```bash
./scripts/deploy-to-openshift.sh -u $QUAY_USERNAME -t v1.0.0
```

**For quick testing:**
```bash
./scripts/build-and-push.sh -u $QUAY_USERNAME --backend-only
oc rollout restart deployment/backend
```
