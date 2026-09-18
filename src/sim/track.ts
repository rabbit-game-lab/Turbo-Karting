import type { TrackDef } from '../data/content.ts'
import { CONFIG } from '../game.config.ts'
import { catmullRom, clamp, forwardDistance, lerp, signedWrap, wrap01 } from './math.ts'
import type { SurfaceType, Vec3 } from './types.ts'

export interface TrackSample { position: Vec3; tangentX: number; tangentZ: number; rightX: number; rightZ: number; t: number; halfWidth: number }
export interface TrackQuery extends TrackSample { lateral: number; wallHalfWidth: number; surface: SurfaceType }
export function createTrackQuery(): TrackQuery {
  return {position:{x:0,y:0,z:0},tangentX:0,tangentZ:1,rightX:-1,rightZ:0,t:0,halfWidth:8,lateral:0,wallHalfWidth:10,surface:'road'}
}

export class TrackCourse {
  readonly samples: TrackSample[] = []
  readonly length: number
  private readonly curveBefore=createTrackQuery()
  private readonly curveAfter=createTrackQuery()

  constructor(readonly def: TrackDef) {
    const count = CONFIG.performance.trackLookupSamples
    let length = 0
    let previous = this.point(0)
    for (let index = 0; index < count; index += 1) {
      const t = index / count
      const position = this.point(t)
      const next = this.point(t + 1 / count)
      const dx = next.x - position.x; const dz = next.z - position.z
      const magnitude = Math.hypot(dx, dz) || 1
      if (index > 0) length += Math.hypot(position.x - previous.x, position.y - previous.y, position.z - previous.z)
      this.samples.push({ position, tangentX: dx/magnitude, tangentZ: dz/magnitude, rightX: -dz/magnitude, rightZ: dx/magnitude, t, halfWidth: def.halfWidth })
      previous = position
    }
    length += Math.hypot(previous.x - this.samples[0].position.x, previous.y - this.samples[0].position.y, previous.z - this.samples[0].position.z)
    this.length = length
  }

  point(rawT: number): Vec3 {
    const points = this.def.controlPoints; const scaled = wrap01(rawT) * points.length
    const index = Math.floor(scaled); const t = scaled - index; const n = points.length
    const p0 = points[(index - 1 + n) % n]; const p1 = points[index % n]; const p2 = points[(index + 1) % n]; const p3 = points[(index + 2) % n]
    // Source splines stay readable in the registry; world scale puts every
    // lap in the specified 900–1400 metre range.
    const worldScale = 2.25
    return { x: catmullRom(p0[0],p1[0],p2[0],p3[0],t)*worldScale, y: catmullRom(p0[1],p1[1],p2[1],p3[1],t), z: catmullRom(p0[2],p1[2],p2[2],p3[2],t)*worldScale }
  }

  sample(rawT: number): TrackSample {
    return this.sampleInto(rawT,createTrackQuery())
  }

  sampleInto(rawT: number,out:TrackSample): TrackSample {
    const t = wrap01(rawT); const scaled = t * this.samples.length
    const index = Math.floor(scaled) % this.samples.length; const next = (index + 1) % this.samples.length; const mix = scaled - Math.floor(scaled)
    const a = this.samples[index]; const b = this.samples[next]
    let tx = lerp(a.tangentX,b.tangentX,mix); let tz = lerp(a.tangentZ,b.tangentZ,mix); const m = Math.hypot(tx,tz)||1; tx/=m; tz/=m
    out.position.x=lerp(a.position.x,b.position.x,mix);out.position.y=lerp(a.position.y,b.position.y,mix);out.position.z=lerp(a.position.z,b.position.z,mix)
    out.tangentX=tx;out.tangentZ=tz;out.rightX=-tz;out.rightZ=tx;out.t=t;out.halfWidth=this.def.halfWidth
    return out
  }

  closestT(position: Vec3, hintT?: number): number {
    const count = this.samples.length
    let best = hintT === undefined ? 0 : Math.round(wrap01(hintT) * count) % count
    let bestDistance = Number.POSITIVE_INFINITY
    const start = hintT === undefined ? 0 : best - 42; const span = hintT === undefined ? count : 85
    for (let step = 0; step < span; step += 1) {
      const index = (start + step + count) % count; const sample = this.samples[index]
      const distance = (position.x-sample.position.x)**2 + (position.z-sample.position.z)**2
      if (distance < bestDistance) { bestDistance = distance; best = index }
    }
    return best / count
  }

  query(position: Vec3, hintT?: number): TrackQuery {
    return this.queryInto(position,createTrackQuery(),hintT)
  }

  queryInto(position:Vec3,out:TrackQuery,hintT?:number):TrackQuery {
    const t = this.closestT(position, hintT); const sample = this.sampleInto(t,out)
    const lateral = (position.x-sample.position.x)*sample.rightX + (position.z-sample.position.z)*sample.rightZ
    const abs = Math.abs(lateral); const wallHalfWidth = sample.halfWidth * this.def.wallFactor
    const voided = this.def.voidRanges?.some(([from,to]) => forwardDistance(from,t) <= forwardDistance(from,to)) ?? false
    let surface: SurfaceType = voided&&abs<sample.halfWidth*.72 ? 'void' : abs <= sample.halfWidth ? 'road' : abs >= wallHalfWidth ? 'wall' : 'offroad'
    if (surface === 'road' && this.def.boostPads.some((pad) => Math.abs(signedWrap(t-pad)) < 0.006)) surface = 'boost'
    out.lateral=lateral;out.wallHalfWidth=wallHalfWidth;out.surface=surface
    return out
  }

  curvature(rawT: number): number {
    const before = this.sampleInto(rawT-0.012,this.curveBefore); const after = this.sampleInto(rawT+0.012,this.curveAfter)
    const cross = before.tangentX*after.tangentZ - before.tangentZ*after.tangentX
    const dot = clamp(before.tangentX*after.tangentX + before.tangentZ*after.tangentZ,-1,1)
    return Math.atan2(cross,dot)
  }
}
