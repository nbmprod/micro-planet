# Agent Brief: Re-platform "micro-planet" onto PlayCanvas

## Who this is for

You're a coding agent picking up work on `micro-planet`, a browser multiplayer game currently built as a small Three.js prototype. The project owner, Nikita, is the game **designer**, not an engineer — the entire point of this migration is to get him a visual editor where he can place objects, tune scenes, and iterate on content himself, instead of needing code changes (or an AI agent) for every small change. Keep that goal in view for every decision: if a task can be done by exposing a value/slot in the PlayCanvas Editor instead of hardcoding it, do that.

The game concept: a persistent multiplayer sandbox blending **Animal Crossing + Minecraft + Stardew Valley**, with a cozy, low-poly **SEGA/Nintendo-circa-2000s** visual and game-feel vibe (think Animal Crossing GameCube, Chibi-Robo, early Katamari — bright, chunky, no-failure-state, charming over realistic).

## What exists today (read before touching anything)

Repo root: this directory. Current stack is vanilla TypeScript + Three.js + Vite, ~2,000 lines, single relay server (`server/relay.js`) that just rebroadcasts player positions with no persistence, no accounts, and no server-side game logic. Full breakdown of what's there and why it doesn't scale is in the project's saved architecture notes — read `src/config/GameConfig.ts`, `src/core/GameEngine.ts`, `src/entities/Player.ts`, and `src/world/Planet.ts` first. Two things worth preserving conceptually even though the implementation won't survive the port:

- **The spherical movement feel.** Players walk on a small planet (radius 10 in current units) using great-circle rotation instead of flat-world physics — `Player.ts`'s `_handleMovement()` and `_orientGroup()` show the quaternion math. This "walking on a tiny globe" feel is a core part of the game's identity and should be reproduced in PlayCanvas, not dropped for a flat world.
- **The current visual tuning.** `GameConfig.ts` has real, already-tuned values worth carrying over as starting points: planet radius/segments, land/water colors (`0x2d7d3a` land, `0x1a5fa8` water), lighting setup (sun + backlight + hemisphere light, tuned for a bright Animal-Crossing-like look), player colors palette, and the existing FBX character models in `public/models/` (`CoolCow.fbx`, `penguin.fbx`).

Do not try to line-by-line port the TypeScript classes — this is a re-platform, not a lift-and-shift. Treat `GameConfig.ts`'s values as reference data, not code to carry forward.

## Target architecture

