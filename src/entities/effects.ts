import * as pc from 'playcanvas'
import { EFFECTS, type EffectId } from '../data/visuals.ts'
import { CONFIG } from '../game.config.ts'
import { SeededRandom } from '../sim/math.ts'
import type { EffectCue, KartState, Vec3 } from '../sim/types.ts'
import { InstanceBatch } from './instances.ts'
import type { ProceduralResources } from './resources.ts'

interface Particle { x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number; max: number; effect: EffectId }

export class EffectPool {
  private readonly particles: Particle[] = []
  private readonly batches = new Map<EffectId, InstanceBatch>()
  private readonly rng = new SeededRandom(1234)
  private readonly origin = { x: 0, y: 0, z: 0 }
  private cursor = 0
  private emission = 0
  limit = CONFIG.performance.particlePool as number

  constructor(parent: pc.Entity, resources: ProceduralResources, _batchId: number) {
    for (let i = 0; i < CONFIG.performance.particlePool; i++) this.particles.push({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0, max: 1, effect: 'drift' })
    for (const id of Object.keys(EFFECTS) as EffectId[]) {
      const def = EFFECTS[id]
      this.batches.set(id, new InstanceBatch(parent, resources.device, resources.mesh(id === 'smoke' || id === 'dust' ? 'sphere' : 'rounded'), resources.material(def.color, id === 'smoke' || id === 'dust' ? 0 : .8), CONFIG.performance.particlePool))
    }
  }

  burst(effect: EffectCue | EffectId, position: Vec3): void {
    if (!CONFIG.effects.particles) return
    const def = EFFECTS[effect]
    for (let i = 0; i < def.count; i++) {
      const p = this.particles[this.cursor++ % this.limit], angle = this.rng.range(0, Math.PI * 2)
      const speed = effect === 'confetti' ? 4 : effect === 'explosion' ? 6 : 2
      p.x = position.x; p.y = position.y + .3; p.z = position.z
      p.vx = Math.cos(angle) * speed; p.vz = Math.sin(angle) * speed; p.vy = this.rng.range(.5, 3.5)
      p.life = p.max = def.life * this.rng.range(.7, 1.3); p.effect = effect
    }
  }

  update(dt: number, player: KartState | undefined): void {
    this.emission += dt
    if (player && this.emission >= .04 && Math.abs(player.speed) > 5) {
      this.emission = 0
      this.origin.x = player.position.x + Math.sin(player.heading) * 1.3
      this.origin.y = player.position.y; this.origin.z = player.position.z + Math.cos(player.heading) * 1.3
      if (player.boostTimer > 0) this.burst('boost', this.origin)
      else if (player.driftDirection) this.burst(player.driftStage === 3 ? 'driftPink' : player.driftStage === 2 ? 'driftGold' : 'drift', this.origin)
      else if (player.surface === 'offroad') this.burst('dust', this.origin)
    }
    for (const batch of this.batches.values()) batch.clear()
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i]
      if (p.life <= 0) continue
      p.life -= dt
      if (i >= this.limit || p.life <= 0) { p.life = 0; continue }
      const def = EFFECTS[p.effect]
      p.vy -= def.gravity * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt
      const scale = def.size * Math.min(1, p.life / p.max * 2)
      this.batches.get(p.effect)!.add(p.x, p.y, p.z, scale, p.effect === 'confetti' ? scale * 2 : scale, p.effect === 'boost' ? scale * 3 : scale, p.life * 180)
    }
    for (const batch of this.batches.values()) batch.upload()
  }
  destroy(): void { for (const batch of this.batches.values()) batch.destroy() }
}
