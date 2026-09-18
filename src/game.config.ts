import { defineGameConfig, type GameConfig } from './config/types.ts'

/**
 * HARELINE RALLY CONFIG
 * Player-facing tuning lives here. Units are metres, seconds, radians, and
 * 0..1 factors unless named otherwise. Safe ranges and interactions are in
 * docs/game-config.md; registry content lives in src/data/content.ts.
 */
export const CONFIG = defineGameConfig({
  graphics: {
    sectorMetres: 60,
    downgradeSeconds: 3,
    upgradeSeconds: 15,
    profiles: {
      low: { pixelRatio: 1, viewDistance: 165, detailDistance: 45, particles: 96, shadows: false, drawCalls: 90, triangles: 120000, vramMiB: 96, targetFps: 30 },
      medium: { pixelRatio: 1.25, viewDistance: 230, detailDistance: 75, particles: 160, shadows: false, drawCalls: 120, triangles: 200000, vramMiB: 128, targetFps: 60 },
      high: { pixelRatio: 1.5, viewDistance: 310, detailDistance: 110, particles: 256, shadows: true, drawCalls: 160, triangles: 350000, vramMiB: 192, targetFps: 60 },
    },
  },
  race: {
    laps: 3,
    countdownSeconds: 3,
    postFinishSeconds: 12,
    checkpointCount: 12,
    itemBoxRespawnSeconds: 3,
    rouletteSeconds: 1.35,
  },
  handling: {
    mediumTopSpeed: 22,
    acceleration: 8.8,
    brakePower: 15,
    reverseSpeed: 6,
    steerRate: 1.7,
    driftSteerRate: 1.45,
    driftSlipRadians: 0.42,
    hopVelocity: 4.6,
    gravity: 26,
    offroadFactor: 0.55,
    wallSpeedRetention: 0.64,
    kartRadius: 0.85,
    driftThresholds: [0.62, 1.28, 2.05],
    driftBoostDurations: [0.7, 1.2, 1.8],
    driftBoostStrength: 0.4,
    padBoostStrength: 0.45,
    padBoostSeconds: 1.3,
  },
  camera: {
    distance: 7.8,
    height: 3.8,
    lookAhead: 3.8,
    fovMin: 70,
    fovMax: 82,
    smoothing: 7.5,
  },
  controls: {
    keyboardSteerRise: 9,
    keyboardSteerFall: 13,
    gamepadDeadZone: 0.15,
    touchSize: 136,
  },
  difficulty: {
    easy: { topSpeedFactor: 0.92, steeringAccuracy: 0.78, reactionSeconds: 0.32, rubberBand: 0.08, itemDelay: 1.2 },
    normal: { topSpeedFactor: 0.98, steeringAccuracy: 0.9, reactionSeconds: 0.18, rubberBand: 0.12, itemDelay: 0.75 },
    hard: { topSpeedFactor: 1.035, steeringAccuracy: 0.98, reactionSeconds: 0.08, rubberBand: 0.16, itemDelay: 0.4 },
  },
  items: {
    boostStrength: 0.55,
    boostSeconds: 1.5,
    starSeconds: 6,
    lightningSeconds: 2.6,
    bombFuseSeconds: 2.2,
    bombRadius: 5.5,
  },
  effects: {
    particles: true,
    postFx: true,
    cameraShake: 0.7,
  },
  audio: {
    musicVolume: 0.36,
    sfxVolume: 0.62,
    engineVolume: 0.18,
  },
  performance: {
    trackSegments: 360,
    trackLookupSamples: 1536,
    hazardPool: 48,
    particlePool: 256,
    maxCatchUpSteps: 8,
  },
} as const satisfies GameConfig)
