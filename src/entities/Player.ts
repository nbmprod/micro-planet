import * as THREE from 'three';
import { GameState } from '../core/GameState';
import { InputManager } from '../core/InputManager';
import { CollisionSystem } from '../core/CollisionSystem';
import { Planet } from '../world/Planet';
import { GameConfig } from '../config/GameConfig';


// ── Reusable scratch objects (module-scoped, not per-frame allocated) ───────
// Keeping these outside the class prevents GC pressure in the hot update path.
const _scratchVec = new THREE.Vector3();
const _scratchVec2 = new THREE.Vector3();
const _scratchQuat = new THREE.Quaternion();
const _worldUp = new THREE.Vector3(0, 1, 0); // immutable reference axis

/**
 * Player — manages the player mesh hierarchy, spherical physics,
 * quaternion-based surface orientation, and the chase camera.
 *
 * ── How spherical movement works ────────────────────────────
 *
 *  We represent the player's surface position as a *unit vector*
 *  (`state.surfaceNormal`) pointing from the planet origin to the player.
 *  Instead of moving in Cartesian (X,Y,Z), we rotate this vector:
 *
 *  ┌─ Moving forward/back ─────────────────────────────────────┐
 *  │  Axis = player RIGHT = forward × surfaceNormal            │
 *  │  Rotate surfaceNormal around this axis by ±MOVE_SPEED     │
 *  │  → traces a great-circle arc on the sphere                │
 *  └───────────────────────────────────────────────────────────┘
 *
 *  ┌─ Turning left/right ──────────────────────────────────────┐w
 *  │  Axis = surfaceNormal ("up" in player local space)        │
 *  │  Rotate the forward tangent vector around this axis       │
 *  └───────────────────────────────────────────────────────────┘
 *
 *  After both operations we re-orthogonalise `forward` against
 *  `surfaceNormal` (remove any component in the normal direction)
 *  to prevent floating-point drift from pulling it off the surface.
 *
 * ── How orientation works ───────────────────────────────────
 *
 *  Step 1 — Gravity alignment:
 *    quaternion = setFromUnitVectors(+Y_world, surfaceNormal)
 *    This rotates the group so its local +Y always points outward from
 *    the planet centre, regardless of where on the sphere the player stands.
 *
 *  Step 2 — Facing alignment:
 *    We derive where the group's local -Z is currently pointing (the
 *    "default look" after gravity alignment), then compute a quaternion
 *    that rotates that onto the `forward` tangent vector.
 *    This produces the final yaw without breaking the gravity alignment.
 *
 * FUTURE_HOOK: Replace magic constants with data loaded from a config asset.
 * FUTURE_HOOK: Emit a 'playerMoved' event each frame so a minimap or
 *              pollution-spread system can react to position changes.
 * FUTURE_HOOK: Add footstep audio trigger based on grounded state transitions.
 */
export class Player {
    private readonly _group: THREE.Group;
    private readonly _visual: THREE.Group;
    private readonly _camera: THREE.PerspectiveCamera;
    private readonly _state: GameState;
    private readonly _input: InputManager;
    private readonly _planet: Planet;
    private readonly _collisionSystem: CollisionSystem;

    constructor(
        scene: THREE.Scene,
        camera: THREE.PerspectiveCamera,
        state: GameState,
        input: InputManager,
        planet: Planet,
        collisionSystem: CollisionSystem,
    ) {
        this._camera = camera;
        this._state = state;
        this._input = input;
        this._planet = planet;
        this._collisionSystem = collisionSystem;

        // ── Build mesh hierarchy ───────────────────────────────
        this._group = new THREE.Group();
        this._visual = new THREE.Group();

        // Body
        const body = new THREE.Mesh(
            new THREE.BoxGeometry(
                GameConfig.player.bodyDimensions.x,
                GameConfig.player.bodyDimensions.y,
                GameConfig.player.bodyDimensions.z,
            ),
            new THREE.MeshStandardMaterial({ color: 0xe04020, roughness: 0.6 }),
        );
        body.castShadow = true;
        body.position.y = GameConfig.player.height;
        this._visual.add(body);

        // Head
        const head = new THREE.Mesh(
            new THREE.SphereGeometry(GameConfig.player.headRadius, 12, 12),
            new THREE.MeshStandardMaterial({ color: 0xf5c58a, roughness: 0.5 }),
        );
        head.castShadow = true;
        head.position.y = GameConfig.player.height + (0.72 / 3);
        this._visual.add(head);

        // Eyes (indicate facing direction through local +Z offset)
        const eyeGeo = new THREE.SphereGeometry(GameConfig.player.eyeRadius, 6, 6);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
        for (const x of [-0.1 / 3, 0.1 / 3]) {
            const eye = new THREE.Mesh(eyeGeo, eyeMat);
            eye.position.set(x, GameConfig.player.height + GameConfig.player.eyeOffsetY, GameConfig.player.eyeOffsetZ);
            this._visual.add(eye);
        }

        // Initial position from GameConfig, defaulting to the north pole.
        const startLat = THREE.MathUtils.degToRad(GameConfig.player.startLatitudeDeg);
        const startLon = THREE.MathUtils.degToRad(GameConfig.player.startLongitudeDeg);
        this._state.surfaceNormal.set(
            Math.cos(startLat) * Math.cos(startLon),
            Math.sin(startLat),
            Math.cos(startLat) * Math.sin(startLon),
        );

        this._state.forward.set(-Math.sin(startLon), 0, Math.cos(startLon));
        this._state.forward
            .addScaledVector(this._state.surfaceNormal, -this._state.forward.dot(this._state.surfaceNormal))
            .normalize();

        this._group.add(this._visual);
        this._group.position.copy(this._state.surfaceNormal).multiplyScalar(GameConfig.planet.radius);

        scene.add(this._group);

        // Seed camera behind the player at start
        camera.position.set(0, GameConfig.planet.radius + GameConfig.camera.height + 1, GameConfig.camera.distance + 1);
        camera.lookAt(0, GameConfig.planet.radius, 0);
    }

