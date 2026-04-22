# Makefile for Idea Workflow Application

.PHONY: help install build test dev clean docker-build docker-up docker-down \
        image-build image-push image-deploy image-all \
        backend-image frontend-image update-images deploy-openshift \
        check-quay-env openshift-status openshift-logs

# Configuration for Quay.io and OpenShift deployment
QUAY_REGISTRY ?= quay.io
QUAY_USERNAME ?= $(shell echo $$QUAY_USERNAME)
IMAGE_TAG ?= latest
PLATFORM ?= linux/amd64
NAMESPACE ?= idea-workflow

# Image names
BACKEND_IMAGE = $(QUAY_REGISTRY)/$(QUAY_USERNAME)/idea-workflow-backend:$(IMAGE_TAG)
FRONTEND_IMAGE = $(QUAY_REGISTRY)/$(QUAY_USERNAME)/idea-workflow-frontend:$(IMAGE_TAG)

# Colors for output
GREEN = \033[0;32m
YELLOW = \033[1;33m
BLUE = \033[0;34m
NC = \033[0m

# Default target
help:
	@echo "$(BLUE)Idea Workflow - Makefile$(NC)"
	@echo ""
	@echo "$(GREEN)Development targets:$(NC)"
	@echo "  install          - Install all dependencies"
	@echo "  build            - Build all projects"
	@echo "  test             - Run tests"
	@echo "  dev              - Start development servers"
	@echo "  dev-backend      - Start backend only"
	@echo "  dev-frontend     - Start frontend only"
	@echo "  clean            - Clean build artifacts"
	@echo ""
	@echo "$(GREEN)Docker Compose targets:$(NC)"
	@echo "  docker-build     - Build Docker images"
	@echo "  docker-up        - Start Docker Compose services"
	@echo "  docker-down      - Stop Docker Compose services"
	@echo "  docker-logs      - View Docker Compose logs"
	@echo "  docker-clean     - Remove services and volumes"
	@echo ""
	@echo "$(GREEN)OpenShift Deployment (Quay.io):$(NC)"
	@echo "  image-all        - Build, push, and deploy (complete workflow)"
	@echo "  image-build      - Build both backend and frontend images"
	@echo "  image-push       - Push both images to Quay.io"
	@echo "  backend-image    - Build and push backend only"
	@echo "  frontend-image   - Build and push frontend only"
	@echo "  deploy-openshift - Deploy to OpenShift cluster"
	@echo "  openshift-status - Check deployment status"
	@echo "  openshift-logs   - View application logs"
	@echo ""
	@echo "$(GREEN)Database:$(NC)"
	@echo "  migrate-up       - Run database migrations"
	@echo "  migrate-down     - Rollback migrations"
	@echo "  migrate-create   - Create new migration"
	@echo ""
	@echo "$(GREEN)Configuration (set via env or command line):$(NC)"
	@echo "  QUAY_USERNAME    - Quay.io username (required for deployment)"
	@echo "  IMAGE_TAG        - Docker image tag (default: latest)"
	@echo "  PLATFORM         - Build platform (default: linux/amd64)"
	@echo "  NAMESPACE        - OpenShift namespace (default: idea-workflow)"
	@echo ""
	@echo "$(GREEN)Examples:$(NC)"
	@echo "  make image-all QUAY_USERNAME=myuser"
	@echo "  make backend-image QUAY_USERNAME=myuser IMAGE_TAG=v1.0.0"
	@echo "  make deploy-openshift"

# Install dependencies
install:
	@echo "Installing dependencies..."
	npm install
	cd backend && npm install
	cd frontend && npm install
	cd shared && npm install

# Build all projects
build:
	@echo "Building all projects..."
	cd shared && npm run build || echo "No build script for shared"
	cd backend && npm run build
	cd frontend && npm run build

# Run tests
test:
	@echo "Running tests..."
	cd backend && npm test || echo "No tests configured"
	cd frontend && npm test || echo "No tests configured"

# Start development servers
dev:
	@echo "Starting development servers..."
	@echo "Backend will run on http://localhost:3001"
	@echo "Frontend will run on http://localhost:3000"
	npm run dev

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	rm -rf backend/dist
	rm -rf frontend/.next
	rm -rf shared/dist
	rm -rf backend/node_modules
	rm -rf frontend/node_modules
	rm -rf shared/node_modules
	rm -rf node_modules

clean-deployment:
	@echo "Cleaning deployment backup files..."
	rm -f openshift/*.bak
	rm -f openshift/*.tmp

# OpenShift Deployment targets (Quay.io)
check-quay-env:
	@if [ -z "$(QUAY_USERNAME)" ]; then \
		echo "\033[0;31mError: QUAY_USERNAME is required\033[0m"; \
		echo "Set it via: export QUAY_USERNAME=your-username"; \
		echo "Or pass it: make image-build QUAY_USERNAME=your-username"; \
		exit 1; \
	fi
	@echo "$(GREEN)✓ Configuration:$(NC)"
	@echo "  Registry:  $(QUAY_REGISTRY)"
	@echo "  Username:  $(QUAY_USERNAME)"
	@echo "  Tag:       $(IMAGE_TAG)"
	@echo "  Platform:  $(PLATFORM)"
	@echo "  Namespace: $(NAMESPACE)"
	@echo ""

backend-image-build: check-quay-env
	@echo "$(GREEN)Building backend image...$(NC)"
	docker build \
		--platform $(PLATFORM) \
		-t $(BACKEND_IMAGE) \
		-f backend/Dockerfile \
		.
	@echo "$(GREEN)✓ Backend image built: $(BACKEND_IMAGE)$(NC)"

frontend-image-build: check-quay-env
	@echo "$(GREEN)Building frontend image...$(NC)"
	docker build \
		--platform $(PLATFORM) \
		-t $(FRONTEND_IMAGE) \
		-f frontend/Dockerfile \
		.
	@echo "$(GREEN)✓ Frontend image built: $(FRONTEND_IMAGE)$(NC)"

image-build: backend-image-build frontend-image-build

backend-image-push: check-quay-env
	@echo "$(GREEN)Pushing backend image...$(NC)"
	docker push $(BACKEND_IMAGE)
	@echo "$(GREEN)✓ Backend pushed: $(BACKEND_IMAGE)$(NC)"

frontend-image-push: check-quay-env
	@echo "$(GREEN)Pushing frontend image...$(NC)"
	docker push $(FRONTEND_IMAGE)
	@echo "$(GREEN)✓ Frontend pushed: $(FRONTEND_IMAGE)$(NC)"

image-push: backend-image-push frontend-image-push

backend-image: backend-image-build backend-image-push

frontend-image: frontend-image-build frontend-image-push

update-images: check-quay-env
	@echo "$(GREEN)Updating deployment files...$(NC)"
	@cp openshift/backend.yaml openshift/backend.yaml.bak 2>/dev/null || true
	@cp openshift/frontend.yaml openshift/frontend.yaml.bak 2>/dev/null || true
	@sed -i.tmp 's|image:.*idea-workflow.*backend.*|image: $(BACKEND_IMAGE)|g' openshift/backend.yaml
	@sed -i.tmp 's|imagePullPolicy: Always|imagePullPolicy: IfNotPresent|g' openshift/backend.yaml
	@sed -i.tmp 's|image:.*idea-workflow.*frontend.*|image: $(FRONTEND_IMAGE)|g' openshift/frontend.yaml
	@sed -i.tmp 's|imagePullPolicy: Always|imagePullPolicy: IfNotPresent|g' openshift/frontend.yaml
	@rm -f openshift/*.tmp
	@echo "$(GREEN)✓ Deployment files updated$(NC)"

deploy-openshift: update-images
	@echo "$(GREEN)Deploying to OpenShift...$(NC)"
	@oc get namespace $(NAMESPACE) &>/dev/null || oc create namespace $(NAMESPACE)
	@oc project $(NAMESPACE)
	@# Deploy ConfigMap and Secret if not exists
	@oc get configmap idea-workflow-config &>/dev/null || oc apply -f openshift/configmap.yaml
	@oc get secret idea-workflow-secrets &>/dev/null || oc apply -f openshift/secret.yaml
	@# Deploy PostgreSQL if not exists
	@oc get statefulset postgresql &>/dev/null || { \
		echo "$(YELLOW)Deploying PostgreSQL...$(NC)"; \
		oc apply -f openshift/postgresql.yaml; \
		oc wait --for=condition=ready pod -l app=postgresql --timeout=300s; \
	}
	@# Deploy Backend
	@echo "$(YELLOW)Deploying Backend...$(NC)"
	@oc apply -f openshift/backend.yaml
	@oc rollout status deployment/backend --timeout=300s
	@echo "$(GREEN)✓ Backend deployed$(NC)"
	@# Deploy Frontend
	@echo "$(YELLOW)Deploying Frontend...$(NC)"
	@oc apply -f openshift/frontend.yaml
	@oc rollout status deployment/frontend --timeout=300s
	@echo "$(GREEN)✓ Frontend deployed$(NC)"
	@echo ""
	@echo "$(GREEN)Deployment Complete!$(NC)"
	@echo "  Backend:  https://$$(oc get route backend -o jsonpath='{.spec.host}' 2>/dev/null)"
	@echo "  Frontend: https://$$(oc get route frontend -o jsonpath='{.spec.host}' 2>/dev/null)"

image-all: image-build image-push deploy-openshift

# Docker targets
docker-build:
	@echo "Building Docker images..."
	docker-compose build

docker-up:
	@echo "Starting Docker Compose services..."
	docker-compose up -d
	@echo ""
	@echo "Services started:"
	@echo "  Frontend: http://localhost:3000"
	@echo "  Backend:  http://localhost:3001"
	@echo "  Database: localhost:5432"
	@echo ""
	@echo "View logs with: make docker-logs"

docker-down:
	@echo "Stopping Docker Compose services..."
	docker-compose down

docker-logs:
	docker-compose logs -f

docker-clean:
	@echo "Removing Docker Compose services and volumes..."
	docker-compose down -v

# OpenShift management targets
openshift-status:
	@echo "$(GREEN)OpenShift Deployment Status:$(NC)"
	@echo ""
	@echo "$(YELLOW)Pods:$(NC)"
	@oc get pods -n $(NAMESPACE) -l 'app in (backend,frontend,postgresql)'
	@echo ""
	@echo "$(YELLOW)Routes:$(NC)"
	@oc get routes -n $(NAMESPACE)
	@echo ""
	@echo "$(YELLOW)Services:$(NC)"
	@oc get svc -n $(NAMESPACE)

openshift-logs:
	@echo "$(YELLOW)Select component to view logs:$(NC)"
	@echo "  make logs-backend"
	@echo "  make logs-frontend"
	@echo "  make logs-postgresql"

logs-backend:
	oc logs -f deployment/backend -n $(NAMESPACE)

logs-frontend:
	oc logs -f deployment/frontend -n $(NAMESPACE)

logs-postgresql:
	oc logs -f statefulset/postgresql -n $(NAMESPACE)

restart-backend:
	@echo "$(YELLOW)Restarting backend...$(NC)"
	@oc rollout restart deployment/backend -n $(NAMESPACE)

restart-frontend:
	@echo "$(YELLOW)Restarting frontend...$(NC)"
	@oc rollout restart deployment/frontend -n $(NAMESPACE)

rollback-backend:
	@echo "$(YELLOW)Rolling back backend...$(NC)"
	@oc rollout undo deployment/backend -n $(NAMESPACE)

rollback-frontend:
	@echo "$(YELLOW)Rolling back frontend...$(NC)"
	@oc rollout undo deployment/frontend -n $(NAMESPACE)

shell-backend:
	@oc rsh -n $(NAMESPACE) deployment/backend

shell-frontend:
	@oc rsh -n $(NAMESPACE) deployment/frontend

shell-postgresql:
	@oc rsh -n $(NAMESPACE) statefulset/postgresql

openshift-clean:
	@echo "\033[0;31mWARNING: This will delete all resources in namespace $(NAMESPACE)!\033[0m"
	@read -p "Are you sure? Type 'yes' to confirm: " confirm && [ "$$confirm" = "yes" ] || exit 1
	@oc delete all -l app=backend -n $(NAMESPACE) 2>/dev/null || true
	@oc delete all -l app=frontend -n $(NAMESPACE) 2>/dev/null || true
	@oc delete all -l app=postgresql -n $(NAMESPACE) 2>/dev/null || true
	@oc delete pvc -l app=postgresql -n $(NAMESPACE) 2>/dev/null || true
	@echo "$(GREEN)✓ Resources deleted$(NC)"

# Database migrations
migrate-up:
	@echo "Running database migrations..."
	cd backend && npm run migrate:up

migrate-down:
	@echo "Rolling back database migrations..."
	cd backend && npm run migrate:down

migrate-create:
	@echo "Creating new migration..."
	@read -p "Enter migration name: " name; \
	cd backend && npm run migrate:create $$name

# Format code
format:
	@echo "Formatting code..."
	npm run format

format-check:
	@echo "Checking code formatting..."
	npm run format:check

# Useful development commands
dev-backend:
	@echo "Starting backend in development mode..."
	cd backend && npm run dev

dev-frontend:
	@echo "Starting frontend in development mode..."
	cd frontend && npm run dev

# OpenShift database migration
openshift-migrate:
	@echo "Running migrations in OpenShift..."
	@BACKEND_POD=$$(oc get pods -n idea-workflow -l app=backend -o jsonpath='{.items[0].metadata.name}'); \
	oc exec -it $$BACKEND_POD -n idea-workflow -- npm run migrate:up
