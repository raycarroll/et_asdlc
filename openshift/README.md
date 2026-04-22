# OpenShift Deployment Guide

This guide covers deploying the Idea Validation and Spec Generation Workflow application to OpenShift.

## Prerequisites

- OpenShift CLI (`oc`) installed and configured
- Access to an OpenShift cluster
- Cluster admin permissions or a project with sufficient quotas

## Quick Start

```bash
# Login to OpenShift
oc login <your-openshift-cluster-url>

# Create project/namespace
oc apply -f openshift/namespace.yaml

# Switch to the namespace
oc project idea-workflow

# Deploy all resources
./openshift/deploy.sh

# Or deploy manually step-by-step (see below)
```

## Manual Deployment Steps

### 1. Create Namespace

```bash
oc apply -f openshift/namespace.yaml
oc project idea-workflow
```

### 2. Create Secrets

**IMPORTANT**: Update secrets before deploying!

```bash
# Generate a secure JWT secret
JWT_SECRET=$(openssl rand -base64 48)

# Create the secret
oc create secret generic idea-workflow-secrets \
  --from-literal=DATABASE_URL='postgresql://ideas:YOUR_DB_PASSWORD@postgresql:5432/ideas' \
  --from-literal=JWT_SECRET="${JWT_SECRET}" \
  --from-literal=IDEAS_REPO_URL='https://github.com/your-org/ideas-repository.git' \
  --from-literal=TEMPLATES_REPO_URL='https://github.com/your-org/idea-templates.git' \
  -n idea-workflow

# Or use the template and edit it
oc apply -f openshift/secret.yaml
oc edit secret idea-workflow-secrets -n idea-workflow
```

### 3. Create ConfigMap

```bash
oc apply -f openshift/configmap.yaml
```

### 4. Deploy PostgreSQL Database

```bash
# Create PostgreSQL secret
oc create secret generic postgresql-secret \
  --from-literal=password='YOUR_SECURE_PASSWORD' \
  -n idea-workflow

# Deploy PostgreSQL
oc apply -f openshift/postgresql.yaml

# Wait for PostgreSQL to be ready
oc wait --for=condition=ready pod -l app=postgresql -n idea-workflow --timeout=300s

# Initialize database schema
oc exec -it postgresql-0 -n idea-workflow -- psql -U ideas -d ideas -f /path/to/schema.sql
```

### 5. Build and Deploy Backend

```bash
# Option A: Build from Git repository (recommended)
oc apply -f openshift/buildconfig.yaml
oc start-build backend -n idea-workflow --follow

# Option B: Build from local source
oc new-build --name=backend --binary --strategy=docker -n idea-workflow
oc start-build backend --from-dir=./backend --follow

# Deploy backend
oc apply -f openshift/backend.yaml

# Wait for backend to be ready
oc wait --for=condition=available deployment/backend -n idea-workflow --timeout=300s
```

### 6. Build and Deploy Frontend

```bash
# Option A: Build from Git repository (recommended)
oc start-build frontend -n idea-workflow --follow

# Option B: Build from local source
oc new-build --name=frontend --binary --strategy=docker -n idea-workflow
oc start-build frontend --from-dir=./frontend --follow

# Deploy frontend
oc apply -f openshift/frontend.yaml

# Wait for frontend to be ready
oc wait --for=condition=available deployment/frontend -n idea-workflow --timeout=300s
```

### 7. Verify Deployment

```bash
# Check all pods are running
oc get pods -n idea-workflow

# Check services
oc get svc -n idea-workflow

# Check routes
oc get routes -n idea-workflow

# Get application URLs
echo "Frontend URL: https://$(oc get route frontend -n idea-workflow -o jsonpath='{.spec.host}')"
echo "Backend URL: https://$(oc get route backend -n idea-workflow -o jsonpath='{.spec.host}')"

# Test backend health
curl https://$(oc get route backend -n idea-workflow -o jsonpath='{.spec.host}')/health
```

## Database Initialization

Run database migrations:

```bash
# Get backend pod name
BACKEND_POD=$(oc get pods -n idea-workflow -l app=backend -o jsonpath='{.items[0].metadata.name}')

# Run migrations
oc exec -it ${BACKEND_POD} -n idea-workflow -- npm run migrate:up
```

## Scaling

### Scale Backend

```bash
# Scale to 3 replicas
oc scale deployment/backend --replicas=3 -n idea-workflow

# Autoscaling (HPA)
oc autoscale deployment/backend \
  --min=2 \
  --max=5 \
  --cpu-percent=70 \
  -n idea-workflow
```

### Scale Frontend

```bash
# Scale to 3 replicas
oc scale deployment/frontend --replicas=3 -n idea-workflow

# Autoscaling
oc autoscale deployment/frontend \
  --min=2 \
  --max=10 \
  --cpu-percent=70 \
  -n idea-workflow
```

