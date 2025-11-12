#!/bin/bash
# Docker Hub build and push script for Town Crier
# Usage: ./docker-push.sh [version] [--no-latest]
# Examples:
#   ./docker-push.sh                    (builds and pushes as :latest)
#   ./docker-push.sh 1.0.0              (builds and pushes as :1.0.0 and :latest)
#   ./docker-push.sh 1.0.0 --no-latest  (builds and pushes as :1.0.0 only)

set -e

VERSION=${1:-latest}
PUSH_LATEST=${2:-"--latest"}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check Docker is running
check_docker() {
    if ! docker ps &> /dev/null; then
        log_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    log_info "Docker is running ✓"
}

# Check Docker credentials
check_docker_login() {
    if ! docker info | grep -q "Username"; then
        log_error "Not logged in to Docker Hub"
        log_info "Run: docker login"
        exit 1
    fi
    log_info "Docker Hub authenticated ✓"
}

# Build images
build_images() {
    log_step "Building images..."
    
    log_info "Building backend (server)..."
    docker build \
        -t jrustyhaner/towncrier-server:$VERSION \
        -f server/Dockerfile.prod \
        ./server
    
    if [ "$PUSH_LATEST" != "--no-latest" ]; then
        docker tag jrustyhaner/towncrier-server:$VERSION jrustyhaner/towncrier-server:latest
        log_info "Tagged as :latest"
    fi
    
    log_info "Building frontend..."
    docker build \
        -t jrustyhaner/towncrier-frontend:$VERSION \
        -f frontend/Dockerfile.prod \
        ./frontend
    
    if [ "$PUSH_LATEST" != "--no-latest" ]; then
        docker tag jrustyhaner/towncrier-frontend:$VERSION jrustyhaner/towncrier-frontend:latest
        log_info "Tagged as :latest"
    fi
    
    log_info "Build complete ✓"
}

# Push images
push_images() {
    log_step "Pushing images to Docker Hub..."
    
    log_info "Pushing jrustyhaner/towncrier-server:$VERSION..."
    docker push jrustyhaner/towncrier-server:$VERSION
    
    if [ "$PUSH_LATEST" != "--no-latest" ]; then
        log_info "Pushing jrustyhaner/towncrier-server:latest..."
        docker push jrustyhaner/towncrier-server:latest
    fi
    
    log_info "Pushing jrustyhaner/towncrier-frontend:$VERSION..."
    docker push jrustyhaner/towncrier-frontend:$VERSION
    
    if [ "$PUSH_LATEST" != "--no-latest" ]; then
        log_info "Pushing jrustyhaner/towncrier-frontend:latest..."
        docker push jrustyhaner/towncrier-frontend:latest
    fi
    
    log_info "Push complete ✓"
}

# Show summary
summary() {
    echo ""
    log_step "Deployment Summary"
    echo "=================="
    echo ""
    echo "Backend:"
    echo "  Image: jrustyhaner/towncrier-server:$VERSION"
    if [ "$PUSH_LATEST" != "--no-latest" ]; then
        echo "  Also tagged as: latest"
    fi
    echo ""
    echo "Frontend:"
    echo "  Image: jrustyhaner/towncrier-frontend:$VERSION"
    if [ "$PUSH_LATEST" != "--no-latest" ]; then
        echo "  Also tagged as: latest"
    fi
    echo ""
    echo "Pull commands:"
    echo "  Backend:  docker pull jrustyhaner/towncrier-server:$VERSION"
    echo "  Frontend: docker pull jrustyhaner/towncrier-frontend:$VERSION"
    echo ""
    echo "Run on production:"
    echo "  docker compose -f docker-compose.prod.yml up -d"
    echo ""
}

# Main
main() {
    log_info "Town Crier Docker Hub Build & Push"
    echo "===================================="
    echo ""
    
    check_docker
    check_docker_login
    
    build_images
    push_images
    
    summary
    
    log_info "Done! ✓"
}

main
