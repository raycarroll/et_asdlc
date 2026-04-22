#!/bin/bash
# OpenShift Deployment Script
# Automates deployment of the Idea Workflow application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="idea-workflow"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Functions
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_oc() {
    if ! command -v oc &> /dev/null; then
        print_error "OpenShift CLI (oc) is not installed"
        exit 1
    fi
    print_info "OpenShift CLI found: $(oc version --client)"
}

check_logged_in() {
    if ! oc whoami &> /dev/null; then
        print_error "Not logged into OpenShift cluster"
        print_info "Please run: oc login <cluster-url>"
        exit 1
    fi
    print_info "Logged in as: $(oc whoami)"
}

create_namespace() {
    print_info "Creating namespace: ${NAMESPACE}"
    oc apply -f "${SCRIPT_DIR}/namespace.yaml"
    oc project "${NAMESPACE}"
}

check_secrets() {
    if ! oc get secret idea-workflow-secrets -n "${NAMESPACE}" &> /dev/null; then
        print_warn "Secret 'idea-workflow-secrets' not found"
        print_warn "Creating default secret (UPDATE WITH REAL VALUES!)"

        JWT_SECRET=$(openssl rand -base64 48)

        oc create secret generic idea-workflow-secrets \
            --from-literal=DATABASE_URL='postgresql://ideas:changeme@postgresql:5432/ideas' \
            --from-literal=JWT_SECRET="${JWT_SECRET}" \
            --from-literal=IDEAS_REPO_URL='https://github.com/your-org/ideas-repository.git' \
            --from-literal=TEMPLATES_REPO_URL='https://github.com/your-org/idea-templates.git' \
            -n "${NAMESPACE}"

        print_warn "IMPORTANT: Edit the secret with real values:"
        print_warn "  oc edit secret idea-workflow-secrets -n ${NAMESPACE}"
    else
        print_info "Secret 'idea-workflow-secrets' exists"
    fi
}

deploy_configmap() {
    print_info "Deploying ConfigMap"
    oc apply -f "${SCRIPT_DIR}/configmap.yaml"
}

deploy_postgresql() {
    print_info "Deploying PostgreSQL database"

    # Create PostgreSQL secret if it doesn't exist
    if ! oc get secret postgresql-secret -n "${NAMESPACE}" &> /dev/null; then
        print_warn "Creating PostgreSQL secret (UPDATE PASSWORD!)"
        oc create secret generic postgresql-secret \
            --from-literal=password='changeme' \
            -n "${NAMESPACE}"
    fi

    oc apply -f "${SCRIPT_DIR}/postgresql.yaml"

    print_info "Waiting for PostgreSQL to be ready..."
    oc wait --for=condition=ready pod -l app=postgresql -n "${NAMESPACE}" --timeout=300s || {
        print_error "PostgreSQL failed to start"
        return 1
    }

    print_info "PostgreSQL is ready"
}

deploy_backend() {
    print_info "Deploying backend"

    # Create BuildConfig and ImageStream if they don't exist
    if ! oc get imagestream backend -n "${NAMESPACE}" &> /dev/null; then
        print_info "Creating BuildConfig for backend"
        oc apply -f "${SCRIPT_DIR}/buildconfig.yaml"
    fi

    # Deploy backend
    oc apply -f "${SCRIPT_DIR}/backend.yaml"

    print_info "Waiting for backend to be ready..."
    oc wait --for=condition=available deployment/backend -n "${NAMESPACE}" --timeout=300s || {
        print_warn "Backend deployment timeout, check status with: oc get pods -n ${NAMESPACE}"
        return 1
    }

    print_info "Backend is ready"
}

deploy_frontend() {
    print_info "Deploying frontend"

    # Create BuildConfig and ImageStream if they don't exist
    if ! oc get imagestream frontend -n "${NAMESPACE}" &> /dev/null; then
        print_info "Creating BuildConfig for frontend"
        # Already applied in deploy_backend
        :
    fi

    # Deploy frontend
    oc apply -f "${SCRIPT_DIR}/frontend.yaml"

    print_info "Waiting for frontend to be ready..."
    oc wait --for=condition=available deployment/frontend -n "${NAMESPACE}" --timeout=300s || {
        print_warn "Frontend deployment timeout, check status with: oc get pods -n ${NAMESPACE}"
        return 1
    }

    print_info "Frontend is ready"
}

run_migrations() {
    print_info "Running database migrations"

    BACKEND_POD=$(oc get pods -n "${NAMESPACE}" -l app=backend -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)

    if [ -z "$BACKEND_POD" ]; then
        print_warn "No backend pod found, skipping migrations"
        return 0
    fi

    oc exec -it "${BACKEND_POD}" -n "${NAMESPACE}" -- npm run migrate:up || {
        print_warn "Migrations failed, you may need to run them manually"
        return 1
    }

    print_info "Migrations completed"
}

show_status() {
    print_info "Deployment Status:"
    echo ""

    print_info "Pods:"
    oc get pods -n "${NAMESPACE}"
    echo ""

    print_info "Services:"
    oc get svc -n "${NAMESPACE}"
    echo ""

    print_info "Routes:"
    oc get routes -n "${NAMESPACE}"
    echo ""

    FRONTEND_URL=$(oc get route frontend -n "${NAMESPACE}" -o jsonpath='{.spec.host}' 2>/dev/null)
    BACKEND_URL=$(oc get route backend -n "${NAMESPACE}" -o jsonpath='{.spec.host}' 2>/dev/null)

    if [ -n "$FRONTEND_URL" ]; then
        print_info "Frontend URL: https://${FRONTEND_URL}"
    fi

    if [ -n "$BACKEND_URL" ]; then
        print_info "Backend URL: https://${BACKEND_URL}"
        print_info "Backend Health: https://${BACKEND_URL}/health"
    fi
}

# Main deployment flow
main() {
    print_info "Starting OpenShift deployment"
    print_info "Namespace: ${NAMESPACE}"
    echo ""

    check_oc
    check_logged_in

    create_namespace
    check_secrets
    deploy_configmap
    deploy_postgresql
    deploy_backend
    deploy_frontend

    # Run migrations if backend is ready
    sleep 10  # Give backend a moment to stabilize
    run_migrations || true

    echo ""
    show_status
    echo ""

    print_info "Deployment complete!"
    print_warn "Remember to update secrets with real values:"
    print_warn "  oc edit secret idea-workflow-secrets -n ${NAMESPACE}"
    print_warn "  oc edit secret postgresql-secret -n ${NAMESPACE}"
}

# Run main function
main
