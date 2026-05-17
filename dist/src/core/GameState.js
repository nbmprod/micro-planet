import * as THREE from 'three';
/**
 * GameState — single source of truth for all runtime game data.
 *
 * Design intent:
 *  - Plain data object (no Three.js scene references) so it can be
 *    serialised, snapshotted, or sent over a network in the future.
 *  - All mutable fields are public so any subsystem can read/write them;
 *    reactive listeners can be added later without changing the interface.
 *
 * FUTURE_HOOK: Replace primitive fields with Observable<T> wrappers
 *              (e.g. RxJS BehaviorSubject) to drive UI reactivity.
 * FUTURE_HOOK: Add `pollutionLevel: number` (0–1) for environmental gameplay.
 * FUTURE_HOOK: Add `oxygenLevel: number`, `biome: string`, `score: number`.
 */
export class GameState {
    // ── Player surface position ─────────────────────────────
    /** Unit vector from planet centre to player's feet on the surface. */
    surfaceNormal = new THREE.Vector3(0, 1, 0);
    /**
     * Player's facing direction — always tangent to the sphere surface
     * (i.e., perpendicular to surfaceNormal).
     */
    forward = new THREE.Vector3(0, 0, -1);
    // ── Vertical (radial) physics ───────────────────────────
    /** Distance above the planet surface in world units. 0 = standing. */
    altitude = 0;
    /** Radial velocity component (positive = moving away from planet). */
    radialVelocity = 0;
    /** True when the player is resting on the ground. */
    grounded = true;
    // ── Derived HUD metrics (recomputed each frame) ─────────
    /** Latitude in degrees derived from surfaceNormal.y. */
    latitudeDeg = 0;
    /** Longitude in degrees derived from surfaceNormal.x/z. */
    longitudeDeg = 0;
}
//# sourceMappingURL=GameState.js.map