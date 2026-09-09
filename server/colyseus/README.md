# micro-planet Colyseus server

Server-authoritative multiplayer room for micro-planet. Replaces `server/relay.js`
(dumb WebSocket rebroadcaster) — see [docs/playcanvas-migration-agent-brief.md](../../docs/playcanvas-migration-agent-brief.md)
for why.

Requires **Node >= 22** (Colyseus 0.18 uses `node:inspector/promises`, unavailable on
Node 18/20). If your local `node -v` is older, install a Node 22 build separately —
this subproject doesn't affect the root project's Node version requirements.

## Local dev

```bash
cd server/colyseus
npm install
npm run dev
```

Starts the room server on `ws://localhost:2567`. Room name: `micro_planet`.

## Smoke test (no PlayCanvas client needed)

With `npm run dev` running in one terminal:

```bash
npm run test-client
```

Connects, joins `micro_planet`, waits for a state sync, then leaves — proves the
connect/join/leave round trip without needing the PlayCanvas project set up yet.

## Production build

```bash
npm run build   # tsc -> dist/
npm start        # node dist/main.js
```

## Status

Phase 0 only: bare presence tracking (`MicroPlanetState.players`, just a join
timestamp), no game logic. Phase 2 replaces this with the real authoritative
movement state (surfaceNormal/forward/altitude — see `src/core/GameState.ts` in
the client) and wires input validation.

## Deploying (Railway)

This folder is set up as an independent service (own `package.json`, own
`railway.json`) so it can deploy separately from the static PlayCanvas client and
from the legacy relay. To deploy:

1. In the Railway project, add a new service from this same GitHub repo.
2. Set the service's **Root Directory** to `server/colyseus`.
3. Railway will pick up `server/colyseus/railway.json` automatically.

Not yet done — this is a manual step for whoever owns the Railway account.