**Client / scene editing: PlayCanvas Editor (hosted, playcanvas.com).** As of this writing PlayCanvas's Free plan includes unlimited *private* projects (not just public), so there's no cost blocker to starting immediately — confirm current plan details at [playcanvas.com/plans](https://playcanvas.com/plans) before assuming, since pricing pages change. This is the actual designer-facing deliverable: Nikita will place entities, assign materials/lighting, and arrange scenes visually in this browser Editor once it's set up.

**Scripting workflow: local files + `playcanvas-sync`.** Do not write PlayCanvas scripts by hand inside the browser Editor's text boxes. Use [playcanvas/playcanvas-sync](https://github.com/playcanvas/playcanvas-sync) (official tool) to two-way-sync a local `scripts/` folder with the PlayCanvas project in real time, so you (the agent) can read/write script files normally in this repo with git history, and changes show up live in the Editor for Nikita to attach to entities and test. This is the mechanism that makes the "agent writes code, designer works visually" split actually work day to day.

**Multiplayer server: Colyseus (Node.js), not the current relay.** Colyseus is the standard, actively-documented pairing for PlayCanvas multiplayer — see [PlayCanvas's own Colyseus tutorial](https://developer.playcanvas.com/tutorials/real-time-multiplayer-colyseus/) and [Colyseus's PlayCanvas guide](https://docs.colyseus.io/tutorial/playcanvas). Unlike the current relay, Colyseus is **server-authoritative**: the server owns a `Schema`-defined room state (player positions, world objects, inventory, etc.), validates and applies changes, and pushes diffs to clients — this is what makes persistence, anti-cheat, and shared world state possible at all. Also evaluate [meta-space-org/playnetwork](https://github.com/meta-space-org/playnetwork) (runs the actual PlayCanvas engine headless on the server for authoritative simulation) as an alternative if Colyseus's plain-schema approach turns out to be too low-level for the amount of physics/collision logic this game needs — flag this as a decision point rather than silently picking one.

**Persistence: a real database**, sitting behind the Colyseus server — Postgres (e.g. via Supabase, which also gives you auth for free) is a reasonable default for accounts, inventory, and world/building state, but treat this as an open decision (see below), not a mandate.

**Hosting:** PlayCanvas's own hosting can serve the static client build. The Colyseus server needs a persistent Node process (Railway, which the current relay already deploys to, or Fly.io/Render are all fine — reuse Railway if it keeps things simple, since the account is already set up there).

## Phased task breakdown

Work in phases and stop for a checkpoint with Nikita after each one — don't run straight through to a full rewrite unsupervised, since scene/art decisions in later phases depend on how the earlier ones land.

**Phase 0 — Project setup.** Create the PlayCanvas project (private, under Nikita's account), set up `playcanvas-sync` against a `scripts/` folder in this repo, confirm the local↔cloud round trip works with a trivial script before building anything real. Set up the Colyseus server as a separate service (likely a new folder in this repo or a sibling repo — your call, but document the choice) with a bare-bones room that just proves connect/join/leave works end to end from a PlayCanvas client.

**Phase 1 — Core movement port.** Rebuild the spherical-planet walking (great-circle movement, quaternion surface orientation, chase camera, land/water detection) as PlayCanvas entities/scripts, using `GameConfig.ts`'s tuned values as a starting point. Get a single player walking on a small planet in the PlayCanvas Editor, controllable, camera following correctly, before adding anything else. This is the riskiest phase technically — the quaternion math doesn't change, but how it's wired into PlayCanvas's entity/component/script lifecycle does.

**Phase 2 — Authoritative multiplayer.** Wire the Colyseus room to own player position state; PlayCanvas clients send input/intent, not raw positions, and render server-confirmed state (with client-side prediction/interpolation for remote players — this is standard Colyseus+PlayCanvas territory, follow the official tutorial's pattern rather than reinventing it). Multiple browser tabs should be able to see each other move smoothly.

**Phase 3 — Persistence & accounts.** Stand up the database, add minimal auth (even anonymous/device-based to start is fine), and make at least one thing persist across sessions — player position/appearance is a reasonable first target — to prove the save/load path works before building actual game systems on top of it.

**Phase 4 — Designer content pipeline.** This is the phase that actually delivers on the "Nikita works without code" goal. Expose decoration/prop placement, spawn zones, and basic entity properties as things settable in the PlayCanvas Editor UI (via script Attributes, PlayCanvas's mechanism for exposing typed, editor-visible fields on a script) rather than hardcoded arrays. Confirm Nikita can, unassisted, place a new tree or rock in a scene and have it show up with a working collider.

**Phase 5 — First real gameplay system.** Once the above is solid, pick one game system (building placement is probably the most central to the Animal Crossing/Minecraft blend) and implement it end to end — client interaction → server validation/persistence → visual result — as the template other systems (crafting, farming, etc.) will follow.

## Constraints and non-goals for this pass

Don't attempt to build crafting, farming, or a full economy in this migration — the goal is a working, server-authoritative, designer-editable foundation with one proof-of-concept gameplay system (Phase 5), not the whole game. Don't discard the existing FBX models or hand-tuned visual values without a reason — reuse what already looks right. Don't pick a database or hosting provider silently if there's a meaningfully cheaper/simpler option for a solo indie project — surface the tradeoff and let Nikita decide.

## Decisions to surface, not make silently

Flag these back to Nikita rather than choosing unilaterally: Colyseus vs. `playnetwork` for the authoritative server; which database/auth provider; whether the Colyseus server and the PlayCanvas static client deploy from one repo or two; and whether to self-host the (now open-source) [PlayCanvas Editor](https://github.com/playcanvas/editor) at any point versus staying on the hosted playcanvas.com version — hosted is almost certainly right to start, but worth naming as a choice rather than an assumption.

## Definition of done for this engagement

A PlayCanvas project exists that Nikita can open in his browser, see a small planet with a walking character reproducing the current game's movement feel, connect from two browser tabs and see both players move with server-authoritative sync via Colyseus, have at least one piece of state persist across a page reload, and place at least one new decoration entity in the Editor himself without writing or asking for code.
