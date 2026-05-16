import * as THREE from 'three';
import { PLANET_RADIUS } from './Planet';

/**
 * DecorationEntry — defines a single static decoration on the planet surface.
 *
 * FUTURE_HOOK: Extend with `health`, `type` (e.g. 'tree' | 'rock' | 'factory'),
 *              and `pollutionEmission` so gameplay can affect the environment.
 * FUTURE_HOOK: Load decoration lists from a JSON level file instead of
 *              hardcoding them here (data-driven design).
 */
interface DecorationEntry {
    latDeg: number;
    lonDeg: number;
    type: 'tree' | 'rock';
}

/** Static decoration layout — lat/lon in degrees. */
const DECORATION_DATA: DecorationEntry[] = [
    { latDeg: 20, lonDeg: 30, type: 'tree' },
    { latDeg: 45, lonDeg: -60, type: 'tree' },
    { latDeg: -30, lonDeg: 90, type: 'tree' },
    { latDeg: 10, lonDeg: 150, type: 'tree' },
    { latDeg: -50, lonDeg: -20, type: 'tree' },
    { latDeg: 60, lonDeg: 200, type: 'tree' },
    { latDeg: -10, lonDeg: -130, type: 'tree' },
    { latDeg: 35, lonDeg: 80, type: 'rock' },
    { latDeg: -45, lonDeg: 45, type: 'rock' },
    { latDeg: 70, lonDeg: -90, type: 'rock' },
    { latDeg: -70, lonDeg: 150, type: 'rock' },
    { latDeg: 0, lonDeg: -60, type: 'tree' },
    { latDeg: 25, lonDeg: 260, type: 'tree' },
    { latDeg: -20, lonDeg: 200, type: 'rock' },
    { latDeg: 50, lonDeg: 310, type: 'tree' },
    { latDeg: -60, lonDeg: -100, type: 'tree' },
    { latDeg: 80, lonDeg: 50, type: 'rock' },
    { latDeg: -10, lonDeg: 300, type: 'tree' },
];

/**
 * DecorationManager — scatters static environment meshes across the planet.
 *
 * All decorations are oriented so their local +Y axis points outward from the
 * planet centre (i.e., they "stand up" on the surface).
 */
export class DecorationManager {
    /** Reusable UP vector for orientation quaternion (avoid repeated allocation). */
    private static readonly _WORLD_UP = new THREE.Vector3(0, 1, 0);

    constructor(scene: THREE.Scene) {
        for (const entry of DECORATION_DATA) {
            const mesh = entry.type === 'tree'
                ? this._buildTree()
                : this._buildRock();

            this._placeOnSurface(mesh, entry.latDeg, entry.lonDeg);
            scene.add(mesh);
        }
    }

    /**
     * Converts lat/lon (degrees) to a Cartesian world position on the planet
     * surface, then orients the object so its +Y axis points radially outward.
     */
    private _placeOnSurface(
        obj: THREE.Object3D,
        latDeg: number,
        lonDeg: number,
    ): void {
        const lat = THREE.MathUtils.degToRad(latDeg);
        const lon = THREE.MathUtils.degToRad(lonDeg);

        // Spherical → Cartesian: standard geographic convention
        //   x = R·cos(lat)·cos(lon)
        //   y = R·sin(lat)          (y is the polar axis)
        //   z = R·cos(lat)·sin(lon)
        const surfacePos = new THREE.Vector3(
            PLANET_RADIUS * Math.cos(lat) * Math.cos(lon),
            PLANET_RADIUS * Math.sin(lat),
            PLANET_RADIUS * Math.cos(lat) * Math.sin(lon),
        );

        // The outward normal is just the normalised position vector.
        const outwardNormal = surfacePos.clone().normalize();

        // Rotate local +Y onto the outward normal so decorations stand upright.
        obj.quaternion.setFromUnitVectors(DecorationManager._WORLD_UP, outwardNormal);
        obj.position.copy(surfacePos);
    }

    // ── Mesh builders ─────────────────────────────────────────

    private _buildTree(): THREE.Group {
        const group = new THREE.Group();

        const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.06, 0.09, 0.6, 6),
            new THREE.MeshStandardMaterial({ color: 0x6b3c11, roughness: 0.9 }),
        );
        trunk.castShadow = true;

        const foliage = new THREE.Mesh(
            new THREE.ConeGeometry(0.35, 0.9, 6),
            new THREE.MeshStandardMaterial({ color: 0x1a7a2a, roughness: 0.8 }),
        );
        foliage.position.y = 0.7;
        foliage.castShadow = true;

        group.add(trunk, foliage);
        return group;
    }

    private _buildRock(): THREE.Mesh {
        const rock = new THREE.Mesh(
            new THREE.DodecahedronGeometry(0.22 + Math.random() * 0.15, 0),
            new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.95 }),
        );
        rock.castShadow = true;
        return rock;
    }
}