    /**
     * Main per-frame update. Called by GameEngine after input is read.
     * Order inside: turn → move → gravity → orient group → camera → HUD metrics.
     */
    update(): void {
        this._updateState();
        this._applyStateToVisuals();
        this._updateCamera();
        this._updateDerivedMetrics();
    }

    private _updateState(): void {
        this._handleMovement();
        this._applyGravity();
        this._updateSwimmingState();
    }

    private _applyStateToVisuals(): void {
        this._orientGroup();
    }

    // ── Private sub-steps ─────────────────────────────────────

    /**
     * Rotate the forward tangent vector around the outward surface normal.
     * This is a pure yaw in the player's local frame.
     */
    /**
     * Walk along the sphere surface.
     *
     * Key insight: moving "forward" on a sphere means rotating the
     * surfaceNormal vector (which tracks our position!) around the
     * player's right axis by a small angle equal to MOVE_SPEED.
     * This traces a great-circle arc — the geodesic of a sphere.
     */
    private _handleMovement(): void {
        const move = this._input.axis('KeyW', 'KeyS') +
            this._input.axis('ArrowUp', 'ArrowDown');
        const strafe = this._input.axis('KeyD', 'KeyA') +
            this._input.axis('ArrowRight', 'ArrowLeft');

        if (move === 0 && strafe === 0) return;

        // Screen-relative forward direction from the camera projected onto the
        // player's tangent plane. This makes W/S move away/toward the screen.
        this._camera.getWorldDirection(_scratchVec).negate();
        _scratchVec
            .addScaledVector(this._state.surfaceNormal, -_scratchVec.dot(this._state.surfaceNormal))
            .normalize();

        if (_scratchVec.lengthSq() < 1e-6) {
            _scratchVec.copy(this._state.forward);
        }

        // Screen-relative right direction in the tangent plane.
        _scratchVec2.crossVectors(_scratchVec, this._state.surfaceNormal).normalize();

        // Combine both camera-relative inputs into a single movement vector.
        _scratchVec
            .multiplyScalar(move)
            .addScaledVector(_scratchVec2, strafe);

        if (_scratchVec.lengthSq() === 0) return;
        _scratchVec.normalize();

        // Move the surfaceNormal along the great circle in the desired direction.
        _scratchVec2.crossVectors(_scratchVec, this._state.surfaceNormal).normalize();
        const moveSpeed = GameConfig.player.moveSpeed * (this._state.isSwimming ? GameConfig.player.swimSpeedFactor : 1);
        _scratchQuat.setFromAxisAngle(_scratchVec2, moveSpeed);

        _scratchVec2.copy(this._state.surfaceNormal).applyQuaternion(_scratchQuat).normalize();
        const nextSurfaceNormal = _scratchVec2;

        if (!this._planet.isPointOnLand(nextSurfaceNormal)) {
            return;
        }

        const nextWorldPosition = _scratchVec.copy(nextSurfaceNormal)
            .multiplyScalar(GameConfig.planet.radius);

        if (this._collisionSystem.queryCollision(nextWorldPosition, GameConfig.player.collisionRadius)) {
            return;
        }

        this._state.surfaceNormal.copy(nextSurfaceNormal);

        this._state.forward.copy(_scratchVec).applyQuaternion(_scratchQuat);
        this._state.forward
            .addScaledVector(
                this._state.surfaceNormal,
                -this._state.forward.dot(this._state.surfaceNormal),
            )
            .normalize();
    }

