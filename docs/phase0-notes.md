# Phase 0 notes — decisions made, and what's still open

Companion to [playcanvas-migration-agent-brief.md](playcanvas-migration-agent-brief.md).
Records what got decided during Phase 0 scaffolding and why, plus what's still
blocked on Nikita.

## Decisions made this pass

**Repo structure: one repo, new subfolder (`server/colyseus/`).** The brief left
this as "your call, but document the choice." Went with monorepo + subfolder
because the existing relay server already lives at `server/relay.js` in this repo
and Railway already deploys from it — a second folder with its own
`package.json`/`railway.json` (see [server/colyseus/README.md](../server/colyseus/README.md))
lets Railway run it as an independent service via "Root Directory" without
needing a second GitHub repo. Two repos would only help if client and server
needed fully separate CI/release cadences, which isn't the case yet.

**Colyseus, not playnetwork — not revisited yet.** The brief already names
Colyseus as the default and says only to evaluate `playnetwork` if Colyseus's
plain-schema approach proves too low-level once real physics/collision logic
(Phase 2+) is in play. Phase 0's bare-bones room doesn't have enough game logic
to judge that either way, so this is still open — flagging it again once Phase 2
(authoritative movement) is underway, not deciding it now.

## New constraint discovered: Node version

Colyseus 0.18 (current version as of this scaffolding) requires **Node >= 22** —
it imports `node:inspector/promises`, which doesn't exist before Node 19. This
machine's system Node is 18.19.1. `playcanvas-sync` separately requires Node >=
20. Neither constraint touches the root Vite/Three.js project, which is fine on
Node 18.

Handled for this session by downloading a standalone Node 22 binary into the
scratchpad rather than touching the system Node install. That's not a durable
fix — whoever runs `server/colyseus` or `pcsync` locally going forward needs
Node >= 22 available (nvm, fnm, or a system upgrade). Railway will need
`engines.node` respected or an explicit Node 22 buildpack setting; the
`server/colyseus/package.json` `engines` field is set to `>=22` already, which
Railway's Railpack builder should pick up automatically — worth confirming on
first deploy rather than assuming.

## What's proven so far

- `server/colyseus`: bare `MicroPlanetRoom` builds, runs, and a local Node test
  client (`npm run test-client`) confirms connect → join → state sync → leave
  end-to-end at the server level. See [server/colyseus/README.md](../server/colyseus/README.md).
- `playcanvas-sync` round trip: pulled the existing project
  ([playcanvas.com/project/1590326](https://playcanvas.com/project/1590326/overview/planet))
  into `scripts/`, pushed `scripts/scripts/hello-world.mjs` back up, and confirmed
  via the PlayCanvas assets API that it landed remotely (asset id `304285417`).
  `npm run sync:pull` now reports "No differences found between local and
  remote." Full setup/gotchas documented in [scripts/README.md](../scripts/README.md) —
  the short version is `.pcconfig` (not `pcconfig.json`) has to live *inside*
  `scripts/`, and `pcsync` has to be run with `scripts/` as cwd.

## New project fact worth flagging

The project Nikita created ([playcanvas.com/project/1590326](https://playcanvas.com/project/1590326/overview/planet))
is currently **public**, not private as the brief called for, and started from
PlayCanvas's "rolling ball" starter template rather than a blank project — it
already has template assets (`movement.js`, `follow-camera.js`, `teleporter.js`,
a font, materials, a physics/model demo scene) using the **legacy**
`pc.createScript(...)` API, not the newer ESM `Script` class. Not a blocker, but
Phase 1 should confirm which script format the project is actually configured
for before writing real gameplay scripts, and Nikita may want to flip the
project to private and/or clear out template content he doesn't want to keep.

## Still open

Not yet proven: the sync round trip visually confirmed *inside the Editor UI* by
Nikita (only confirmed via the API so far) — worth him just opening the project
and checking `hello-world.mjs` shows up under Code. Everything else in Phase 0's
definition of done is now in place; ready to move to Phase 1 (spherical movement
port) once Nikita confirms.
