# OpenShift Deployment Files

This document describes all files related to OpenShift deployment.

## Directory Structure

```
.
├── backend/
│   ├── Dockerfile              # Backend container image
│   └── .dockerignore           # Files to exclude from Docker build
│
├── frontend/
│   ├── Dockerfile              # Frontend container image
│   └── .dockerignore           # Files to exclude from Docker build
│
├── openshift/
│   ├── namespace.yaml          # Kubernetes namespace definition
│   ├── configmap.yaml          # Non-sensitive configuration
│   ├── secret.yaml             # Sensitive configuration (template)
│   ├── postgresql.yaml         # PostgreSQL StatefulSet and Service
│   ├── backend.yaml            # Backend Deployment, Service, Route, PVC
│   ├── frontend.yaml           # Frontend Deployment, Service, Route
│   ├── buildconfig.yaml        # OpenShift BuildConfig and ImageStreams
│   ├── deploy.sh               # Automated deployment script
│   ├── README.md               # Comprehensive deployment guide
│   ├── QUICKREF.md             # Quick reference commands
│   └── FILES.md                # This file
│
├── docker-compose.yml          # Local development with Docker Compose
├── DEPLOYMENT.md               # Complete deployment documentation
└── Makefile                    # Convenience commands
```

## File Descriptions

### Container Images

#### `backend/Dockerfile`
Multi-stage Docker build for the Node.js/TypeScript backend:
- **Builder stage**: Installs dependencies and compiles TypeScript
- **Production stage**: Runs compiled JavaScript with minimal dependencies
- **User**: Runs as non-root user (UID 1001) for OpenShift compatibility
- **Healthcheck**: HTTP check on `/health` endpoint
- **Port**: Exposes 3001

#### `frontend/Dockerfile`
Multi-stage Docker build for the Next.js frontend:
- **Builder stage**: Builds Next.js application
- **Production stage**: Serves built application
- **User**: Runs as non-root user (UID 1001) for OpenShift compatibility
- **Healthcheck**: HTTP check on root path
- **Port**: Exposes 3000

#### `.dockerignore` files
Excludes unnecessary files from Docker build context:
- node_modules/
- Build outputs
- Development files
- Git history
- Documentation

### OpenShift Manifests

#### `openshift/namespace.yaml`
Creates the `idea-workflow` namespace with labels.

#### `openshift/configmap.yaml`
Stores non-sensitive configuration:
- API configuration (port, base URL)
- Database pool size
- Git repository paths
- Template update interval
- Logging level
- Frontend API URL

#### `openshift/secret.yaml`
**TEMPLATE** for sensitive configuration (must be customized):
- Database connection URL
- JWT secret
- Git repository URLs

**Important**: This is a template. Create actual secrets using:
```bash
oc create secret generic idea-workflow-secrets \
  --from-literal=DATABASE_URL='...' \
  --from-literal=JWT_SECRET='...' \
  --from-literal=IDEAS_REPO_URL='...' \
  --from-literal=TEMPLATES_REPO_URL='...'
```

#### `openshift/postgresql.yaml`
Defines:
- **StatefulSet**: PostgreSQL 15 with persistent storage
- **Service**: Headless service for StatefulSet
- **Secret**: PostgreSQL password (template)
- **PVC Template**: 10Gi storage for database data
- **Health checks**: Liveness and readiness probes
- **Resources**: 512Mi-1Gi memory, 250m-500m CPU

#### `openshift/backend.yaml`
Defines:
- **Deployment**: Backend API with 2 replicas
- **PersistentVolumeClaim**: 5Gi ReadWriteMany for git repositories
- **Service**: ClusterIP service on port 3001
- **Route**: HTTPS route with edge termination
- **Environment**: Variables from ConfigMap and Secret
- **Health checks**: HTTP probes on `/health`
- **Resources**: 256Mi-512Mi memory, 100m-500m CPU
- **Security**: Non-root, drops all capabilities

#### `openshift/frontend.yaml`
Defines:
- **Deployment**: Frontend UI with 2 replicas
- **Service**: ClusterIP service on port 3000
- **Route**: HTTPS route with edge termination
- **Environment**: API URL from ConfigMap
- **Health checks**: HTTP probes on `/`
- **Resources**: 128Mi-256Mi memory, 50m-200m CPU
- **Security**: Non-root, drops all capabilities

#### `openshift/frontend-custom-domain.yaml`
Optional custom domain configuration:
- **Route**: Alternative route using custom domain instead of default OpenShift domain
- **TLS**: Edge termination with optional custom certificates
- **Instructions**: DNS configuration and certificate setup steps
- **Use case**: Production deployments requiring branded URLs

