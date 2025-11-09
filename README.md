# Towncrier

MVP scaffold: Express backend (stateless) + Expo React Native frontend. No accounts. No persistent storage.

## Structure
- server/ — Express + TypeScript API
- frontend/ — Expo React Native app
- docs/ — Ideation and specs

## Quick Start

### Option 1: Docker Compose (Recommended)

```bash
./start-docker.sh
```

This builds and starts both backend (port 3000) and frontend (port 8081) in containers. The frontend uses Expo tunnel mode for device access.

### Option 2: Distrobox

For users with distrobox installed:

```bash
./start-distrobox.sh
```

Or manually:

```bash
# Create container once
sudo distrobox-create -n towncrier-dev -i docker.io/library/node:20

# Backend (terminal 1)
sudo distrobox-enter towncrier-dev -- bash -lc 'cd ./server && npm install && npm run dev'

# Frontend (terminal 2)
sudo distrobox-enter towncrier-dev -- bash -lc 'cd ./frontend && npm install expo react react-native && npm start'
```

Adjust paths if workspace isn't mounted at root.

## Notes
- Stateless constraint is enforced: the API keeps only in-memory data for the active run.
- Backend runs on port 3000; frontend on 8081 (or Expo tunnel).
- Update backend URL in `frontend/App.tsx` if needed (Docker uses `http://server:3000`).
