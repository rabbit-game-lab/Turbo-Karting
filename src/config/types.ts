export interface DifficultyConfig {
  readonly topSpeedFactor: number
  readonly steeringAccuracy: number
  readonly reactionSeconds: number
  readonly rubberBand: number
  readonly itemDelay: number
}

export interface GameConfig {
  readonly graphics: {
    readonly sectorMetres: number
    readonly downgradeSeconds: number
    readonly upgradeSeconds: number
    readonly profiles: Readonly<Record<'low' | 'medium' | 'high', {
      readonly pixelRatio: number; readonly viewDistance: number; readonly detailDistance: number
      readonly particles: number; readonly shadows: boolean; readonly drawCalls: number
      readonly triangles: number; readonly vramMiB: number; readonly targetFps: number
    }>>
  }
  readonly race: {
    readonly laps: number
    readonly countdownSeconds: number
    readonly postFinishSeconds: number
    readonly checkpointCount: number
    readonly itemBoxRespawnSeconds: number
    readonly rouletteSeconds: number
  }
  readonly handling: {
    readonly mediumTopSpeed: number
    readonly acceleration: number
    readonly brakePower: number
    readonly reverseSpeed: number
    readonly steerRate: number
    readonly driftSteerRate: number
    readonly driftSlipRadians: number
    readonly hopVelocity: number
    readonly gravity: number
    readonly offroadFactor: number
    readonly wallSpeedRetention: number
    readonly kartRadius: number
    readonly driftThresholds: readonly [number, number, number]
    readonly driftBoostDurations: readonly [number, number, number]
    readonly driftBoostStrength: number
    readonly padBoostStrength: number
    readonly padBoostSeconds: number
  }
  readonly camera: {
    readonly distance: number
    readonly height: number
    readonly lookAhead: number
    readonly fovMin: number
    readonly fovMax: number
    readonly smoothing: number
  }
  readonly controls: {
    readonly keyboardSteerRise: number
    readonly keyboardSteerFall: number
    readonly gamepadDeadZone: number
    readonly touchSize: number
  }
  readonly difficulty: Readonly<Record<'easy' | 'normal' | 'hard', DifficultyConfig>>
  readonly items: {
    readonly boostStrength: number
    readonly boostSeconds: number
    readonly starSeconds: number
    readonly lightningSeconds: number
    readonly bombFuseSeconds: number
    readonly bombRadius: number
  }
  readonly effects: {
    readonly particles: boolean
    readonly postFx: boolean
    readonly cameraShake: number
  }
  readonly audio: {
    readonly musicVolume: number
    readonly sfxVolume: number
    readonly engineVolume: number
  }
  readonly performance: {
    readonly trackSegments: number
    readonly trackLookupSamples: number
    readonly hazardPool: number
    readonly particlePool: number
    readonly maxCatchUpSteps: number
  }
}

export function defineGameConfig<const T extends GameConfig>(config: T): T {
  return config
}
