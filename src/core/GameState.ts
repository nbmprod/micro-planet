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
    surfaceNormal: THREE.Vector3 = new THREE.Vector3(0, 1, 0);

    /**
     * Player's facing direction — always tangent to the sphere surface
     * (i.e., perpendicular to surfaceNormal).
     */
    forward: THREE.Vector3 = new THREE.Vector3(0, 0, -1);

    // ── Vertical (radial) physics ───────────────────────────
    /** Distance above the planet surface in world units. 0 = standing. */
    altitude: number = 0;

    /** Radial velocity component (positive = moving away from planet). */
    radialVelocity: number = 0;

    /** True when the player is resting on the ground. */
    grounded: boolean = true;

    /** True when the player is swimming instead of walking. */
    isSwimming: boolean = false;

    // ── Identity (multiplayer) ──────────────────────────────
    /** Assigned player id from server (or client-generated). */
    playerId: string | null = null;

    /** Assigned player colour (hex) for rendering remote and local players. */
    playerColor: number | null = null;

    // ── Derived HUD metrics (recomputed each frame) ─────────
    /** Latitude in degrees derived from surfaceNormal.y. */
    latitudeDeg: number = 0;

    /** Longitude in degrees derived from surfaceNormal.x/z. */
    longitudeDeg: number = 0;

    // FUTURE_HOOK: Environmental metrics ─────────────────────
    // pollutionLevel: number = 0;   // 0 = pristine, 1 = uninhabitable
    // oxygenLevel:   number = 1.0;  // 0 = suffocating, 1 = breathable
    // biome: string = 'grassland';  // drives background colour tint
}
