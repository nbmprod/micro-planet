import { Script, Vec3, Color, StandardMaterial, Entity, CULLFACE_FRONT, BLEND_NORMAL } from 'playcanvas';

const _tmpNormal = new Vec3();

function hexColor(hex) {
    return new Color(((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255);
}

// Land/water "continents" as dot-product zones on the unit sphere — ported
// from the Three.js prototype's fallback shape (src/config/GameConfig.ts
// `planet.landZones`, the earth-mask-image path wasn't ported — this fallback
// was already good enough to gate movement). Purely for movement gating; the
// visual layers below are solid-colored per shell rather than per-vertex
// painted continents — swap in a real material/heightmap later in the Editor
// if the look needs to match land shape.
const LAND_ZONES = [
    { center: new Vec3(0.34, 0.82, 0.20).normalize(), threshold: 0.78 },
    { center: new Vec3(-0.60, -0.25, -0.75).normalize(), threshold: 0.75 },
    { center: new Vec3(0.30, -0.70, 0.65).normalize(), threshold: 0.76 },
    { center: new Vec3(-0.82, 0.30, 0.47).normalize(), threshold: 0.74 },
    { center: new Vec3(0.00, 0.95, 0.00).normalize(), threshold: 0.7 },
];

/**
 * Builds the layered planet (terrain / ocean / atmosphere) as child entities
 * and answers land-vs-water queries for PlayerController. Attach to an empty
 * entity positioned at the world origin.
 */
export class Planet extends Script {
    static scriptName = 'planet';

    /**
     * Radius of the planet, in world units.
     * @attribute
     * @range [1, 100]
     */
    radius = 10;

    /** @attribute */
    landColor = hexColor(0x2d7d3a);

    /** @attribute */
    waterColor = hexColor(0x1a5fa8);

    /** @attribute */
    atmosphereColor = hexColor(0x60aaff);

    /**
     * @attribute
     * @range [0, 1]
     */
    atmosphereOpacity = 0.08;

    /**
     * @attribute
     * @range [0, 1]
     */
    oceanOpacity = 0.88;

    initialize() {
        this._buildLayer('Terrain', this.radius, this.landColor, 1, false);
        this._buildLayer('Ocean', this.radius * 0.97, this.waterColor, this.oceanOpacity, false);
        this._buildLayer('Atmosphere', this.radius * 1.08, this.atmosphereColor, this.atmosphereOpacity, true);
    }

    _buildLayer(name, radius, color, opacity, backfaceOnly) {
        const layer = new Entity(name, this.app);

        const material = new StandardMaterial();
        material.diffuse = color;
        material.opacity = opacity;
        if (opacity < 1) {
            material.blendType = BLEND_NORMAL;
            material.depthWrite = false;
        }
        if (backfaceOnly) {
            // Render only the inside of the shell, like Three's BackSide — gives
            // the soft atmosphere-glow-from-within look without occluding the planet.
            material.cull = CULLFACE_FRONT;
        }
        material.update();

        layer.addComponent('render', { type: 'sphere', material });

        // Built-in sphere primitive has radius 0.5 (diameter 1) at scale 1.
        const scale = radius * 2;
        layer.setLocalScale(scale, scale, scale);

        this.entity.addChild(layer);
        return layer;
    }

    /** @param {Vec3} point - world-space point (direction from planet center is what matters). */
    isPointOnLand(point) {
        _tmpNormal.copy(point).normalize();
        for (const zone of LAND_ZONES) {
            if (zone.center.dot(_tmpNormal) >= zone.threshold) {
                return true;
            }
        }
        return false;
    }
}
