import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { Planet } from '../world/Planet';
import { PLANET_RADIUS } from '../world/Planet';

// ── Penguin tuning ──────────────────────────────────────
const PENGUIN_WALK_SPEED = 0.005; // angular step per frame on sphere
const PATROL_CHANGE_INTERVAL = 300; // frames before picking new patrol direction
const PATROL_ROTATION_SPEED = 0.02; // radians per frame for turning

// ── Scratch objects ──────────────────────────────────────
const _scratchVec = new THREE.Vector3();
const _scratchVec2 = new THREE.Vector3();
const _scratchQuat = new THREE.Quaternion();
const _worldUp = new THREE.Vector3(0, 1, 0);

/**
 * Penguin — an NPC that walks around on land zones of the planet.
 *
 * The penguin starts at a random land location and patrols in a
 * direction-changing walk pattern, staying within land zones.
 */
export class Penguin {
    private readonly _group: THREE.Group;
    private readonly _planet: Planet;
    private _model: THREE.Group | null = null;
    private _isLoaded = false;

    // ── Penguin physics ────────────────────────────────────
    private _surfaceNormal: THREE.Vector3 = new THREE.Vector3(0, 1, 0);
    private _forward: THREE.Vector3 = new THREE.Vector3(0, 0, -1);
    private _patrolDirection: THREE.Vector3 = new THREE.Vector3(1, 0, 0);
    private _framesSincePatrolChange = 0;

    constructor(
        scene: THREE.Scene,
        planet: Planet,
    ) {
        this._group = new THREE.Group();
        this._planet = planet;

        // Start at a random land location on the planet
        this._initializeRandomLocation();

        scene.add(this._group);

        // Load the FBX model asynchronously
        this._loadModel();
    }

    /**
     * Pick a random land location on the planet for the penguin to start.
     */
    private _initializeRandomLocation(): void {
        let attempts = 0;
        while (attempts < 50) {
            const phi = Math.random() * Math.PI * 2;
            const theta = Math.acos(Math.random() * 2 - 1);
            this._surfaceNormal.set(
                Math.sin(theta) * Math.cos(phi),
                Math.cos(theta),
                Math.sin(theta) * Math.sin(phi),
            );

            if (this._planet.isPointOnLand(this._surfaceNormal)) {
                break;
            }
            attempts++;
        }

        this._group.position.copy(this._surfaceNormal).multiplyScalar(PLANET_RADIUS);

        // Random initial facing
        const angle = Math.random() * Math.PI * 2;
        this._forward.set(Math.cos(angle), 0, Math.sin(angle));
        this._forward
            .addScaledVector(this._surfaceNormal, -this._forward.dot(this._surfaceNormal))
            .normalize();
    }

    /**
     * Load the FBX model from the public assets folder.
     */
    private _loadModel(): void {
        const loader = new FBXLoader();
        loader.load(
            '/models/penguin.fbx',
            (group: THREE.Group) => {
                this._model = group;
                this._isLoaded = true;
                this._model.scale.set(1, 1, 1);
                this._group.add(this._model);
            },
            undefined,
            (error: any) => {
                console.warn('Failed to load penguin model:', error);
            },
        );
    }

    /**
     * Update called each frame by GameEngine.
     */
    update(): void {
        if (!this._isLoaded) return;

        // Penguin patrol behavior: walk in a direction, change patrol course periodically
        this._framesSincePatrolChange++;
        if (this._framesSincePatrolChange > PATROL_CHANGE_INTERVAL) {
            this._pickNewPatrolDirection();
            this._framesSincePatrolChange = 0;
        }

        // Slowly turn toward the patrol direction
        const targetAngle = Math.atan2(this._patrolDirection.x, this._patrolDirection.z);
        const currentAngle = Math.atan2(this._forward.x, this._forward.z);
        let angleDiff = targetAngle - currentAngle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        if (Math.abs(angleDiff) > 0.01) {
            const turnAmount = Math.sign(angleDiff) * PATROL_ROTATION_SPEED;
            _scratchQuat.setFromAxisAngle(this._surfaceNormal, turnAmount);
            this._forward.applyQuaternion(_scratchQuat);
            this._forward
                .addScaledVector(this._surfaceNormal, -this._forward.dot(this._surfaceNormal))
                .normalize();
        }

        // Walk forward in the direction we're facing
        _scratchVec2.crossVectors(this._forward, this._surfaceNormal).normalize();
        _scratchQuat.setFromAxisAngle(_scratchVec2, PENGUIN_WALK_SPEED);

        _scratchVec.copy(this._surfaceNormal).applyQuaternion(_scratchQuat).normalize();
        const nextPos = _scratchVec;

        // Only move if the next position is still on land
        if (this._planet.isPointOnLand(nextPos)) {
            this._surfaceNormal.copy(nextPos);
        } else {
            // Hit water or boundary — pick a new direction
            this._pickNewPatrolDirection();
        }

        // Update the group position and orientation
        this._group.position.copy(this._surfaceNormal).multiplyScalar(PLANET_RADIUS);

        // Align group so local +Y points outward
        _scratchQuat.setFromUnitVectors(_worldUp, this._surfaceNormal);
        this._group.quaternion.copy(_scratchQuat);

        // Align model rotation to face the forward direction
        const currentLook = new THREE.Vector3(0, 0, -1).applyQuaternion(_scratchQuat);
        const facingRot = new THREE.Quaternion().setFromUnitVectors(currentLook, this._forward);
        this._group.quaternion.premultiply(facingRot);
    }

    /**
     * Pick a new patrol direction (a random tangent vector on the sphere).
     */
    private _pickNewPatrolDirection(): void {
        // Create a random vector in the tangent plane
        const randomAngle = Math.random() * Math.PI * 2;
        _scratchVec.set(Math.cos(randomAngle), 0, Math.sin(randomAngle));

        // Remove the component along the surface normal
        _scratchVec.addScaledVector(
            this._surfaceNormal,
            -_scratchVec.dot(this._surfaceNormal),
        );
        _scratchVec.normalize();

        this._patrolDirection.copy(_scratchVec);
        this._framesSincePatrolChange = 0;
    }
}
