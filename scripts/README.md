# PlayCanvas scripts (synced via playcanvas-sync)

This folder mirrors the **entire root asset hierarchy** of the PlayCanvas project
(not just scripts — playcanvas-sync mirrors whatever's at the project root, which
for this project's starter template includes a `scripts/` subfolder, a `font/`
folder, etc.). Don't edit scripts inside the browser Editor's text boxes — edit
the `.js`/`.mjs` files under here, and
[playcanvas-sync](https://github.com/playcanvas/playcanvas-sync) pushes the change
live so it shows up in the Editor.

Live project: [playcanvas.com/project/1590326](https://playcanvas.com/project/1590326/overview/planet)
(project ID `1590326`, master branch `a66db48a-2b5f-4993-bcd0-2704e6cd0df5`).

## One-time setup

1. `npm install` at the repo root (installs `playcanvas-sync` as a devDependency;
   needs Node >= 20 — see the Node-version note in
   [docs/phase0-notes.md](../docs/phase0-notes.md), this repo's root project
   doesn't need Node 20+, only this tool does).
2. Get an API key from your PlayCanvas account page
   ([playcanvas.com/account](https://playcanvas.com/account)).
3. Copy [`.pcconfig.example`](.pcconfig.example) to `.pcconfig` **inside this
   `scripts/` folder** (note the leading dot — that exact filename matters, see
   below) and fill in the real project ID, branch ID, and API key.
   `.pcconfig` is gitignored — it holds a live API key, never commit it.
4. Run pcsync **from inside this folder** (`cd scripts`), not the repo root —
   `PLAYCANVAS_USE_CWD_AS_TARGET` in the config relies on that:
   ```bash
   cd scripts
   npx pcsync pull    # grab whatever's already in the project
   npx pcsync watch   # start live two-way sync
   ```

### Why `.pcconfig` has to be a dotfile inside `scripts/`, not `pcconfig.json` at the repo root

playcanvas-sync resolves its target directory *before* it looks for a
`pcconfig.json` inside that directory — so a `pcconfig.json` sitting outside the
target dir (e.g. at the repo root) never gets found; the tool only ever discovers
`pcconfig.json` once it already knows where the target dir is, which is circular
if that's the only place the target dir is declared. The one config path that
resolves without already knowing the target dir is the **home-directory
lookup** (`~/.pcconfig`), which falls back to checking `<cwd>/.pcconfig` if
`~/.pcconfig` doesn't exist — that fallback is what this setup relies on: put
`.pcconfig` in `scripts/` and always run `pcsync` with `scripts/` as `cwd`.

## Round-trip check (done — 2026-08-29)

`scripts/scripts/hello-world.mjs` is a trivial script used to confirm the sync
loop works end to end: pulled the existing template project down, pushed this
file up, and confirmed via the PlayCanvas assets API that it landed
(asset id `304285417`, type `script`). Safe to delete once you've confirmed it
shows up for you in the Editor too.

**Note:** this project's existing template scripts (`movement.js`,
`follow-camera.js`, `teleporter.js`) use the legacy `pc.createScript(...)` API,
while `hello-world.mjs` uses the newer ESM `class extends Script`. Worth checking
in the Editor which script format this project is actually configured for before
Phase 1 writes real gameplay scripts — don't assume ESM just because it's newer.

## Status

Phase 0 sync loop confirmed working both directions (pull + push). No real
gameplay scripts yet — those start in Phase 1 (spherical movement port, see
[docs/playcanvas-migration-agent-brief.md](../docs/playcanvas-migration-agent-brief.md)).
