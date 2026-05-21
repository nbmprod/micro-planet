import * as THREE from 'three';
import { CollisionSystem } from '../core/CollisionSystem';
import { GameConfig } from '../config/GameConfig';

/**
 * DecorationEntry — defines a single static decoration on the planet surface.
 *
 * FUTURE_HOOK: Extend with `health`, `type` (e.g. 'tree' | 'rock' | 'factory'),
 *              and `pollutionEmission` so gameplay can affect the environment.
 * FUTURE_HOOK: Load decoration lists from a JSON level file instead of
 *              hardcoding them here (data-driven design).
 */

/**
 * DecorationManager — scatters static environment meshes across the planet.
 *
 * All decorations are oriented so their local +Y axis points outward from the
 * planet centre (i.e., they "stand up" on the surface).
 */
export class DecorationManager {
    /** Reusable UP vector for orientation quaternion (avoid repeated allocation). */
    private static readonly _WORLD_UP = new THREE.Vector3(0, 1, 0);
    private readonly _collisionSystem: CollisionSystem;

    constructor(scene: THREE.Scene, collisionSystem: CollisionSystem) {
        this._collisionSystem = collisionSystem;

        for (const entry of GameConfig.decoration.data) {
            const mesh = entry.type === 'tree'
                ? this._buildTree()
                : this._buildRock();

            this._placeOnSurface(mesh, entry.latDeg, entry.lonDeg);
            scene.add(mesh);

            const radius = entry.type === 'tree'
                ? GameConfig.decoration.treeColliderRadius
                : GameConfig.decoration.rockColliderRadius;
            this._collisionSystem.registerCollider(mesh.position, radius);
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
            GameConfig.planet.radius * Math.cos(lat) * Math.cos(lon),
            GameConfig.planet.radius * Math.sin(lat),
            GameConfig.planet.radius * Math.cos(lat) * Math.sin(lon),
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
            new THREE.CylinderGeometry(
                GameConfig.decoration.treeTrunk.topRadius,
                GameConfig.decoration.treeTrunk.bottomRadius,
                GameConfig.decoration.treeTrunk.height,
                6,
            ),
            new THREE.MeshStandardMaterial({ color: GameConfig.decoration.treeColor, roughness: 0.9 }),
        );
        trunk.castShadow = true;

        const foliage = new THREE.Mesh(
            new THREE.ConeGeometry(
                GameConfig.decoration.foliage.radius,
                GameConfig.decoration.foliage.height,
                6,
            ),
            new THREE.MeshStandardMaterial({ color: GameConfig.decoration.foliageColor, roughness: 0.8 }),
        );
        foliage.position.y = GameConfig.decoration.foliage.height * 0.78;
        foliage.castShadow = true;

        group.add(trunk, foliage);
        return group;
    }

    private _buildRock(): THREE.Mesh {
        const rock = new THREE.Mesh(
            new THREE.DodecahedronGeometry(
                (GameConfig.decoration.rockRadius.base + Math.random() * GameConfig.decoration.rockRadius.variance),
                0,
            ),
            new THREE.MeshStandardMaterial({ color: GameConfig.decoration.rockColor, roughness: 0.95 }),
        );
        rock.castShadow = true;
        return rock;
    }
}
