import type { RacerId, TrackId } from './content.ts'

export type QualityLevel = 'low' | 'medium' | 'high'
export type QualityChoice = 'auto' | QualityLevel
export type ProceduralMeshId = 'rounded' | 'sphere' | 'cone' | 'cylinder' | 'rock' | 'quad'
export type MaterialId = 'paint' | 'rubber' | 'fur' | 'foliage' | 'stone' | 'road' | 'glow' | 'shadow'
export interface RacerVisualDef { fur: string; ears: number; width: number; accessory: 'goggles' | 'cap' | 'bow'; number: number }
export interface TrackVisualDef {
  sky: string; horizon: string; ambient: string; sun: string; sunIntensity: number
  road: string; shoulder: string; foliage: string; landmark: readonly [number, number, number]
}
export interface EffectDef { color: string; size: number; life: number; gravity: number; count: number }

export const RACER_VISUALS: Record<RacerId, RacerVisualDef> = {
  pip: { fur: '#fff0d9', ears: 1.12, width: .91, accessory: 'goggles', number: 1 },
  clover: { fur: '#e5c39c', ears: .95, width: .96, accessory: 'cap', number: 2 },
  tansy: { fur: '#f5e5ef', ears: 1.2, width: .9, accessory: 'bow', number: 3 },
  juniper: { fur: '#c4a17e', ears: 1.03, width: 1, accessory: 'goggles', number: 4 },
  hazel: { fur: '#f6d7af', ears: .9, width: 1.02, accessory: 'bow', number: 5 },
  bramble: { fur: '#c5c1d4', ears: 1.14, width: .98, accessory: 'cap', number: 6 },
  bruno: { fur: '#ad8365', ears: .88, width: 1.13, accessory: 'goggles', number: 7 },
  rosie: { fur: '#f1d9c9', ears: 1.02, width: 1.1, accessory: 'bow', number: 8 },
}

export const TRACK_VISUALS: Record<TrackId, TrackVisualDef> = {
  'meadow-mile': { sky: '#53bde5', horizon: '#e0f5d5', ambient: '#9fb8bb', sun: '#fff0cb', sunIntensity: 1.65, road: '#65737d', shoulder: '#9cc967', foliage: '#3e9872', landmark: [.12, .43, .76] },
  'carrot-canyon': { sky: '#65b8dc', horizon: '#ffdda7', ambient: '#b9a0a2', sun: '#ffdda2', sunIntensity: 1.8, road: '#78676a', shoulder: '#d29b62', foliage: '#468a74', landmark: [.17, .47, .8] },
  'frostburrow-falls': { sky: '#739ccf', horizon: '#e8f7ff', ambient: '#a7bfda', sun: '#fff3e7', sunIntensity: 1.4, road: '#738ca5', shoulder: '#e3eff1', foliage: '#477c87', landmark: [.18, .46, .8] },
  'neon-warren': { sky: '#17244b', horizon: '#65749a', ambient: '#8098bb', sun: '#b0d3ff', sunIntensity: 1.1, road: '#455575', shoulder: '#343d65', foliage: '#314772', landmark: [.14, .48, .78] },
}

export const EFFECTS = {
  drift: { color: '#65dfff', size: .12, life: .42, gravity: 3, count: 6 },
  driftGold: { color: '#ffe066', size: .15, life: .5, gravity: 2, count: 7 },
  driftPink: { color: '#ff73c5', size: .18, life: .6, gravity: 2, count: 8 },
  boost: { color: '#ffb94e', size: .25, life: .35, gravity: -1, count: 12 },
  pickup: { color: '#7df3ec', size: .16, life: .8, gravity: 2, count: 18 },
  hit: { color: '#fff3c1', size: .18, life: .6, gravity: 6, count: 14 },
  explosion: { color: '#ff854f', size: .45, life: .85, gravity: 2, count: 28 },
  lightning: { color: '#c6edff', size: .25, life: .5, gravity: -3, count: 24 },
  confetti: { color: '#ff74ae', size: .16, life: 2.2, gravity: 2, count: 50 },
  smoke: { color: '#d0dce2', size: .3, life: .65, gravity: -1, count: 3 },
  dust: { color: '#d9b58b', size: .36, life: .8, gravity: -.5, count: 4 },
} as const satisfies Record<string, EffectDef>
export type EffectId = keyof typeof EFFECTS
