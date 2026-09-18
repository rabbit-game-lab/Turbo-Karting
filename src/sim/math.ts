import type { Vec3 } from './types.ts'

export const TAU = Math.PI * 2
export const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value))
export const clamp01 = (value: number): number => clamp(value, 0, 1)
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t
export const wrap01 = (value: number): number => ((value % 1) + 1) % 1
export const forwardDistance = (from: number, to: number): number => wrap01(to - from)
export const signedWrap = (value: number): number => ((value + 0.5) % 1 + 1) % 1 - 0.5
export const angleDelta = (from: number, to: number): number => Math.atan2(Math.sin(to - from), Math.cos(to - from))
export const damp = (current: number, target: number, lambda: number, dt: number): number => lerp(current, target, 1 - Math.exp(-lambda * dt))
export const distanceSq = (a: Vec3, b: Vec3): number => (a.x-b.x)**2 + (a.y-b.y)**2 + (a.z-b.z)**2
export const copyVec = (source: Vec3): Vec3 => ({ x: source.x, y: source.y, z: source.z })

export function hashString(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) hash = Math.imul(hash ^ value.charCodeAt(index), 16777619)
  return hash >>> 0
}

export class SeededRandom {
  private state: number
  constructor(seed: number) { this.state = seed >>> 0 || 0x9e3779b9 }
  next(): number {
    let value = this.state
    value ^= value << 13; value ^= value >>> 17; value ^= value << 5
    this.state = value >>> 0
    return this.state / 0x1_0000_0000
  }
  range(min: number, max: number): number { return min + (max - min) * this.next() }
}

export function catmullRom(a: number, b: number, c: number, d: number, t: number): number {
  const t2 = t * t; const t3 = t2 * t
  return 0.5 * ((2*b) + (-a+c)*t + (2*a-5*b+4*c-d)*t2 + (-a+3*b-3*c+d)*t3)
}
