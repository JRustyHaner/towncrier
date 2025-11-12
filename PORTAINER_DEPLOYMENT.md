# Town Crier - Portainer + Nginx Proxy Manager Deployment Guide

## Your Setup

- **Portainer**: Container management UI
- **Nginx Proxy Manager**: Reverse proxy on `nginx_default` network
- **Town Crier**: Frontend + Backend services

## Quick Deployment Steps

### 1. In Portainer - Add Stack

Go to **Portainer → Stacks → Add Stack** and paste this:

```yaml
version: '3.8'

services:
  server:
    image: jrustyhaner/towncrier-server:latest
    restart: always
    expose:
      - 3001
    environment:
      - NODE_ENV=production
      - PORT=3001
      - NEWSDATA_API_KEY=${NEWSDATA_API_KEY}
      - DATAFORSEO_API_KEY=${DATAFORSEO_API_KEY}
      - DATAFORSEO_API_SECRET=${DATAFORSEO_API_SECRET}
    networks:
      - nginx_default
    healthcheck:ersion: '3.8'

services:
  server:
    image: jrustyhaner/towncrier-server:latest
    restart: always
    expose:
      - 3001
    environment:
      - NODE_ENV=production
      - PORT=3001
      - NEWSDATA_API_KEY=${NEWSDATA_API_KEY}
      - DATAFORSEO_API_KEY=${DATAFORSEO_API_KEY}
      - DATAFORSEO_API_SECRET=${DATAFORSEO_API_SECRET}
    networks:
      - nginx_default
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3001/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  frontend:
    image: jrustyhaner/towncrier-frontend:latest
    restart: always
    expose:
      - 8081
    environment:
      - EXPO_PUBLIC_API_URL=http://server:3001
      - NODE_ENV=production
    networks:
      - nginx_default
    depends_on:
      server:
        condition: service_healthy

networks:
  nginx_default:
    external: true
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3001/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  frontend:
    image: jrustyhaner/towncrier-frontend:latest
    restart: always
    expose:
      - 8081
    environment:
      - EXPO_PUBLIC_API_URL=http://server:3001
      - NODE_ENV=production
    networks:
      - nginx_default
    depends_on:
      server:
        condition: service_healthy

networks:
  nginx_default:
    external: true
```

### 2. Set Environment Variables in Portainer

In the stack, set these as environment variables:

```
NEWSDATA_API_KEY=your_newsdata_api_key_here
DATAFORSEO_API_KEY=your_dataforseo_api_key_here
DATAFORSEO_API_SECRET=your_dataforseo_api_secret_here
```

### 3. Deploy

Click **Deploy the stack** and wait for both services to start (green status).

### 4. In Nginx Proxy Manager

#### For Frontend (Web UI)

1. Go to **Proxy Hosts → Add Proxy Host**
2. **Domain Names**: `towncrier.rustyhaner.com` (and `www.towncrier.rustyhaner.com`)
3. **Scheme**: `http`
4. **Forward Hostname/IP**: `frontend` (or the container IP if not on same network)
5. **Forward Port**: `8081`
6. **Cache Assets**: ✓ (optional)
7. **Block Common Exploits**: ✓
8. **Websockets Support**: ✓
9. **SSL Certificate**: Request a new SSL certificate (Let's Encrypt)
10. Save

#### For Backend API (Optional - if you want direct API access)

1. Go to **Proxy Hosts → Add Proxy Host**
2. **Domain Names**: `api.towncrier.rustyhaner.com`
3. **Scheme**: `http`
4. **Forward Hostname/IP**: `server`
5. **Forward Port**: `3001`
6. **SSL Certificate**: Request a new SSL certificate (Let's Encrypt)
7. Save

### 5. Verify Deployment

- Frontend: https://towncrier.rustyhaner.com ✓
- Health Check: https://towncrier.rustyhaner.com/api/health ✓ (if frontend proxies to backend)
- Portainer: Check container logs for any errors

## Updating Images

When you push new versions to Docker Hub:

1. In **Portainer → Stacks**, select your Town Crier stack
2. Click **Pull and redeploy** (or manually pull images)
3. Services will restart with new images

## Viewing Logs

In **Portainer**:
- Click on the service container
- Go to **Logs** tab
- View real-time output

## Environment Variables in Portainer

You can also store sensitive data as **Portainer Secrets** instead of stack env vars:

1. Go to **Portainer → Secrets → Create secret**
2. Create: `NEWSDATA_API_KEY`, `DATAFORSEO_API_KEY`, `DATAFORSEO_API_SECRET`
3. Reference in stack as: `${NEWSDATA_API_KEY}`

## Troubleshooting

**Services won't start?**
- Check Portainer logs for errors
- Verify `nginx_default` network exists: `docker network ls`

**Can't reach frontend?**
- Check Nginx Proxy Manager is proxying correctly
- Verify containers can reach each other: `docker exec <container> wget -O- http://frontend:8081`

**SSL certificate issues?**
- Let Nginx Proxy Manager auto-renew (it does automatically)
- Check Nginx PM logs for renewal status

**API calls failing?**
- Frontend needs internal URL: `http://server:3001` ✓
- Backend should NOT be exposed to frontend as `https://api.towncrier.rustyhaner.com`

## Network Diagram

```
User Browser
    ↓
https://towncrier.rustyhaner.com
    ↓
Nginx Proxy Manager (nginx_default network)
    ↓
Frontend Container (port 8081)
    ↓
Backend Container (port 3001)
    ↓
APIs (NewsData, DataForSEO, etc.)
```

## Notes

- Frontend and backend communicate internally over `nginx_default` network
- Only Nginx Proxy Manager listens on ports 80/443
- All services auto-restart on failure
- Health checks ensure backend is running before frontend starts

You're all set! 🎉
