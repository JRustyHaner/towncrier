# Production Deployment Guide for Town Crier

## Prerequisites

- Docker and Docker Compose installed
- Domain: `towncrier.rustyhaner.com`
- Server with at least 2GB RAM, 10GB storage
- SSH access to your server

## Setup Instructions

### 1. Environment Setup

Create a `.env.prod` file with your production credentials:

```bash
NEWSDATA_API_KEY=your_newsdata_api_key_here
DATAFORSEO_API_KEY=your_dataforseo_api_key_here
DATAFORSEO_API_SECRET=your_dataforseo_api_secret_here
```

Load environment variables:
```bash
export $(cat .env.prod | xargs)
```

### 2. SSL Certificate Setup

Before first deployment, get SSL certificates from Let's Encrypt:

```bash
# Create directories
mkdir -p certbot/conf certbot/www

# Get initial certificate
docker run --rm \
  -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
  -v "$(pwd)/certbot/www:/var/www/certbot" \
  certbot/certbot certonly --webroot \
  -w /var/www/certbot \
  -d towncrier.rustyhaner.com \
  -d www.towncrier.rustyhaner.com \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email
```

### 3. Initial Deployment

```bash
# Build and start services
docker compose -f docker-compose.prod.yml up -d

# Check status
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs -f
```

### 4. Verify Deployment

- Frontend: https://towncrier.rustyhaner.com
- API Health: https://towncrier.rustyhaner.com/api/health

### 5. Database & Data Persistence

If you need to persist data:

```bash
# In docker-compose.prod.yml, add volumes:
volumes:
  server-data:
  
# Then mount in server service:
volumes:
  - server-data:/app/data
```

### 6. Monitoring

View logs:
```bash
docker compose -f docker-compose.prod.yml logs -f server
docker compose -f docker-compose.prod.yml logs -f frontend
docker compose -f docker-compose.prod.yml logs -f nginx
```

Check container health:
```bash
docker compose -f docker-compose.prod.yml ps
```

### 7. Updates & Redeployment

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker compose -f docker-compose.prod.yml up -d --build

# Clean up old images
docker image prune -f
```

### 8. Scaling Tips

- Increase worker processes in `nginx.conf` if needed
- Add multiple backend instances behind load balancer
- Use environment variables for configuration

### 9. Backup & Restore

```bash
# Backup volumes
docker run --rm \
  -v towncrier_server-data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/data-backup-$(date +%s).tar.gz -C /data .

# Restore
docker run --rm \
  -v towncrier_server-data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar xzf /backup/data-backup-TIMESTAMP.tar.gz -C /data
```

### 10. Security Checklist

- [ ] SSL certificate configured and auto-renewing
- [ ] Environment variables secure and not in version control
- [ ] Firewall rules configured (allow only 80, 443)
- [ ] CORS configured appropriately
- [ ] Rate limiting enabled in Nginx
- [ ] Security headers set (see nginx.conf)
- [ ] Regular backups scheduled
- [ ] Monitor disk usage and clean old images periodically

## Troubleshooting

### Certificate renewal issues
```bash
docker compose -f docker-compose.prod.yml logs certbot
```

### Port conflicts
```bash
# Check what's using ports 80, 443
sudo netstat -tlnp | grep ':80\|:443'
```

### API connection issues
```bash
# Test backend from frontend container
docker compose -f docker-compose.prod.yml exec frontend wget -O- http://server:3001/api/health
```

### High memory usage
```bash
# Check container stats
docker stats
```