#### `openshift/buildconfig.yaml`
Defines:
- **BuildConfig (backend)**: Builds from Git repository
- **BuildConfig (frontend)**: Builds from Git repository
- **ImageStream (backend)**: Stores backend images
- **ImageStream (frontend)**: Stores frontend images
- **Triggers**: Auto-rebuild on code changes

### Scripts & Documentation

#### `openshift/deploy.sh`
Automated deployment script that:
1. Checks prerequisites (oc CLI, login status)
2. Creates namespace
3. Creates/validates secrets
4. Deploys ConfigMap
5. Deploys PostgreSQL
6. Deploys backend
7. Deploys frontend
8. Runs database migrations
9. Shows deployment status

**Usage**:
```bash
chmod +x openshift/deploy.sh
./openshift/deploy.sh
```

#### `openshift/README.md`
Comprehensive deployment guide covering:
- Prerequisites
- Quick start
- Manual deployment steps
- Database initialization
- Scaling
- Monitoring
- Troubleshooting
- Updates and rollouts
- Backup and restore
- Security considerations
- Performance tuning

#### `openshift/QUICKREF.md`
Quick reference for common operations:
- Login & project management
- Deployment commands
- Status & monitoring
- Logs
- Scaling
- Builds
- Configuration
- Database operations
- Debugging
- Rollback
- Common workflows

### Development Tools

#### `docker-compose.yml`
Local development environment with:
- PostgreSQL database
- Backend API
- Frontend UI
- Networking and volumes
- Health checks
- Automatic database initialization

**Usage**:
```bash
docker-compose up -d
```

#### `DEPLOYMENT.md`
Master deployment documentation covering:
- Local development (Docker Compose)
- OpenShift deployment
- Building container images
- Environment variables
- Database setup
- Troubleshooting
- Production checklist
- Performance tuning
- Monitoring

#### `Makefile`
Convenience commands for:
- `make install` - Install dependencies
- `make build` - Build all projects
- `make dev` - Start development servers
- `make docker-up` - Start Docker Compose
- `make openshift-deploy` - Deploy to OpenShift
- `make migrate-up` - Run database migrations
- And more...

**Usage**:
```bash
make help
```

## Deployment Workflows

### Local Development

```bash
# Docker Compose
make docker-up
make docker-logs

# Or traditional npm
make install
make dev
```

### OpenShift Deployment

```bash
# Automated
make openshift-deploy

# Manual
cd openshift
./deploy.sh

# Step-by-step
oc apply -f openshift/namespace.yaml
oc create secret generic idea-workflow-secrets ...
oc apply -f openshift/configmap.yaml
oc apply -f openshift/postgresql.yaml
oc apply -f openshift/backend.yaml
oc apply -f openshift/frontend.yaml
```

## Security Notes

1. **Never commit secrets**: The `secret.yaml` is a template only
2. **Generate strong secrets**: Use `openssl rand -base64 48` for JWT_SECRET
3. **Update default passwords**: Change all "changeme" passwords
4. **Use TLS**: Routes are configured with edge termination
5. **Non-root containers**: All containers run as UID 1001
6. **Minimal capabilities**: Security contexts drop all capabilities

## Customization

### Change Resource Limits

Edit the respective YAML files:
- PostgreSQL: `openshift/postgresql.yaml`
- Backend: `openshift/backend.yaml`
- Frontend: `openshift/frontend.yaml`

Or use `oc set resources`:
```bash
oc set resources deployment/backend \
  --requests=cpu=500m,memory=1Gi \
  --limits=cpu=2,memory=2Gi
```

### Change Replica Counts

Edit YAML files or use:
```bash
oc scale deployment/backend --replicas=5
```

### Add Environment Variables

Edit ConfigMap or use:
```bash
oc set env deployment/backend NEW_VAR=value
```

### Update Git Repository URLs

Edit the secret:
```bash
oc edit secret idea-workflow-secrets
```

Or recreate it:
```bash
oc delete secret idea-workflow-secrets
oc create secret generic idea-workflow-secrets --from-literal=...
```

## Monitoring

All deployments include:
- **Liveness probes**: Restart unhealthy pods
- **Readiness probes**: Remove unhealthy pods from load balancer
- **Resource limits**: Prevent resource exhaustion
- **Health endpoints**: `/health` for status checks

Check status:
```bash
oc get pods
oc describe pod <pod-name>
oc logs -f deployment/backend
```

## Troubleshooting

See:
- `DEPLOYMENT.md` - Comprehensive troubleshooting guide
- `openshift/README.md` - OpenShift-specific troubleshooting
- `openshift/QUICKREF.md` - Common debugging commands
