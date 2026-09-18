import type { Difficulty, ItemId, RacerId, TrackId } from '../data/content.ts'

export interface Vec3 { x: number; y: number; z: number }
export type GamePhase = 'title' | 'racerSelect' | 'trackSelect' | 'loading' | 'countdown' | 'racing' | 'finished' | 'results'
export type SurfaceType = 'road' | 'boost' | 'offroad' | 'wall' | 'void'

export interface RaceInputSnapshot {
  throttle: number
  brake: number
  steer: number
  drift: boolean
  useItem: boolean
  lookBack: boolean
}

export interface RaceSettings { racerId: RacerId; trackId: TrackId; difficulty: Difficulty; seed: number }

export interface KartState {
  id: number
  racerId: RacerId
  isPlayer: boolean
  position: Vec3
  heading: number
  speed: number
  verticalSpeed: number
  trackT: number
  lastTrackT: number
  lateral: number
  surface: SurfaceType
  lap: number
  nextCheckpoint: number
  place: number
  finished: boolean
  finishTime: number
  wrongWay: boolean
  raceProgress: number
  driftDirection: -1 | 0 | 1
  driftHeldLast: boolean
  driftCharge: number
  driftStage: 0 | 1 | 2 | 3
  hopTimer: number
  airborne: boolean
  boostTimer: number
  boostStrength: number
  spinTimer: number
  frozenTimer: number
  invulnerableTimer: number
  padCooldown: number
  item: ItemId | null
  itemCount: number
  rouletteTimer: number
  goldenTimer: number
  stuckTimer: number
}

export interface ItemBoxState { active: boolean; t: number; lateral: number; respawnTimer: number; spin: number }
export type HazardKind = 'berry-slick' | 'acorn-bolt' | 'beet-seeker' | 'crown-comet' | 'burrow-bomb'
export interface HazardState {
  active: boolean
  kind: HazardKind
  ownerId: number
  targetId: number
  position: Vec3
  heading: number
  speed: number
  verticalSpeed: number
  trackT: number
  lateral: number
  age: number
  life: number
  bounces: number
}

export type SimEvent =
  | { type: 'sound'; cue: SoundCue; kartId?: number }
  | { type: 'burst'; effect: EffectCue; position: Vec3; color?: string }
  | { type: 'shake'; strength: number }
  | { type: 'banner'; text: string }
  | { type: 'finish'; kartId: number }

export type SoundCue = 'menu' | 'countdown' | 'go' | 'drift' | 'boost' | 'item' | 'pickup' | 'hit' | 'lap' | 'finish' | 'select'
export type EffectCue = 'drift' | 'boost' | 'pickup' | 'hit' | 'explosion' | 'lightning' | 'confetti'

export interface Standing { kartId: number; racerId: RacerId; place: number; finished: boolean; time: number }
export interface HudSnapshot {
  phase: GamePhase
  selectedRacerId: RacerId
  selectedTrackId: TrackId
  difficulty: Difficulty
  lap: number
  totalLaps: number
  place: number
  speedKph: number
  raceTime: number
  countdown: number
  item: ItemId | null
  itemCount: number
  roulette: boolean
  driftStage: number
  wrongWay: boolean
  bestTime: number | null
  standings: readonly Standing[]
  karts: readonly KartState[]
}

export const EMPTY_INPUT: RaceInputSnapshot = { throttle: 0, brake: 0, steer: 0, drift: false, useItem: false, lookBack: false }
