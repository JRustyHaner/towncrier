# Town Crier - Production Deployment Summary

## What's Included

I've created a complete production deployment setup for **towncrier.rustyhaner.com**:

### Files Created

1. **`docker-compose.prod.yml`** - Production Docker Compose configuration
   - Multi-stage builds for smaller images
   - Health checks
   - Auto-restart policies
   - Internal networking
   - SSL/TLS support with Let's Encrypt

2. **`server/Dockerfile.prod`** - Production server Dockerfile
   - Multi-stage build (smaller final image)
   - Only production dependencies
   - Optimized for performance
   - Chromium pre-installed for scraping

3. **`frontend/Dockerfile.prod`** - Production frontend Dockerfile
   - Static export with `expo export --platform web`
   - Lightweight `serve` runtime
   - Optimized bundle

4. **`nginx.conf`** - Nginx reverse proxy configuration
   - HTTPS with HTTP→HTTPS redirect
   - SSL/TLS 1.2+ with strong ciphers
   - Security headers (HSTS, XSS, CSP)
   - Rate limiting (10 req/s for API, 50 for general)
   - CORS support
   - WebSocket support
   - Gzip compression
   - Auto-renewal hook for Let's Encrypt

5. **`deploy-prod.sh`** - Automated deployment script
   - `./deploy-prod.sh init` - Get SSL certificates
   - `./deploy-prod.sh up` - Start services
   - `./deploy-prod.sh down` - Stop services
   - `./deploy-prod.sh logs [service]` - View logs
   - `./deploy-prod.sh update` - Update & redeploy
   - `./deploy-prod.sh health` - Health check

6. **`PRODUCTION_DEPLOYMENT.md`** - Complete deployment guide

7. **`.env.prod.example`** - Environment template (add to git)

## Architecture

```
                    Internet (Port 80/443)
                            ↓
                     Nginx (Reverse Proxy)
                            ↓
                    ┌───────┴───────┐
                    ↓               ↓
              Frontend (8081)   Server (3001)
               Static Files    API Backend
                               + Chromium
                               + Data Analysis
                    
             ↓ (Auto-renewal every 12h)
          Certbot (Let's Encrypt)
```

## Deployment Steps

### 1. First Time Setup

```bash
# Copy environment file
cp .env.prod.example .env.prod
# Edit with your API keys
nano .env.prod

# Initialize (get SSL certificates)
chmod +x deploy-prod.sh
./deploy-prod.sh init
```

### 2. Deploy

```bash
./deploy-prod.sh up

# Verify
./deploy-prod.sh health
```

### 3. Check Status

```bash
# View logs
./deploy-prod.sh logs

# Specific service
./deploy-prod.sh logs server
./deploy-prod.sh logs frontend
./deploy-prod.sh logs nginx
```

## Production Features

✅ **HTTPS/SSL** - Auto-generated and auto-renewed  
✅ **Security Headers** - HSTS, X-Frame-Options, CSP  
✅ **Rate Limiting** - Prevent abuse  
✅ **Compression** - Gzip for faster delivery  
✅ **Health Checks** - Auto-restart on failure  
✅ **Multi-stage Builds** - Smaller Docker images  
✅ **CORS Support** - Cross-origin requests  
✅ **WebSocket Support** - Real-time features  
✅ **Auto-restart** - Survives reboots  
✅ **Logging** - Full request/error logs  

## Performance Optimizations

1. **Frontend**
   - Static export (no runtime compilation)
   - Gzip compression
   - Nginx caching headers

2. **Backend**
   - Production dependencies only
   - Optimized Node.js settings
   - Connection pooling

3. **Network**
   - Internal Docker network (no external ports)
   - Single Nginx entry point
   - Rate limiting

## Monitoring & Maintenance

### Daily
```bash
./deploy-prod.sh health
```

### Weekly
```bash
docker image prune -f  # Clean old images
```

### Monthly
```bash
./deploy-prod.sh update  # Pull latest changes
```

## Troubleshooting

**SSL Certificate not renewing?**
```bash
docker compose -f docker-compose.prod.yml logs certbot
```

**API unreachable?**
```bash
docker compose -f docker-compose.prod.yml exec frontend wget -O- http://server:3001/api/health
```

**High memory usage?**
```bash
docker stats
```

## Security Checklist

- [ ] Updated `.env.prod` with API keys
- [ ] SSL certificate obtained and auto-renewing
- [ ] Firewall allows only 80/443
- [ ] Regular backups configured
- [ ] Logs monitored for errors
- [ ] Rate limiting verified
- [ ] CORS properly configured

## Updating

```bash
git pull origin main
./deploy-prod.sh update
```

This will rebuild Docker images and restart services with zero downtime.

## Next Steps

1. Set DNS `towncrier.rustyhaner.com` to your server IP
2. Copy `.env.prod.example` to `.env.prod` and add API keys
3. Run `./deploy-prod.sh init` to get SSL certificates
4. Run `./deploy-prod.sh up` to start services
5. Verify at https://towncrier.rustyhaner.com

Questions? Check `PRODUCTION_DEPLOYMENT.md` for detailed info!
