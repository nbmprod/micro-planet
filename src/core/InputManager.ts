/**
 * InputManager — centralises keyboard event handling.
 *
 * Usage:
 *   const input = new InputManager();
 *   if (input.isDown('KeyW')) { ... }
 *   input.destroy(); // removes listeners on teardown
 *
 * FUTURE_HOOK: Add gamepad polling (`navigator.getGamepads()`) in `update()`.
 * FUTURE_HOOK: Add touch/swipe handling for mobile support.
 * FUTURE_HOOK: Expose an `onAction(name, callback)` event bus so subsystems
 *              can subscribe to named actions without polling.
 */
export class InputManager {
    /** Raw keydown state keyed by KeyboardEvent.code. */
    private readonly _keys: Record<string, boolean> = {};

    private readonly _onKeyDown: (e: KeyboardEvent) => void;
    private readonly _onKeyUp: (e: KeyboardEvent) => void;

    constructor() {
        this._onKeyDown = (e: KeyboardEvent) => { this._keys[e.code] = true; };
        this._onKeyUp = (e: KeyboardEvent) => { this._keys[e.code] = false; };

        window.addEventListener('keydown', this._onKeyDown);
        window.addEventListener('keyup', this._onKeyUp);
    }

    /** Returns true while the given key code is held down. */
    isDown(code: string): boolean {
        return this._keys[code] === true;
    }

    /**
     * Convenience: returns +1, 0, or -1 from two opposing key codes.
     * @param positiveCode  Key that produces +1 (e.g. 'KeyW')
     * @param negativeCode  Key that produces -1 (e.g. 'KeyS')
     */
    axis(positiveCode: string, negativeCode: string): number {
        return (this.isDown(positiveCode) ? 1 : 0) - (this.isDown(negativeCode) ? 1 : 0);
    }

    /** Remove event listeners. Call when tearing down the engine. */
    destroy(): void {
        window.removeEventListener('keydown', this._onKeyDown);
        window.removeEventListener('keyup', this._onKeyUp);
    }
}
