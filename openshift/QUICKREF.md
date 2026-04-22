# OpenShift Quick Reference

Quick command reference for managing the Idea Workflow application on OpenShift.

## Login & Project

```bash
# Login
oc login https://api.cluster.example.com:6443

# Switch project
oc project idea-workflow

# Get current project
oc project
```

## Deployment

```bash
# Quick deploy
./deploy.sh

# Deploy specific component
oc apply -f backend.yaml
oc apply -f frontend.yaml
oc apply -f postgresql.yaml

# Restart deployment
oc rollout restart deployment/backend
oc rollout restart deployment/frontend
```

## Status & Monitoring

```bash
# Get all resources
oc get all

# Get pods
oc get pods
oc get pods -w  # Watch mode

# Get deployments
oc get deployments

# Get routes (URLs)
oc get routes

# Describe resource
oc describe pod/<pod-name>
oc describe deployment/backend
```

## Logs

```bash
# View logs
oc logs -f deployment/backend
oc logs -f deployment/frontend
oc logs -f statefulset/postgresql

# Previous logs (if pod crashed)
oc logs <pod-name> --previous

# All app logs
oc logs -f -l app=idea-workflow
```

## Scaling

```bash
# Manual scaling
oc scale deployment/backend --replicas=3
oc scale deployment/frontend --replicas=5

# Autoscaling
oc autoscale deployment/backend --min=2 --max=10 --cpu-percent=70
oc get hpa  # View autoscalers
```

## Builds

```bash
# Start build
oc start-build backend --follow
oc start-build frontend --follow

# Build from local source
oc start-build backend --from-dir=./backend --follow

# Cancel build
oc cancel-build <build-name>

# View build logs
oc logs -f bc/backend
```

## Configuration

```bash
# View secrets
oc get secrets
oc describe secret idea-workflow-secrets

# Edit secret
oc edit secret idea-workflow-secrets

# View configmap
oc get configmap
oc describe configmap idea-workflow-config

# Edit configmap
oc edit configmap idea-workflow-config

# Update environment variable
oc set env deployment/backend LOG_LEVEL=debug
oc set env deployment/backend --list
```

## Database

```bash
# Connect to database
oc exec -it postgresql-0 -- psql -U ideas ideas

# Run migrations
BACKEND_POD=$(oc get pods -l app=backend -o jsonpath='{.items[0].metadata.name}')
oc exec -it ${BACKEND_POD} -- npm run migrate:up

# Backup database
oc exec postgresql-0 -- pg_dump -U ideas ideas > backup-$(date +%Y%m%d).sql

# Restore database
oc exec -i postgresql-0 -- psql -U ideas ideas < backup.sql

# View database logs
oc logs -f statefulset/postgresql
```

## Debugging

```bash
# Get shell in pod
oc exec -it <pod-name> -- /bin/sh
oc exec -it <pod-name> -- /bin/bash

# Run command in pod
oc exec <pod-name> -- env
oc exec <pod-name> -- ls -la /app

# Port forward
oc port-forward service/backend 3001:3001
oc port-forward service/frontend 3000:3000

# Copy files to/from pod
oc cp <pod-name>:/app/file.txt ./local-file.txt
oc cp ./local-file.txt <pod-name>:/app/file.txt

# View events
oc get events --sort-by='.lastTimestamp'
```

## Resources

```bash
# View resource usage
oc adm top pods
oc adm top nodes

# Set resource limits
oc set resources deployment/backend \
  --requests=cpu=100m,memory=256Mi \
  --limits=cpu=500m,memory=512Mi

# View resource quotas
oc get resourcequota
oc describe resourcequota
```

## Rollback

```bash
# View rollout history
oc rollout history deployment/backend

# Rollback to previous version
oc rollout undo deployment/backend

# Rollback to specific revision
oc rollout undo deployment/backend --to-revision=2

# Pause/Resume rollout
oc rollout pause deployment/backend
oc rollout resume deployment/backend
```

## Routes (URLs)

```bash
# Get application URLs
oc get routes

# Get specific route
FRONTEND_URL=$(oc get route frontend -o jsonpath='{.spec.host}')
echo "https://${FRONTEND_URL}"

# Create route
oc expose service/backend --name=backend-api

# Delete route
oc delete route backend
```

## Cleanup

```bash
# Delete deployment
oc delete deployment/backend

# Delete all resources with label
oc delete all -l app=backend

# Delete everything
oc delete all --all

# Delete PVCs
oc delete pvc --all

# Delete project
oc delete project idea-workflow
```

## Troubleshooting

```bash
# Pod not starting
oc describe pod <pod-name>
oc logs <pod-name>
oc get events

# Image pull errors
oc describe pod <pod-name> | grep -A 10 Events

# Service not accessible
oc get endpoints
oc describe service <service-name>

# Route not working
oc describe route <route-name>
curl -I https://<route-host>

# Database connection issues
oc exec <backend-pod> -- env | grep DATABASE
oc exec <backend-pod> -- nc -zv postgresql 5432
```

## Useful Aliases

```bash
# Add to ~/.bashrc or ~/.zshrc
alias k='oc'
alias kgp='oc get pods'
alias kgs='oc get svc'
alias kgd='oc get deployments'
alias kl='oc logs -f'
alias kex='oc exec -it'
alias kdp='oc describe pod'
alias kgr='oc get routes'
```

## Common Workflows

### Deploy New Version

```bash
# Build new image
oc start-build backend --follow

# Verify new image
oc get is backend

# Deployment will auto-update with ImageChange trigger
# Or manually trigger
oc rollout latest deployment/backend

# Watch rollout
oc rollout status deployment/backend
```

### Update Configuration

```bash
# Edit configmap
oc edit configmap idea-workflow-config

# Restart to pick up changes
oc rollout restart deployment/backend
oc rollout restart deployment/frontend

# Verify
oc logs -f deployment/backend | grep -i config
```

### Scale for Traffic

```bash
# Increase replicas before high traffic
oc scale deployment/backend --replicas=5
oc scale deployment/frontend --replicas=10

# Monitor
oc get pods -w
oc adm top pods

# Scale back after traffic
oc scale deployment/backend --replicas=2
oc scale deployment/frontend --replicas=2
```

### Emergency Rollback

```bash
# Quick rollback
oc rollout undo deployment/backend

# Check status
oc rollout status deployment/backend

# Verify health
curl https://$(oc get route backend -o jsonpath='{.spec.host}')/health
```
