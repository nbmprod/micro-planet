import * as THREE from 'three';

const _planetNormal = new THREE.Vector3();

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
    private static readonly _LAND_ZONES = [
        { center: new THREE.Vector3(0.34, 0.82, 0.20).normalize(), threshold: 0.78 },
        { center: new THREE.Vector3(-0.60, -0.25, -0.75).normalize(), threshold: 0.75 },
        { center: new THREE.Vector3(0.30, -0.70, 0.65).normalize(), threshold: 0.76 },
        { center: new THREE.Vector3(-0.82, 0.30, 0.47).normalize(), threshold: 0.74 },
        { center: new THREE.Vector3(0.00, 0.95, 0.00).normalize(), threshold: 0.88 },
    ];

    private readonly _terrain: THREE.Mesh;
    private readonly _ocean: THREE.Mesh;
    private readonly _atmosphere: THREE.Mesh;
    private readonly _wireframe: THREE.Mesh;

    constructor(scene: THREE.Scene) {
        // ── Terrain ───────────────────────────────────────────
        const terrainGeometry = new THREE.SphereGeometry(PLANET_RADIUS, 64, 64);

        const colorArray = new Float32Array(terrainGeometry.attributes.position.count * 3);
        for (let i = 0; i < terrainGeometry.attributes.position.count; i += 1) {
            const vertex = new THREE.Vector3().fromBufferAttribute(terrainGeometry.attributes.position as THREE.BufferAttribute, i);
            const isLand = this.isPointOnLand(vertex);
            const color = isLand ? new THREE.Color(0x2d7d3a) : new THREE.Color(0x1a5fa8);
            colorArray[i * 3] = color.r;
            colorArray[i * 3 + 1] = color.g;
            colorArray[i * 3 + 2] = color.b;
        }
        terrainGeometry.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));

        this._terrain = new THREE.Mesh(
            terrainGeometry,
            new THREE.MeshStandardMaterial({
                vertexColors: true,
                roughness: 0.85,
                metalness: 0.05,
            }),
        );
        this._terrain.receiveShadow = true;
        scene.add(this._terrain);

        // ── Ocean (97 % radius, slightly transparent) ─────────
        this._ocean = new THREE.Mesh(
            new THREE.SphereGeometry(PLANET_RADIUS * 0.97, 48, 48),
            new THREE.MeshStandardMaterial({
                color: 0x1a5fa8,
                roughness: 0.05,
                metalness: 0.3,
                transparent: true,
                opacity: 0.88,
            }),
        );
        scene.add(this._ocean);

        // ── Atmosphere (BackSide rendered shell) ──────────────
        this._atmosphere = new THREE.Mesh(
            new THREE.SphereGeometry(PLANET_RADIUS * 1.08, 32, 32),
            new THREE.MeshStandardMaterial({
                color: 0x60aaff,
                transparent: true,
                opacity: 0.08,
                side: THREE.BackSide,
                depthWrite: false,
            }),
        );
        scene.add(this._atmosphere);

        // ── Wireframe overlay (shows curvature clearly) ───────
        this._wireframe = new THREE.Mesh(
            new THREE.SphereGeometry(PLANET_RADIUS + 0.02, 24, 24),
            new THREE.MeshBasicMaterial({
                color: 0x3aff8a,
                wireframe: true,
                transparent: true,
                opacity: 0.06,
            }),
        );
        scene.add(this._wireframe);
    }

    public isPointOnLand(point: THREE.Vector3): boolean {
        const normal = _planetNormal.copy(point).normalize();
        for (const zone of Planet._LAND_ZONES) {
            if (zone.center.dot(normal) >= zone.threshold) {
                return true;
            }
        }
        return false;
    }

    /**
     * Called each frame by GameEngine.
     * Slowly rotates the terrain mesh for a sense of life.
     * @param time - monotonically increasing elapsed time (seconds × speed)
     */
    update(): void {
        // Keep the terrain static so blue water zones remain in their original
        // positions after initial render.

        // FUTURE_HOOK: Lerp terrain colour toward pollution tint:
        // const mat = this._terrain.material as THREE.MeshStandardMaterial;
        // mat.color.lerpColors(CLEAN_COLOR, POLLUTED_COLOR, state.pollutionLevel);
    }
}
