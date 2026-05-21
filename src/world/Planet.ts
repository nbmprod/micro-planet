import * as THREE from 'three';
import { GameConfig } from '../config/GameConfig';

const _planetNormal = new THREE.Vector3();

const PLANET_RADIUS = GameConfig.planet.radius;
const _LAND_ZONES = GameConfig.planet.landZones.map((zone) => ({
    center: new THREE.Vector3(zone.center[0], zone.center[1], zone.center[2]).normalize(),
    threshold: zone.threshold,
}));

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

export class Planet {

    private readonly _terrain: THREE.Mesh;
    private readonly _ocean: THREE.Mesh;
    private readonly _atmosphere: THREE.Mesh;
    private readonly _wireframe: THREE.Mesh;

    constructor(scene: THREE.Scene) {
        // ── Terrain ───────────────────────────────────────────
        const terrainGeometry = new THREE.SphereGeometry(
            PLANET_RADIUS,
            GameConfig.planet.terrainSegments,
            GameConfig.planet.terrainSegments,
        );

        const colorArray = new Float32Array(terrainGeometry.attributes.position.count * 3);
        for (let i = 0; i < terrainGeometry.attributes.position.count; i += 1) {
            const vertex = new THREE.Vector3().fromBufferAttribute(terrainGeometry.attributes.position as THREE.BufferAttribute, i);
            const isLand = this.isPointOnLand(vertex);
            const color = isLand
                ? new THREE.Color(GameConfig.planet.landColor)
                : new THREE.Color(GameConfig.planet.waterColor);
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
            new THREE.SphereGeometry(
                PLANET_RADIUS * GameConfig.planet.oceanRadiusScale,
                GameConfig.planet.oceanSegments,
                GameConfig.planet.oceanSegments,
            ),
            new THREE.MeshStandardMaterial({
                color: GameConfig.planet.oceanColor,
                roughness: GameConfig.planet.oceanRoughness,
                metalness: GameConfig.planet.oceanMetalness,
                transparent: true,
                opacity: GameConfig.planet.oceanOpacity,
            }),
        );
        scene.add(this._ocean);

        // ── Atmosphere (BackSide rendered shell) ──────────────
        this._atmosphere = new THREE.Mesh(
            new THREE.SphereGeometry(
                PLANET_RADIUS * GameConfig.planet.atmosphereRadiusScale,
                GameConfig.planet.atmosphereSegments,
                GameConfig.planet.atmosphereSegments,
            ),
            new THREE.MeshStandardMaterial({
                color: GameConfig.planet.atmosphereColor,
                transparent: true,
                opacity: GameConfig.planet.atmosphereOpacity,
                side: THREE.BackSide,
                depthWrite: false,
            }),
        );
        scene.add(this._atmosphere);

        // ── Wireframe overlay (shows curvature clearly) ───────
        this._wireframe = new THREE.Mesh(
            new THREE.SphereGeometry(
                PLANET_RADIUS + GameConfig.planet.wireframeRadiusOffset,
                GameConfig.planet.wireframeSegments,
                GameConfig.planet.wireframeSegments,
            ),
            new THREE.MeshBasicMaterial({
                color: GameConfig.planet.wireframeColor,
                wireframe: true,
                transparent: true,
                opacity: GameConfig.planet.wireframeOpacity,
            }),
        );
        scene.add(this._wireframe);
    }

    public isPointOnLand(point: THREE.Vector3): boolean {
        const normal = _planetNormal.copy(point).normalize();
        for (const zone of _LAND_ZONES) {
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
