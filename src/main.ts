import { GameEngine } from './core/GameEngine';

/**
 * main.ts — application entry point.
 *
 * Responsibilities:
 *  1. Locate the canvas element from the DOM.
 *  2. Instantiate GameEngine, passing the canvas so it can initialise
 *     the WebGLRenderer without creating a new element.
 *  3. Start the RAF loop.
 *
 * Keeping this file thin means all boot logic lives in GameEngine,
 * making it easy to wrap the engine in a test harness or swap boot
 * sequences (e.g. show a loading screen before calling engine.start()).
 *
 * FUTURE_HOOK: Add an async preloader here that fetches level JSON,
 *              texture atlases, and audio files before calling start().
 * FUTURE_HOOK: Add error boundary / crash reporter around engine.start().
 */

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
if (!canvas) {
    throw new Error('[main] <canvas id="game-canvas"> not found in the DOM.');
}

const engine = new GameEngine(canvas);
engine.start();

// Expose engine on window for debugging in the browser console.
// FUTURE_HOOK: Remove or guard behind an environment flag for production.
(window as unknown as Record<string, unknown>)['__microPlanet'] = engine;
