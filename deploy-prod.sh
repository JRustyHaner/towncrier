#!/bin/bash
# Production deployment script for Town Crier
# Usage: ./deploy-prod.sh [init|up|down|logs|update]

set -e

COMMAND=${1:-up}
ENV_FILE=".env.prod"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Check if .env.prod exists
check_env() {
    if [ ! -f "$ENV_FILE" ]; then
        log_error ".env.prod not found!"
        log_info "Copy .env.prod.example to .env.prod and fill in your credentials"
        exit 1
    fi
}

# Initialize production environment
init() {
    log_info "Initializing production environment..."
    
    check_env
    
    # Create directories
    mkdir -p certbot/conf certbot/www
    log_info "Created certificate directories"
    
    # Check if certificate already exists
    if [ -d "certbot/conf/live/towncrier.rustyhaner.com" ]; then
        log_warn "SSL certificate already exists"
    else
        log_info "Getting SSL certificate from Let's Encrypt..."
        log_warn "Make sure port 80 is accessible for ACME challenge"
        
        docker run --rm \
          -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
          -v "$(pwd)/certbot/www:/var/www/certbot" \
          -p 80:80 \
          certbot/certbot certonly --standalone \
          -d towncrier.rustyhaner.com \
          -d www.towncrier.rustyhaner.com \
          --email rusty@rustyhaner.com \
          --agree-tos \
          --no-eff-email \
          --staging
        
        log_info "SSL certificate obtained!"
    fi
    
    log_info "Production environment initialized ✓"
}

# Start services
up() {
    check_env
    log_info "Starting production services..."
    docker compose -f docker-compose.prod.yml up -d
    log_info "Services started ✓"
    
    sleep 2
    log_info "Service status:"
    docker compose -f docker-compose.prod.yml ps
    
    log_info "Frontend: https://towncrier.rustyhaner.com"
    log_info "API: https://towncrier.rustyhaner.com/api/health"
}

# Stop services
down() {
    log_info "Stopping production services..."
    docker compose -f docker-compose.prod.yml down
    log_info "Services stopped ✓"
}

# Show logs
logs() {
    SERVICE=${2:-all}
    if [ "$SERVICE" == "all" ]; then
        docker compose -f docker-compose.prod.yml logs -f
    else
        docker compose -f docker-compose.prod.yml logs -f $SERVICE
    fi
}

# Update and redeploy
update() {
    log_info "Updating Town Crier..."
    
    log_info "Pulling latest code..."
    git pull origin main
    
    check_env
    
    log_info "Rebuilding and restarting services..."
    docker compose -f docker-compose.prod.yml up -d --build
    
    log_info "Cleaning up old images..."
    docker image prune -f
    
    log_info "Update complete ✓"
    log_info "Frontend: https://towncrier.rustyhaner.com"
}

# Health check
health() {
    log_info "Checking service health..."
    docker compose -f docker-compose.prod.yml ps
    
    log_info "Testing API..."
    curl -s https://towncrier.rustyhaner.com/api/health | jq .
}

# Show usage
usage() {
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  init      - Initialize production environment (get SSL certs)"
    echo "  up        - Start production services"
    echo "  down      - Stop production services"
    echo "  logs      - Show service logs (optional: [server|frontend|nginx])"
    echo "  update    - Update code and redeploy"
    echo "  health    - Check service health"
    echo "  help      - Show this help message"
}

case $COMMAND in
    init)
        init
        ;;
    up)
        up
        ;;
    down)
        down
        ;;
    logs)
        logs $2
        ;;
    update)
        update
        ;;
    health)
        health
        ;;
    help)
        usage
        ;;
    *)
        log_error "Unknown command: $COMMAND"
        usage
        exit 1
        ;;
esac
