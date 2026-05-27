export const GameConfig = {
  planet: {
    radius: 10,
    terrainSegments: 64,
    oceanSegments: 48,
    atmosphereSegments: 32,
    wireframeSegments: 24,
    oceanRadiusScale: 0.97,
    atmosphereRadiusScale: 1.08,
    wireframeRadiusOffset: 0.02,
    landColor: 0x2d7d3a,
    waterColor: 0x1a5fa8,
    oceanColor: 0x1a5fa8,
    atmosphereColor: 0x60aaff,
    atmosphereOpacity: 0.08,
    wireframeColor: 0x3aff8a,
    wireframeOpacity: 0.06,
    terrainRoughness: 0.85,
    terrainMetalness: 0.05,
    oceanRoughness: 1,
    oceanMetalness: 0.3,
    oceanOpacity: 0.88,
    earthMaskUrl: '/assets/earth-land-mask.png',
    // Deprecated: landZones is kept as a fallback until the earth mask loads.
    landZones: [
      { center: [0.34, 0.82, 0.20] as const, threshold: 0.78 },
      { center: [-0.60, -0.25, -0.75] as const, threshold: 0.75 },
      { center: [0.30, -0.70, 0.65] as const, threshold: 0.76 },
      { center: [-0.82, 0.30, 0.47] as const, threshold: 0.74 },
      { center: [0.00, 0.95, 0.00] as const, threshold: 0.7 },
    ] as const,
  },

  environment: {
    sunColor: 0xfff4d6,
    sunIntensity: 2.0,
    backSunIntensity: 1.2,
    sunPosition: [30, 40, 20] as const,
    backSunPosition: [-30, -40, -20] as const,
    hemiSkyColor: 0xddf0ff,
    hemiGroundColor: 0x2d4d2a,
    hemiIntensity: 0.8,
    ambientColor: 0xffffff,
    ambientIntensity: 0.5,
    starCount: 4000,
    starSize: 0.35,
  },

  player: {
    height: 0.35 / 3,
    bodyDimensions: {
      x: 0.5 / 3,
      y: 0.6 / 3,
      z: 0.3 / 3,
    },
    headRadius: 0.22 / 3,
    headOffsetY: 0.72 / 3,
    eyeRadius: 0.055 / 3,
    eyeOffsetX: 0.1 / 3,
    eyeOffsetY: 0.74 / 3,
    eyeOffsetZ: 0.19 / 3,
    moveSpeed: 0.005,
    swimSpeedFactor: 0.70,
    collisionRadius: 0.32 / 3,
    jumpImpulse: 0.02,
    gravity: 0.001,
    startLatitudeDeg: 55,
    startLongitudeDeg: 37,
    enableSwimming: true,
    modelUrl: '',
    modelTargetHeight: 0.5,
    modelRotationY: 30,
    movementBoneSwing: 0.28,
    movementBoneBend: 0.18,
  },

  camera: {
    distance: 1.5,
    height: 1.5,
    lerp: 0.1,
  },

  // Networking configuration for multiplayer
  network: {
    // WebSocket server URL (use VITE_WS_URL env to override at build time)
    serverUrl: ((import.meta as any).env?.VITE_WS_URL as string) || 'ws://localhost:5173',
    // How often to send position updates (ms)
    syncIntervalMs: 100,
    // Interpolation factor for remote players (0..1)
    interpolationFactor: 0.15,
    // Enable multiplayer at runtime
    enableMultiplayer: true,
  },

  // Palette of colors to assign to players. Chosen randomly for now.
  playerColors: [
    0xff6b6b, // red
    0x4ecdc4, // teal
    0x457bd1, // blue
    0xffa07a, // light salmon
    0xffd166, // yellow
    0x9b5de5, // purple
  ] as const,

  // Spawn zones (lat, lon) to pick initial positions for new players
  spawnZones: [
    { latDeg: 55, lonDeg: 37 },
    { latDeg: -55, lonDeg: -37 },
    { latDeg: 0, lonDeg: 90 },
    { latDeg: 0, lonDeg: -90 },
  ] as const,

  decoration: {
    treeColliderRadius: 0.55 / 1,
    rockColliderRadius: 0.32 / 1,
    treeTrunk: {
      topRadius: 0.06 / 1,
      bottomRadius: 0.09 / 1,
      height: 0.6 / 1,
    },
    foliage: {
      radius: 0.35 / 1,
      height: 0.9 / 1,
    },
    rockRadius: {
      base: 0.22 / 1,
      variance: 0.15 / 1,
    },
    treeColor: 0x6b3c11,
    foliageColor: 0x1a7a2a,
    rockColor: 0x888888,
    data: [
      { latDeg: 20, lonDeg: 30, type: 'tree' },
      { latDeg: 45, lonDeg: -60, type: 'tree' },
      { latDeg: -30, lonDeg: 90, type: 'tree' },
      { latDeg: 10, lonDeg: 150, type: 'tree' },
      { latDeg: -50, lonDeg: -20, type: 'tree' },
      { latDeg: 60, lonDeg: 200, type: 'tree' },
      { latDeg: -10, lonDeg: -130, type: 'tree' },
      { latDeg: 35, lonDeg: 80, type: 'rock' },
      { latDeg: -45, lonDeg: 45, type: 'rock' },
      { latDeg: 70, lonDeg: -90, type: 'rock' },
      { latDeg: -70, lonDeg: 150, type: 'rock' },
      { latDeg: 0, lonDeg: -60, type: 'tree' },
      { latDeg: 25, lonDeg: 260, type: 'tree' },
      { latDeg: -20, lonDeg: 200, type: 'rock' },
      { latDeg: 50, lonDeg: 310, type: 'tree' },
      { latDeg: -60, lonDeg: -100, type: 'tree' },
      { latDeg: 80, lonDeg: 50, type: 'rock' },
      { latDeg: -10, lonDeg: 300, type: 'tree' },
      { latDeg: 82, lonDeg: -80, type: 'tree' },
    ] as const,
  },

  penguin: {
    walkSpeed: 0.005,
    patrolChangeInterval: 300,
    patrolRotationSpeed: 0.02,
  },
} as const;
