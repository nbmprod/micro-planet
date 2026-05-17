import * as THREE from 'three';
import { GameState } from './GameState';
import { InputManager } from './InputManager';
import { Environment } from '../world/Environment';
import { Planet } from '../world/Planet';
import { DecorationManager } from '../world/DecorationManager';
import { Player } from '../entities/Player';
/**
 * GameEngine — the top-level orchestrator.
 *
 * Responsibilities:
 *  - Create and own the WebGLRenderer, Scene, and PerspectiveCamera.
 *  - Instantiate all subsystems in correct dependency order.
 *  - Run the requestAnimationFrame loop, calling update() on each subsystem.
 *  - Handle window resize events.
 *
 * Dependency graph (no cycles):
 *   GameState  ←  Player, HUDUpdater
 *   InputManager ← Player
 *   Scene      ← Environment, Planet, DecorationManager, Player
 *   Camera     ← Player (camera follow logic lives in Player)
 *
 * FUTURE_HOOK: Add a SceneManager for level/biome transitions.
 * FUTURE_HOOK: Add a NetworkManager and pass it to GameState for multiplayer.
 * FUTURE_HOOK: Integrate a postprocessing EffectComposer pass here.
 */
export class GameEngine {
    // ── Three.js core ──────────────────────────────────────
    renderer;
    scene;
    camera;
    // ── Subsystems ─────────────────────────────────────────
    state;
    input;
    environment;
    planet;
    decorations;
    player;
    // ── Internal ───────────────────────────────────────────
    _rafId = 0;
    _time = 0;
    // ── HUD element refs ───────────────────────────────────
    _elCoords;
    _elAltitude;
    constructor(canvas) {
        // ── Renderer ─────────────────────────────────────────
        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        // ── Scene ─────────────────────────────────────────────
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x020818);
        this.scene.fog = new THREE.FogExp2(0x020818, 0.018);
        // ── Camera ────────────────────────────────────────────
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 300);
        // Initial camera placement — will be overridden by Player.updateCamera()
        this.camera.position.set(0, 12, 15);
        this.camera.lookAt(0, 10, 0);
        // ── Shared State & Input ──────────────────────────────
        this.state = new GameState();
        this.input = new InputManager();
        // ── World subsystems (order matters: env before planet) ─
        this.environment = new Environment(this.scene);
        this.planet = new Planet(this.scene);
        this.decorations = new DecorationManager(this.scene);
        // ── Player (receives scene for group attachment, input, state, camera) ─
        this.player = new Player(this.scene, this.camera, this.state, this.input);
        // ── HUD references ────────────────────────────────────
        this._elCoords = document.getElementById('stat-coords');
        this._elAltitude = document.getElementById('stat-altitude');
        // ── Resize handler ────────────────────────────────────
        window.addEventListener('resize', this._onResize);
    }
    // ── Main loop ─────────────────────────────────────────────
    start() {
        this._tick();
    }
    _tick = () => {
        this._rafId = requestAnimationFrame(this._tick);
        this._time += 0.003;
        // Each subsystem updates in dependency order:
        //   1. Input state is already live (event-driven).
        //   2. Player reads input → mutates GameState → moves Three.js group.
        //   3. Planet rotates slightly for visual feel.
        //   4. Camera follows player.
        //   5. HUD reflects GameState values.
        this.planet.update(this._time);
        this.player.update(); // physics + quaternion math + camera
        this._updateHUD();
        this.renderer.render(this.scene, this.camera);
    };
    // ── HUD update ────────────────────────────────────────────
    _updateHUD() {
        const s = this.state;
        this._elCoords.textContent =
            `lat: ${s.latitudeDeg.toFixed(1)}°  lon: ${s.longitudeDeg.toFixed(1)}°`;
        this._elAltitude.textContent = `alt: ${s.altitude.toFixed(2)}`;
        // FUTURE_HOOK: Update pollution bar, oxygen meter, score display here.
        // e.g. document.getElementById('stat-pollution')!.textContent =
        //        `pollution: ${(s.pollutionLevel * 100).toFixed(0)}%`;
    }
    // ── Resize ────────────────────────────────────────────────
    _onResize = () => {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    };
    /** Stop the loop and release all resources. */
    destroy() {
        cancelAnimationFrame(this._rafId);
        this.input.destroy();
        window.removeEventListener('resize', this._onResize);
        this.renderer.dispose();
    }
}
//# sourceMappingURL=GameEngine.js.map