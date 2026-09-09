# Phase 1 — Editor setup checklist

Companion to [playcanvas-migration-agent-brief.md](playcanvas-migration-agent-brief.md).
Three scripts are written and ready to push to
[playcanvas.com/project/1590693](https://playcanvas.com/project/1590693/overview/planet_1)
(`planet_1`): `planet.mjs`, `player-controller.mjs`, `chase-camera.mjs` (all under
[scripts/scripts/](../scripts/scripts/)). Entity/scene composition can't be done
by me headlessly (see [phase0-notes.md](phase0-notes.md) — it lives in
PlayCanvas's realtime collaborative editor, not the REST API), so this is the
one-time setup to do by hand in the Editor.

## 0. One-time unlock

`pcsync` refuses to push until it can confirm which branch you currently have
open *in the Editor itself* — a per-project preference that only gets set once
you've actually opened the project there. Just visiting the overview page
doesn't set it. **Open [the project](https://playcanvas.com/project/1590693/overview/planet_1)
and click "EDITOR"** once, then let me know — I'll push the scripts right after.

## 1. Create three entities (exact names matter — scripts find each other by name)

All three are **empty entities** positioned at the world origin `(0, 0, 0)` —
the scripts set their real transforms at runtime, so where you place them in
the Editor at rest doesn't matter, only the name and which script is attached.

| Entity name | Add Component | Attach script |
|---|---|---|
| `Planet` | — | `planet` |
| `Player` | — | `playerController` |
| `Camera` | `camera` | `chaseCamera` |

To attach a script: select the entity → **Add Component → Script** → in the
Script component's inspector, click **+** and pick the script by its
`scriptName` (`planet`, `playerController`, `chaseCamera` — these are the
ESM `static scriptName` values, not the filenames).

Also add a **Directional Light** if the scene doesn't already have one (New
Entity → Light → Directional) — the placeholder player model and planet
spheres are lit with `StandardMaterial`, which needs a light source to look
like anything but black.

## 2. Attribute wiring (optional — everything has a name-based fallback)

Each script tries `findByName` first, so this step is optional, but dragging
the real references in avoids relying on exact-name matching:

- `Player`'s `playerController` script → drag `Planet` into the **Planet**
  attribute slot, drag `Camera` into **Camera Entity**.
- `Camera`'s `chaseCamera` script → drag `Player` into the **Target** attribute.

Everything else (radius, colors, move speed, gravity, jump strength, camera
distance/height/lag) is exposed as an attribute with the ported-from-GameConfig
default already filled in — tune freely, no code changes needed.

## 3. Test

Click **Launch** (▶) in the Editor toolbar. WASD/arrow keys to walk, Space to
jump. You should see a small green-ish planet with a boxy placeholder
character (colored box body + tan head) walking on its surface, camera
chasing from behind, staying upright even on the far side of the sphere.

## What to expect it to look like (and what it won't yet)

- Planet is three solid-colored nested spheres (opaque terrain, translucent
  ocean, translucent atmosphere glow) — no painted continents yet, movement
  still correctly gates on land vs. water using the same zone math the
  Three.js prototype used as its fallback (see `planet.mjs`).
- Player is the boxy placeholder (no FBX model yet — that's a follow-up, not
  blocking Phase 1's "prove the movement feel" goal).
- No collision with other players/decorations yet (none exist in the scene
  yet) — that's Phase 2+ territory.

## If something's off

The riskiest part of this port — the great-circle movement quaternion math —
was stress-tested numerically outside the Editor (25 trials × 3000 simulated
steps with the actual `playcanvas` engine's Vec3/Quat classes, checking that
`surfaceNormal` stays unit length, `forward` stays orthogonal to it, and
position stays exactly on the sphere). If movement looks wrong in the Editor,
it's more likely an entity/attribute wiring issue (wrong name, script not
attached) than the underlying math — check the browser console for script
errors first.
