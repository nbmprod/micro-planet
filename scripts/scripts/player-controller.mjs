import { Script, Vec3, Quat, Color, StandardMaterial, Entity, math, KEY_W, KEY_S, KEY_A, KEY_D, KEY_UP, KEY_DOWN, KEY_LEFT, KEY_RIGHT, KEY_SPACE } from 'playcanvas';

// ── Reusable scratch objects (module-scoped, not per-frame allocated) ──────
const _screenForward = new Vec3();
const _screenRight = new Vec3();
const _moveDir = new Vec3();
const _rotAxis = new Vec3();
const _rotQuat = new Quat();
const _nextNormal = new Vec3();
const _gravityQuat = new Quat();
const _facingQuat = new Quat();
const _currentLook = new Vec3();
const _posScratch = new Vec3();
const WORLD_UP = new Vec3(0, 1, 0);
const LOCAL_FORWARD = new Vec3(0, 0, -1); // PlayCanvas forward convention (matches camera)

function hexColor(hex) {
    return new Color(((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255);
}

function axis(keyboard, posKey, negKey) {
    return (keyboard.isPressed(posKey) ? 1 : 0) - (keyboard.isPressed(negKey) ? 1 : 0);
}

/**
 * Spherical-planet player controller — walks the surface via great-circle
 * rotation instead of flat-world physics, ported from the Three.js
 * prototype's Player.ts (`_handleMovement` / `_orientGroup` / `_applyGravity`).
 *
 * The one deliberate correctness fix vs. the original: the original rotated
 * a stale scratch vector (aliased to `nextWorldPosition`) into `forward`,
 * which is very likely an accidental bug from scratch-variable reuse rather
 * than intended behavior. This port rotates the actual movement-direction
 * vector by the same small-angle quaternion that moved `surfaceNormal`
 * (parallel-transporting it along the great circle), which is what keeps
 * `forward` properly orthogonal to the new surface normal.
 *
 * Tuning attribute defaults are the Three.js prototype's GameConfig.ts
 * numbers converted from "per frame at ~60fps" to real per-second units, so
 * behavior no longer depends on frame rate. `moveSpeed` and `jumpImpulse`
 * scale by a single factor of 60 (each frame they're applied once, directly);
 * `gravity` scales by 60² since it compounds through both the velocity and
 * position integration steps.
 */
export class PlayerController extends Script {
    static scriptName = 'playerController';

    /**
     * The Planet entity (must have a `planet` script) this player walks on.
     * Falls back to finding an entity named "Planet" if left unset.
     * @attribute
     * @type {Entity}
     */
    planet;

    /**
     * Camera used for screen-relative movement (W = away from camera, etc).
     * Falls back to finding an entity named "Camera" if left unset.
     * @attribute
     * @type {Entity}
     */
    cameraEntity;

    /**
     * Great-circle move speed, in radians/second.
     * @attribute
     * @range [0, 1]
     * @precision 0.01
     */
    moveSpeed = 0.3;

    /**
     * @attribute
     * @range [0, 1]
     */
    swimSpeedFactor = 0.7;

    /** @attribute */
    jumpImpulse = 1.2;

    /** Downward acceleration, in units/second^2.
     * @attribute
     */
    gravity = 3.6;

    /** @attribute */
    enableSwimming = true;

    /** @attribute */
    startLatitudeDeg = 55;

    /** @attribute */
    startLongitudeDeg = 37;

    /** Eye-level height above the surface, used for the placeholder model and camera look target.
     * @attribute
     */
    height = 0.12;

    /** @attribute */
    playerColor = hexColor(0xe04020);

    // ── Runtime state (read by ChaseCamera) ─────────────────────────────
    surfaceNormal = new Vec3();
    forward = new Vec3();
    altitude = 0;
    radialVelocity = 0;
    grounded = true;
    isSwimming = false;

    initialize() {
        this._planetScript = this.planet ? this.planet.script?.get('planet') : this.app.root.findByName('Planet')?.script?.get('planet');
        this._planetRadius = this._planetScript ? this._planetScript.radius : 10;

        if (!this.cameraEntity) {
            this.cameraEntity = this.app.root.findByName('Camera');
        }

        const startLat = this.startLatitudeDeg * math.DEG_TO_RAD;
        const startLon = this.startLongitudeDeg * math.DEG_TO_RAD;
        this.surfaceNormal.set(
            Math.cos(startLat) * Math.cos(startLon),
            Math.sin(startLat),
            Math.cos(startLat) * Math.sin(startLon),
        );
        this.forward.set(-Math.sin(startLon), 0, Math.cos(startLon));
        this.forward.addScaled(this.surfaceNormal, -this.forward.dot(this.surfaceNormal)).normalize();

        this._visual = this._buildPlaceholder();
        this.entity.addChild(this._visual);

        this._orient();
    }

    update(dt) {
        this._handleMovement(dt);
        this._applyGravity(dt);
        this._updateSwimmingState();
        this._orient();
    }

    _handleMovement(dt) {
        const keyboard = this.app.keyboard;
        if (!keyboard) return;

        const move = axis(keyboard, KEY_W, KEY_S) + axis(keyboard, KEY_UP, KEY_DOWN);
        const strafe = axis(keyboard, KEY_D, KEY_A) + axis(keyboard, KEY_RIGHT, KEY_LEFT);
        if (move === 0 && strafe === 0) return;

        // Screen-relative forward: camera's view direction projected onto the
        // player's tangent plane, so W/S move away from / toward the screen.
        _screenForward.copy(this.cameraEntity ? this.cameraEntity.forward : this.entity.forward).mulScalar(-1);
        _screenForward.addScaled(this.surfaceNormal, -_screenForward.dot(this.surfaceNormal));
        if (_screenForward.lengthSq() < 1e-6) {
            _screenForward.copy(this.forward);
        } else {
            _screenForward.normalize();
        }

        _screenRight.cross(_screenForward, this.surfaceNormal).normalize();

        _moveDir.copy(_screenForward).mulScalar(move).addScaled(_screenRight, strafe);
        if (_moveDir.lengthSq() < 1e-8) return;
        _moveDir.normalize();

        _rotAxis.cross(_moveDir, this.surfaceNormal).normalize();
        const speed = this.moveSpeed * (this.isSwimming ? this.swimSpeedFactor : 1) * dt;
        _rotQuat.setFromAxisAngle(_rotAxis, speed * math.RAD_TO_DEG);

        _rotQuat.transformVector(this.surfaceNormal, _nextNormal);
        _nextNormal.normalize();

        const isLand = this._planetScript ? this._planetScript.isPointOnLand(_nextNormal) : true;
        if (!isLand && !this.enableSwimming) return;

        this.surfaceNormal.copy(_nextNormal);

        // Parallel-transport the facing direction along the same small
        // rotation that moved surfaceNormal, then re-orthogonalize to kill
        // drift (see class doc comment for why this differs from the original).
        _rotQuat.transformVector(_moveDir, this.forward);
        this.forward.addScaled(this.surfaceNormal, -this.forward.dot(this.surfaceNormal)).normalize();
    }

    _applyGravity(dt) {
        const keyboard = this.app.keyboard;
        if (keyboard && keyboard.isPressed(KEY_SPACE) && this.grounded) {
            this.radialVelocity = this.jumpImpulse;
            this.grounded = false;
        }

        this.radialVelocity -= this.gravity * dt;
        this.altitude += this.radialVelocity * dt;

        if (this.altitude <= 0) {
            this.altitude = 0;
            this.radialVelocity = 0;
            this.grounded = true;
        }
    }

    _updateSwimmingState() {
        if (!this.enableSwimming) {
            this.isSwimming = false;
            this._visual.setLocalPosition(0, 0, 0);
            this._visual.setLocalEulerAngles(0, 0, 0);
            return;
        }

        const onWater = this._planetScript ? !this._planetScript.isPointOnLand(this.surfaceNormal) : false;
        this.isSwimming = onWater && this.altitude <= 0.02;

        if (this.isSwimming) {
            this._visual.setLocalPosition(0, -0.02, 0);
            this._visual.setLocalEulerAngles(8.6, 0, 0); // slight forward tilt (~0.15 rad)
        } else {
            this._visual.setLocalPosition(0, 0, 0);
            this._visual.setLocalEulerAngles(0, 0, 0);
        }
    }

    /**
     * Two-step orientation, same approach as the Three.js prototype:
     * 1) align local +Y with the surface normal (gravity),
     * 2) align local -Z (forward) with the desired facing tangent.
     */
    _orient() {
        _posScratch.copy(this.surfaceNormal).mulScalar(this._planetRadius + this.altitude);
        this.entity.setPosition(_posScratch);

        _gravityQuat.setFromDirections(WORLD_UP, this.surfaceNormal);
        _gravityQuat.transformVector(LOCAL_FORWARD, _currentLook);

        _facingQuat.setFromDirections(_currentLook, this.forward);
        _facingQuat.mul(_gravityQuat); // gravity applies first (inner), facing second (outer)

        this.entity.setRotation(_facingQuat);
    }

    _buildPlaceholder() {
        const visual = new Entity('Visual', this.app);

        const bodyMat = new StandardMaterial();
        bodyMat.diffuse = this.playerColor;
        bodyMat.update();
        const body = new Entity('Body', this.app);
        body.addComponent('render', { type: 'box', material: bodyMat });
        body.setLocalScale(0.5 / 3, 0.6 / 3, 0.3 / 3);
        body.setLocalPosition(0, this.height, 0);
        visual.addChild(body);

        const headMat = new StandardMaterial();
        headMat.diffuse = hexColor(0xf5c58a);
        headMat.update();
        const head = new Entity('Head', this.app);
        head.addComponent('render', { type: 'sphere', material: headMat });
        const headDiameter = (0.22 / 3) * 2;
        head.setLocalScale(headDiameter, headDiameter, headDiameter);
        head.setLocalPosition(0, this.height + 0.72 / 3, 0);
        visual.addChild(head);

        const eyeMat = new StandardMaterial();
        eyeMat.diffuse = hexColor(0x111111);
        eyeMat.emissive = hexColor(0x111111);
        eyeMat.update();
        const eyeDiameter = (0.055 / 3) * 2;
        for (const x of [-(0.1 / 3), 0.1 / 3]) {
            const eye = new Entity('Eye', this.app);
            eye.addComponent('render', { type: 'sphere', material: eyeMat });
            eye.setLocalScale(eyeDiameter, eyeDiameter, eyeDiameter);
            // -Z is forward, so eyes go on the -Z face of the head, not +Z.
            eye.setLocalPosition(x, this.height + 0.74 / 3, -(0.19 / 3));
            visual.addChild(eye);
        }

        return visual;
    }
}
