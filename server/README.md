# Towncrier Server (Express + TypeScript)

Stateless API scaffold. No persistence or external caches.

## Endpoints
- GET /api/health -> { ok: true }
- GET /api/legend -> status colors
- POST /api/search -> starts a transient search (stubbed)
- GET /api/search/:id/results -> returns empty GeoJSON (stub)

## Develop with distrobox

1) Create a Node container (one-time):

```bash
# choose your image; Node 20 recommended
sudo distrobox-create -n node20 -i docker.io/library/node:20
```

2) Enter the container and install dependencies:

```bash
sudo distrobox-enter node20 -- bash -lc '
  cd /workdir/towncrier/server && npm install && npm run dev
'
```

Notes:
- VS Code should mount your workspace into the container at /workdir (adjust path if different).
- Alternatively set the working directory by passing `-w` or using `--home` bind options.

## Scripts
- npm run dev: start via ts-node (dev)
- npm run build: compile to dist
- npm start: run compiled JS
