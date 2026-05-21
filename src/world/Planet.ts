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
    private _maskCanvas!: HTMLCanvasElement;
    private _maskContext: CanvasRenderingContext2D | null = null;
    private _maskImageData: ImageData | null = null;
    private _maskLoaded = false;

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

        this._initializeMaskLoader();

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
        if (this._maskLoaded && this._maskImageData) {
            return this._sampleMask(normal);
        }

        for (const zone of _LAND_ZONES) {
            if (zone.center.dot(normal) >= zone.threshold) {
                return true;
            }
        }
        return false;
    }

    private _initializeMaskLoader(): void {
        this._maskCanvas = document.createElement('canvas');
        this._maskCanvas.style.display = 'none';
        this._maskContext = this._maskCanvas.getContext('2d');
        if (typeof document !== 'undefined' && document.body) {
            document.body.appendChild(this._maskCanvas);
        }

        const loader = new THREE.TextureLoader();
        loader.load(
            GameConfig.planet.earthMaskUrl,
            (texture) => {
                texture.needsUpdate = true;

                const image = texture.image as HTMLImageElement;
                if (!this._maskContext) {
                    return;
                }

                this._maskCanvas.width = image.width;
                this._maskCanvas.height = image.height;
                this._maskContext.drawImage(image, 0, 0, image.width, image.height);
                this._maskImageData = this._maskContext.getImageData(0, 0, image.width, image.height);
                this._maskLoaded = true;

                this._refreshTerrainVertexColors();
            },
            undefined,
            (error) => {
                console.warn('Planet land mask failed to load:', error);
            },
        );
    }

    private _sampleMask(normal: THREE.Vector3): boolean {
        if (!this._maskImageData) {
            return false;
        }

        const latitude = THREE.MathUtils.radToDeg(Math.asin(normal.y));
        const longitude = THREE.MathUtils.radToDeg(Math.atan2(normal.z, normal.x));

        const u = (longitude + 180) / 360;
        const v = (latitude + 90) / 180;

        const width = this._maskCanvas.width;
        const height = this._maskCanvas.height;
        const x = Math.min(width - 1, Math.max(0, Math.floor(u * width)));
        const y = Math.min(height - 1, Math.max(0, Math.floor((1 - v) * height)));
        const offset = (y * width + x) * 4;
        const data = this._maskImageData.data;
        const brightness = (data[offset] + data[offset + 1] + data[offset + 2]) / 765;
        return brightness > 0.5;
    }

    private _refreshTerrainVertexColors(): void {
        const geometry = this._terrain.geometry as THREE.BufferGeometry;
        const colorAttribute = geometry.getAttribute('color') as THREE.BufferAttribute;
        const colorArray = colorAttribute.array as Float32Array;
        const positionAttribute = geometry.getAttribute('position') as THREE.BufferAttribute;

        for (let i = 0; i < positionAttribute.count; i += 1) {
            const vertex = new THREE.Vector3().fromBufferAttribute(positionAttribute, i);
            const isLand = this.isPointOnLand(vertex);
            const color = isLand
                ? new THREE.Color(GameConfig.planet.landColor)
                : new THREE.Color(GameConfig.planet.waterColor);
            colorArray[i * 3] = color.r;
            colorArray[i * 3 + 1] = color.g;
            colorArray[i * 3 + 2] = color.b;
        }

        colorAttribute.needsUpdate = true;
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
