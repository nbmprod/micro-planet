import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { GameConfig } from '../config/GameConfig';
import { Planet } from '../world/Planet';

// ── Scratch objects ──────────────────────────────────────
const _scratchVec = new THREE.Vector3();
const _scratchVec2 = new THREE.Vector3();
const _scratchQuat = new THREE.Quaternion();
const _worldUp = new THREE.Vector3(0, 1, 0);

/**
 * Penguin — an NPC that walks around on land zones of the planet.
 *
 * The penguin maintains its own surface state, then syncs that state to
 * the rendered group so physics and visuals remain decoupled.
 */
export class Penguin {
    private readonly _group: THREE.Group;
    private readonly _planet: Planet;
    private _model: THREE.Group | null = null;
    private _isLoaded = false;

    // ── Penguin physics state ─────────────────────────────────
    private _surfaceNormal: THREE.Vector3 = new THREE.Vector3(0, 1, 0);
    private _forward: THREE.Vector3 = new THREE.Vector3(0, 0, -1);
    private _patrolDirection: THREE.Vector3 = new THREE.Vector3(1, 0, 0);
    private _framesSincePatrolChange = 0;

    constructor(scene: THREE.Scene, planet: Planet) {
        this._group = new THREE.Group();
        this._planet = planet;

        this._initializeRandomLocation();
        scene.add(this._group);
        this._loadModel();
    }

    public update(): void {
        if (!this._isLoaded) return;

        this._updateState();
        this._syncVisuals();
    }

    private _updateState(): void {
        this._framesSincePatrolChange++;
        if (this._framesSincePatrolChange > GameConfig.penguin.patrolChangeInterval) {
            this._pickNewPatrolDirection();
            this._framesSincePatrolChange = 0;
        }

        const targetAngle = Math.atan2(this._patrolDirection.x, this._patrolDirection.z);
        const currentAngle = Math.atan2(this._forward.x, this._forward.z);
        let angleDiff = targetAngle - currentAngle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        if (Math.abs(angleDiff) > 0.01) {
            const turnAmount = Math.sign(angleDiff) * GameConfig.penguin.patrolRotationSpeed;
            _scratchQuat.setFromAxisAngle(this._surfaceNormal, turnAmount);
            this._forward.applyQuaternion(_scratchQuat);
            this._forward
                .addScaledVector(this._surfaceNormal, -this._forward.dot(this._surfaceNormal))
                .normalize();
        }

        _scratchVec2.crossVectors(this._forward, this._surfaceNormal).normalize();
        _scratchQuat.setFromAxisAngle(_scratchVec2, GameConfig.penguin.walkSpeed);

        _scratchVec.copy(this._surfaceNormal).applyQuaternion(_scratchQuat).normalize();
        const nextPos = _scratchVec;

        if (this._planet.isPointOnLand(nextPos)) {
            this._surfaceNormal.copy(nextPos);
        } else {
            this._pickNewPatrolDirection();
        }
    }

    private _syncVisuals(): void {
        this._group.position.copy(this._surfaceNormal).multiplyScalar(GameConfig.planet.radius);

        _scratchQuat.setFromUnitVectors(_worldUp, this._surfaceNormal);
        this._group.quaternion.copy(_scratchQuat);

        const currentLook = new THREE.Vector3(0, 0, -1).applyQuaternion(_scratchQuat);
        const facingRot = new THREE.Quaternion().setFromUnitVectors(currentLook, this._forward);
        this._group.quaternion.premultiply(facingRot);
    }

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

        this._group.position.copy(this._surfaceNormal).multiplyScalar(GameConfig.planet.radius);

        const angle = Math.random() * Math.PI * 2;
        this._forward.set(Math.cos(angle), 0, Math.sin(angle));
        this._forward
            .addScaledVector(this._surfaceNormal, -this._forward.dot(this._surfaceNormal))
            .normalize();
    }

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

    private _pickNewPatrolDirection(): void {
        const randomAngle = Math.random() * Math.PI * 2;
        _scratchVec.set(Math.cos(randomAngle), 0, Math.sin(randomAngle));
        _scratchVec.addScaledVector(this._surfaceNormal, -_scratchVec.dot(this._surfaceNormal));
        _scratchVec.normalize();

        this._patrolDirection.copy(_scratchVec);
        this._framesSincePatrolChange = 0;
    }
}
