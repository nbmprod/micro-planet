import { Script, Vec3, Entity } from 'playcanvas';

const _viewDir = new Vec3();
const _offset = new Vec3();
const _targetPos = new Vec3();
const _camPos = new Vec3();
const _lookTarget = new Vec3();

/**
 * Third-person chase camera for a player walking on a small planet — ported
 * from Player.ts's `_updateCamera`. Runs in `postUpdate` (after
 * PlayerController's `update`) so it always reads this frame's final player
 * position, not last frame's.
 *
 * `entity.lookAt(target, up)` does the job Three's `camera.up.copy(...)` +
 * `camera.lookAt(...)` pair did — passing `surfaceNormal` as up keeps the
 * horizon level from the player's perspective even upside-down on the planet.
 */
export class ChaseCamera extends Script {
    static scriptName = 'chaseCamera';

    /**
     * The player entity to follow (must have a `playerController` script).
     * Falls back to finding an entity named "Player" if left unset.
     * @attribute
     * @type {Entity}
     */
    target;

    /** @attribute */
    distance = 4.5;

    /** @attribute */
    height = 4.5;

    /**
     * Camera lag — lower is slower/laggier.
     * @attribute
     * @range [0.01, 1]
     */
    lerp = 0.1;

    initialize() {
        if (!this.target) {
            this.target = this.app.root.findByName('Player');
        }
        this._playerScript = this.target ? this.target.script?.get('playerController') : null;
    }

    postUpdate() {
        if (!this._playerScript) return;

        const surfaceNormal = this._playerScript.surfaceNormal;
        const playerPos = this.target.getPosition();

        // Chase offset is built from the camera's CURRENT view direction
        // (not the player's forward), so the camera doesn't snap around when
        // the player's facing changes — it only drifts as you actually move.
        _viewDir.copy(this.entity.forward);
        _viewDir.addScaled(surfaceNormal, -_viewDir.dot(surfaceNormal));
        if (_viewDir.lengthSq() < 1e-6) {
            _viewDir.copy(this._playerScript.forward).mulScalar(-1);
            _viewDir.addScaled(surfaceNormal, -_viewDir.dot(surfaceNormal));
        }
        _viewDir.normalize();

        _offset.copy(_viewDir).mulScalar(-this.distance).addScaled(surfaceNormal, this.height);
        _targetPos.copy(playerPos).add(_offset);

        if (!this._snapped) {
            // Skip the lerp on the very first frame so the camera doesn't
            // sweep in from wherever it happened to be placed in the Editor.
            this.entity.setPosition(_targetPos);
            this._snapped = true;
        } else {
            _camPos.lerp(this.entity.getPosition(), _targetPos, this.lerp);
            this.entity.setPosition(_camPos);
        }

        _lookTarget.copy(playerPos).addScaled(surfaceNormal, this._playerScript.height + 0.5);
        this.entity.lookAt(_lookTarget, surfaceNormal);
    }
}
