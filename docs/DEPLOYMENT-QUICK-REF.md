# Deployment Quick Reference

Essential Makefile commands for building and deploying to OpenShift with Quay.io.

## Prerequisites

```bash
# 1. Login to Quay.io
docker login quay.io

# 2. Login to OpenShift
oc login <your-cluster-url>

# 3. Set your username
export QUAY_USERNAME=your-quay-username
```

## Complete Deployment

```bash
# One command - build, push, deploy everything
make image-all QUAY_USERNAME=$QUAY_USERNAME

# With specific tag
make image-all QUAY_USERNAME=$QUAY_USERNAME IMAGE_TAG=v1.0.0
```

## Build & Push Only

```bash
# Build and push both images
make image-build image-push QUAY_USERNAME=$QUAY_USERNAME

# Build only
make image-build QUAY_USERNAME=$QUAY_USERNAME

# Push only
make image-push QUAY_USERNAME=$QUAY_USERNAME

# Backend only
make backend-image QUAY_USERNAME=$QUAY_USERNAME

# Frontend only
make frontend-image QUAY_USERNAME=$QUAY_USERNAME

# Specific tag
make image-build QUAY_USERNAME=$QUAY_USERNAME IMAGE_TAG=v1.0.0
```

## Deploy Only

```bash
# Deploy to OpenShift (uses existing images)
make deploy-openshift
```

## Quick Updates

```bash
# Rebuild and deploy backend only
make backend-image QUAY_USERNAME=$QUAY_USERNAME
make restart-backend

# Rebuild and deploy frontend only
make frontend-image QUAY_USERNAME=$QUAY_USERNAME
make restart-frontend
```

## Monitoring

```bash
# Show all deployment status
make openshift-status

# View logs
make logs-backend
make logs-frontend
make logs-postgresql

# Watch pods directly
oc get pods -w -n idea-workflow

# Resource usage
oc adm top pods -n idea-workflow
```

## Debugging

```bash
# Shell into pod
make shell-backend
make shell-frontend
make shell-postgresql

# Port forward
oc port-forward deployment/backend 3001:3001 -n idea-workflow

# Run command in pod
oc exec deployment/backend -n idea-workflow -- npm run migrate

# View events
oc get events --sort-by='.lastTimestamp' -n idea-workflow

# Describe pod
oc describe pod <pod-name> -n idea-workflow
```

## Rollback

```bash
# Rollback deployment
make rollback-backend
make rollback-frontend

# Rollback to specific revision
oc rollout undo deployment/backend --to-revision=2 -n idea-workflow

# View rollout history
oc rollout history deployment/backend -n idea-workflow
```

## Restart

```bash
# Restart deployments
make restart-backend
make restart-frontend
```

## Scaling

```bash
# Scale frontend
oc scale deployment/frontend --replicas=3 -n idea-workflow

# Backend (currently limited to 1 due to RWO storage)
oc scale deployment/backend --replicas=1 -n idea-workflow
```

## Health Checks

```bash
# Get backend route
BACKEND_URL=$(oc get route backend -o jsonpath='{.spec.host}')

# Test health endpoint
curl https://$BACKEND_URL/api/v1/health

# Test from within cluster
oc exec deployment/backend -- curl http://localhost:3001/api/v1/health
```

## Secrets Management

```bash
# View secret (base64 encoded)
oc get secret idea-workflow-secrets -o yaml

# Decode secret value
oc get secret idea-workflow-secrets -o jsonpath='{.data.JWT_SECRET}' | base64 -d

# Update secret
oc create secret generic idea-workflow-secrets \
  --from-literal=DATABASE_URL='postgresql://...' \
  --from-literal=JWT_SECRET='...' \
  --dry-run=client -o yaml | oc apply -f -

# Restart to pick up secret changes
oc rollout restart deployment/backend
```

## Database

