# Towncrier Frontend (Expo React Native)

Prototype React Native client talking to local Express backend.

## Requirements
- Node 20 inside distrobox container
- Expo CLI (installed automatically via `npx expo`)

## Distrobox Workflow
```bash
sudo distrobox-create -n node20 -i docker.io/library/node:20
sudo distrobox-enter node20 -- bash -lc 'cd /workdir/towncrier/frontend && npm install expo react react-native && npm start'
```

Adjust `/workdir` path if your host mount differs. Backend must run separately on host or in another container exposing port 3000.

## Scripts
- npm start: launch Expo dev tools
- npm run web: start web target

## Notes
- Stateless: no persisted data; searches recompute.
- Replace `localhost` with container IP if running backend inside container.