    /** Simple radial gravity + jump impulse. */
    private _applyGravity(): void {
        if (this._input.isDown('Space') && this._state.grounded) {
            this._state.radialVelocity = GameConfig.player.jumpImpulse;
            this._state.grounded = false;
        }

        this._state.radialVelocity -= GameConfig.player.gravity;
        this._state.altitude += this._state.radialVelocity;

        if (this._state.altitude <= 0) {
            this._state.altitude = 0;
            this._state.radialVelocity = 0;
            this._state.grounded = true;
        }
    }

    private _updateSwimmingState(): void {
        this._state.isSwimming = false;
        this._visual.position.y = 0;
        this._visual.rotation.x = 0;
    }

    /**
     * Apply the two-step quaternion orientation to the player group.
     *
     * Step 1 — Gravity alignment:
     *   Rotate world +Y onto surfaceNormal so local +Y = outward from planet.
     *   Result: the player stands upright anywhere on the sphere.
     *
     * Step 2 — Facing alignment:
     *   Find where local -Z points after Step 1, then compute a second
     *   quaternion that rotates it onto the desired `forward` tangent.
     *   pre-multiply so it applies on top of gravity alignment.
     */
    private _orientGroup(): void {
        // Position: scale the unit surface normal to the correct radius + altitude.
        this._group.position
            .copy(this._state.surfaceNormal)
            .multiplyScalar(GameConfig.planet.radius + this._state.altitude);

        // Step 1: Align local +Y with the surface normal (gravity).
        _scratchQuat.setFromUnitVectors(_worldUp, this._state.surfaceNormal);
        this._group.quaternion.copy(_scratchQuat);

        // Step 2: Align local +Z with the forward tangent (facing direction).
        //   currentLook = where local +Z points after gravity alignment
        const currentLook = new THREE.Vector3(0, 0, 1).applyQuaternion(_scratchQuat);
        const facingRot = new THREE.Quaternion().setFromUnitVectors(currentLook, this._state.forward);
        this._group.quaternion.premultiply(facingRot);
    }

    /**
     * Third-person chase camera.
     *
     * We compute the desired camera position in the player's local frame
     * (behind and above) and transform it to world space using the player's
     * quaternion. We then lerp toward it for smooth lag.
     *
     * `camera.up` is set to surfaceNormal so Three.js lookAt() keeps the
     * horizon horizontal from the player's perspective at all times —
     * even when walking on the underside of the planet.
     */
    private _updateCamera(): void {
        // Build a chase offset from the current camera view direction rather
        // than the player's current facing direction.
        this._camera.getWorldDirection(_scratchVec);
        _scratchVec
            .addScaledVector(this._state.surfaceNormal, -_scratchVec.dot(this._state.surfaceNormal))
            .normalize();

        if (_scratchVec.lengthSq() < 1e-6) {
            _scratchVec.copy(this._state.forward).negate();
            _scratchVec
                .addScaledVector(this._state.surfaceNormal, -_scratchVec.dot(this._state.surfaceNormal))
                .normalize();
        }

        _scratchVec2.copy(_scratchVec).multiplyScalar(-GameConfig.camera.distance)
            .addScaledVector(this._state.surfaceNormal, GameConfig.camera.height);

        _scratchVec.copy(this._group.position).add(_scratchVec2);
        this._camera.position.lerp(_scratchVec, GameConfig.camera.lerp);

        const lookTarget = _scratchVec2.copy(this._group.position)
            .addScaledVector(this._state.surfaceNormal, GameConfig.player.height + 0.5);

        this._camera.up.copy(this._state.surfaceNormal); // Prevent roll/spinning
        this._camera.lookAt(lookTarget);
    }
    /** Derive HUD-ready metrics from the current surface normal. */
    private _updateDerivedMetrics(): void {
        const n = this._state.surfaceNormal;
        // Latitude:  arcsin(n.y)       — ranges −90° to +90°
        // Longitude: atan2(n.z, n.x)   — ranges −180° to +180°
        this._state.latitudeDeg = THREE.MathUtils.radToDeg(Math.asin(n.y));
        this._state.longitudeDeg = THREE.MathUtils.radToDeg(Math.atan2(n.z, n.x));

        // FUTURE_HOOK: Look up biome from a lat/lon map texture sampler here.
        // FUTURE_HOOK: Update state.pollutionLevel based on proximity to factories.
    }
}