```bash
# Check PostgreSQL status
oc get pods -l app=postgresql

# Shell into PostgreSQL
oc rsh statefulset/postgresql

# Connect to database
oc rsh statefulset/postgresql
psql -U idea_workflow -d idea_workflow

# Port forward for local access
oc port-forward statefulset/postgresql 5432:5432
# Then: psql postgresql://idea_workflow:password@localhost:5432/idea_workflow
```

## Cleanup

```bash
# Clean deployment backup files
make clean-deployment

# Delete all resources (requires confirmation)
make openshift-clean

# Delete specific deployment
oc delete deployment backend -n idea-workflow
oc delete deployment frontend -n idea-workflow

# Delete namespace (careful!)
oc delete namespace idea-workflow
```

## Image Management

```bash
# List images in Quay.io
# Visit: https://quay.io/repository/your-username/idea-workflow-backend

# Pull image locally
docker pull quay.io/$QUAY_USERNAME/idea-workflow-backend:latest

# Tag for different environment
docker tag quay.io/$QUAY_USERNAME/idea-workflow-backend:latest \
           quay.io/$QUAY_USERNAME/idea-workflow-backend:production

# Push
docker push quay.io/$QUAY_USERNAME/idea-workflow-backend:production
```

## Useful Aliases

Add to your `~/.bashrc` or `~/.zshrc`:

```bash
# OpenShift
alias ocl='oc logs -f'
alias ocp='oc get pods -n idea-workflow'
alias ocr='oc rollout restart'
alias ocw='oc get pods -w -n idea-workflow'

# Project-specific
alias ocidea='oc project idea-workflow'
alias ideadeploy='make image-all QUAY_USERNAME=$QUAY_USERNAME'
alias ideabuild='make image-build image-push QUAY_USERNAME=$QUAY_USERNAME'
alias ideastatus='make openshift-status'
```

## Environment-Specific Deployments

```bash
# Development
make image-all QUAY_USERNAME=$QUAY_USERNAME IMAGE_TAG=dev NAMESPACE=idea-workflow-dev

# Staging
make image-all QUAY_USERNAME=$QUAY_USERNAME IMAGE_TAG=staging NAMESPACE=idea-workflow-staging

# Production
make image-all QUAY_USERNAME=$QUAY_USERNAME IMAGE_TAG=v1.0.0 NAMESPACE=idea-workflow-prod
```

## All Available Make Targets

```bash
# See all available targets with descriptions
make help
```

## Troubleshooting Quick Checks

```bash
# 1. Check if pods are running
oc get pods

# 2. Check if services exist
oc get svc

# 3. Check if routes are exposed
oc get routes

# 4. Check recent events
oc get events --sort-by='.lastTimestamp' | tail -20

# 5. Check pod logs
oc logs deployment/backend --tail=50

# 6. Check resource limits
oc describe pod <pod-name> | grep -A 5 "Limits\|Requests"

# 7. Check if image exists
oc describe pod <pod-name> | grep "Image:"

# 8. Check pull secrets
oc get secrets | grep pull
```

## Emergency Procedures

**Backend is down:**
```bash
# Check status
oc get pods -l app=backend

# View logs
oc logs -f deployment/backend

# Restart
oc rollout restart deployment/backend

# Rollback to previous version
oc rollout undo deployment/backend
```

**Database connection issues:**
```bash
# Check PostgreSQL
oc get pods -l app=postgresql
oc logs -f statefulset/postgresql

# Check DATABASE_URL secret
oc get secret idea-workflow-secrets -o jsonpath='{.data.DATABASE_URL}' | base64 -d

# Restart backend to reconnect
oc rollout restart deployment/backend
```

**Image pull failures:**
```bash
# Check events
oc describe pod <pod-name>

# Verify image exists in Quay.io
# Visit: https://quay.io/repository/your-username/idea-workflow-backend

# Check if pull secret exists
oc get secret quay-pull-secret

# Recreate pull secret if needed
oc create secret docker-registry quay-pull-secret \
  --docker-server=quay.io \
  --docker-username=$QUAY_USERNAME \
  --docker-password=$QUAY_PASSWORD
```
