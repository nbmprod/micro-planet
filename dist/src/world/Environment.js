import * as THREE from 'three';
/**
 * Environment — scene-wide lighting, fog, and the procedural starfield.
 *
 * Owned objects are added to the provided scene on construction and are
 * never mutated by other subsystems (read-only after init).
 *
 * FUTURE_HOOK: Drive sun direction from a real-time day/night cycle clock.
 *              e.g. sun.position.setFromSphericalCoords(50, declination, azimuth)
 * FUTURE_HOOK: Lerp ambient + fog colour toward pollution tint when
 *              GameState.pollutionLevel rises (brownish haze).
 * FUTURE_HOOK: Replace static stars with a dynamic nebula skybox texture.
 */
export class Environment {
    _sun;
    _backSun; // Added secondary light
    _ambient;
    _hemiLight; // Added ground/sky bounce
    constructor(scene) {
        // ── Main Sunlight (Casts Shadows) ────────────────────
        this._sun = new THREE.DirectionalLight(0xfff4d6, 2.0); // Balanced intensity
        this._sun.position.set(30, 40, 20);
        this._sun.castShadow = true;
        this._sun.shadow.mapSize.set(2048, 2048);
        this._sun.shadow.camera.near = 0.5;
        this._sun.shadow.camera.far = 120;
        this._sun.shadow.camera.left = this._sun.shadow.camera.bottom = -30;
        this._sun.shadow.camera.right = this._sun.shadow.camera.top = 30;
        scene.add(this._sun);
        // ── Back Sunlight (Fills the Dark Side) ───────────────
        // Placed exactly opposite to the main sun so no part of the planet is dark
        this._backSun = new THREE.DirectionalLight(0xfff4d6, 1.2);
        this._backSun.position.set(-30, -40, -20);
        this._backSun.castShadow = false; // Disable to keep performance high
        scene.add(this._backSun);
        // ── Hemisphere Light (Soft Sky/Ground Glow) ───────────
        // Provides a natural Animal Crossing look by bouncing blue light from above
        // and green/earth tones from below.
        this._hemiLight = new THREE.HemisphereLight(0xddf0ff, 0x2d4d2a, 0.8);
        scene.add(this._hemiLight);
        // ── Ambient Fill ─────────────────────────────────────
        // Raised ambient level slightly to keep everything bright and crisp
        this._ambient = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(this._ambient);
        // ── Star field ────────────────────────────────────────
        scene.add(this._buildStarfield());
    }
    /**
     * Builds a Points mesh of ~4000 coloured stars distributed uniformly
     * on a large sphere around the scene.
     *
     * Uses the spherical coordinate method (theta/phi) for even distribution.
     */
    _buildStarfield() {
        const COUNT = 4000;
        const geo = new THREE.BufferGeometry();
        const pos = new Float32Array(COUNT * 3);
        const col = new Float32Array(COUNT * 3);
        const palette = [
            [1.0, 0.9, 0.8], // warm white
            [0.8, 0.9, 1.0], // cool blue
            [1.0, 1.0, 1.0], // pure white
            [1.0, 0.7, 0.6], // orange dwarf
            [0.7, 0.8, 1.0], // blue giant
        ];
        for (let i = 0; i < COUNT; i++) {
            const r = 200 + Math.random() * 100;
            const theta = Math.acos(2 * Math.random() - 1);
            const phi = Math.random() * Math.PI * 2;
            pos[i * 3] = r * Math.sin(theta) * Math.cos(phi);
            pos[i * 3 + 1] = r * Math.sin(theta) * Math.sin(phi);
            pos[i * 3 + 2] = r * Math.cos(theta);
            const c = palette[Math.floor(Math.random() * palette.length)];
            col[i * 3] = c[0];
            col[i * 3 + 1] = c[1];
            col[i * 3 + 2] = c[2];
        }
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
        const mat = new THREE.PointsMaterial({
            size: 0.35,
            vertexColors: true,
            sizeAttenuation: true,
        });
        return new THREE.Points(geo, mat);
    }
}
//# sourceMappingURL=Environment.js.map