## Monitoring

### View Logs

```bash
# Backend logs
oc logs -f deployment/backend -n idea-workflow

# Frontend logs
oc logs -f deployment/frontend -n idea-workflow

# PostgreSQL logs
oc logs -f statefulset/postgresql -n idea-workflow

# All pods logs
oc logs -f -l app=idea-workflow -n idea-workflow
```

### Check Resource Usage

```bash
# Pod resource usage
oc adm top pods -n idea-workflow

# Node resource usage
oc adm top nodes
```

## Troubleshooting

### Pod Not Starting

```bash
# Describe pod to see events
oc describe pod <pod-name> -n idea-workflow

# Check pod logs
oc logs <pod-name> -n idea-workflow

# Get previous container logs if crashed
oc logs <pod-name> -n idea-workflow --previous
```

### Database Connection Issues

```bash
# Test database connectivity from backend pod
BACKEND_POD=$(oc get pods -n idea-workflow -l app=backend -o jsonpath='{.items[0].metadata.name}')

oc exec -it ${BACKEND_POD} -n idea-workflow -- \
  psql ${DATABASE_URL} -c "SELECT 1"
```

### Route Not Accessible

```bash
# Check route configuration
oc describe route frontend -n idea-workflow

# Check if route is exposed
oc get route frontend -n idea-workflow -o yaml

# Test internal service
oc exec -it ${BACKEND_POD} -n idea-workflow -- \
  curl http://frontend:3000
```

## Updates and Rollouts

### Update Backend

```bash
# Trigger new build
oc start-build backend -n idea-workflow --follow

# Or update image
oc set image deployment/backend \
  backend=image-registry.openshift-image-registry.svc:5000/idea-workflow/backend:v2 \
  -n idea-workflow

# Watch rollout
oc rollout status deployment/backend -n idea-workflow

# Rollback if needed
oc rollout undo deployment/backend -n idea-workflow
```

### Update Frontend

```bash
# Trigger new build
oc start-build frontend -n idea-workflow --follow

# Watch rollout
oc rollout status deployment/frontend -n idea-workflow
```

## Backup and Restore

### Backup Database

```bash
# Create backup
oc exec postgresql-0 -n idea-workflow -- \
  pg_dump -U ideas ideas > backup-$(date +%Y%m%d-%H%M%S).sql

# Store in persistent volume
oc exec postgresql-0 -n idea-workflow -- \
  pg_dump -U ideas ideas > /var/lib/pgsql/data/backups/backup-$(date +%Y%m%d).sql
```

### Restore Database

```bash
# Restore from backup
oc exec -i postgresql-0 -n idea-workflow -- \
  psql -U ideas ideas < backup.sql
```

## Cleanup

```bash
# Delete all resources
oc delete all -l app=idea-workflow -n idea-workflow

# Delete persistent volumes
oc delete pvc --all -n idea-workflow

# Delete namespace
oc delete namespace idea-workflow
```

## Security Considerations

1. **Secrets Management**: Never commit actual secrets to git. Use OpenShift secrets or external secret managers (Vault, etc.)

2. **TLS/SSL**: Routes are configured with edge termination. Ensure certificates are properly configured.

3. **Network Policies**: Consider adding NetworkPolicy resources to restrict pod-to-pod communication.

4. **RBAC**: Configure proper Role-Based Access Control for the namespace.

5. **Image Scanning**: Enable image scanning in the OpenShift registry.

6. **Security Context Constraints**: Pods run with non-root users and minimal capabilities.

## Performance Tuning

### Database

```bash
# Increase PostgreSQL resources
oc set resources statefulset/postgresql \
  --requests=cpu=500m,memory=1Gi \
  --limits=cpu=1,memory=2Gi \
  -n idea-workflow
```

### Backend

```bash
# Increase backend resources
oc set resources deployment/backend \
  --requests=cpu=200m,memory=512Mi \
  --limits=cpu=1,memory=1Gi \
  -n idea-workflow

# Increase connection pool
oc set env deployment/backend \
  DATABASE_POOL_SIZE=50 \
  -n idea-workflow
```

## Environment-Specific Configurations

### Development

```bash
# Use development config
oc set env deployment/backend LOG_LEVEL=debug -n idea-workflow
```

### Production

```bash
# Use production config
oc set env deployment/backend LOG_LEVEL=info -n idea-workflow

# Enable resource limits
oc set resources deployment/backend \
  --requests=cpu=500m,memory=1Gi \
  --limits=cpu=2,memory=2Gi \
  -n idea-workflow
```

## Additional Resources

- [OpenShift Documentation](https://docs.openshift.com/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [PostgreSQL on OpenShift](https://docs.openshift.com/container-platform/latest/applications/databases/postgresql.html)
