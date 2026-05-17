import * as THREE from 'three';
/**
 * Planet — creates and owns the layered planet meshes.
 *
 * Layers (outer to inner):
 *   atmosphere shell (BackSide, transparent, blue glow)
 *   wireframe overlay (subtle green grid for curvature feedback)
 *   terrain sphere    (opaque green land)
 *   ocean sphere      (slightly smaller, semi-transparent blue)
 *
 * FUTURE_HOOK: Replace MeshStandardMaterial with a custom ShaderMaterial
 *              that samples a procedural heightmap or biome texture.
 * FUTURE_HOOK: Drive `terrain.material.color` from GameState.biome at runtime.
 * FUTURE_HOOK: Add a procedural cloud layer (separate slow-rotating sphere).
 */
export const PLANET_RADIUS = 10; // exported so Player/Decorations stay in sync
export class Planet {
    _terrain;
    _ocean;
    _atmosphere;
    _wireframe;
    constructor(scene) {
        // ── Terrain ───────────────────────────────────────────
        this._terrain = new THREE.Mesh(new THREE.SphereGeometry(PLANET_RADIUS, 64, 64), new THREE.MeshStandardMaterial({
            color: 0x2d7d3a,
            roughness: 0.85,
            metalness: 0.05,
        }));
        this._terrain.receiveShadow = true;
        scene.add(this._terrain);
        // ── Ocean (97 % radius, slightly transparent) ─────────
        this._ocean = new THREE.Mesh(new THREE.SphereGeometry(PLANET_RADIUS * 0.97, 48, 48), new THREE.MeshStandardMaterial({
            color: 0x1a5fa8,
            roughness: 0.05,
            metalness: 0.3,
            transparent: true,
            opacity: 0.88,
        }));
        scene.add(this._ocean);
        // ── Atmosphere (BackSide rendered shell) ──────────────
        this._atmosphere = new THREE.Mesh(new THREE.SphereGeometry(PLANET_RADIUS * 1.08, 32, 32), new THREE.MeshStandardMaterial({
            color: 0x60aaff,
            transparent: true,
            opacity: 0.08,
            side: THREE.BackSide,
            depthWrite: false,
        }));
        scene.add(this._atmosphere);
        // ── Wireframe overlay (shows curvature clearly) ───────
        this._wireframe = new THREE.Mesh(new THREE.SphereGeometry(PLANET_RADIUS + 0.02, 24, 24), new THREE.MeshBasicMaterial({
            color: 0x3aff8a,
            wireframe: true,
            transparent: true,
            opacity: 0.06,
        }));
        scene.add(this._wireframe);
    }
    /**
     * Called each frame by GameEngine.
     * Slowly rotates the terrain mesh for a sense of life.
     * @param time - monotonically increasing elapsed time (seconds × speed)
     */
    update(time) {
        this._terrain.rotation.y = time * 0.15;
        // FUTURE_HOOK: Lerp terrain colour toward pollution tint:
        // const mat = this._terrain.material as THREE.MeshStandardMaterial;
        // mat.color.lerpColors(CLEAN_COLOR, POLLUTED_COLOR, state.pollutionLevel);
    }
}
//# sourceMappingURL=Planet.js.map