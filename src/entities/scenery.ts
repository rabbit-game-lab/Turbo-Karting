import * as pc from 'playcanvas'
import type { TrackCourse } from '../sim/track.ts'
import { SeededRandom } from '../sim/math.ts'
import { TRACK_VISUALS, type ProceduralMeshId } from '../data/visuals.ts'
import type { TrackId } from '../data/content.ts'
import { InstanceBatch } from './instances.ts'
import { ProceduralResources, shape } from './resources.ts'

interface Prop { kind: number; x: number; y: number; z: number; scale: number; yaw: number; detail: number }

/** Repeated scenery is compact data, not thousands of scene-graph nodes. */
export class Scenery {
  private readonly props: Prop[] = []
  private readonly batches: InstanceBatch[] = []
  private lastX = Infinity
  private lastZ = Infinity
  private lastDistance = 0
  private lastForwardX = Infinity

  constructor(private readonly root: pc.Entity, private readonly course: TrackCourse, private readonly resources: ProceduralResources) {
    const theme = course.def.theme, visual = TRACK_VISUALS[course.def.id as TrackId]
    const recipes: [ProceduralMeshId, string][] = [
      ['cylinder', '#866c51'], ['sphere', visual.foliage], ['rock', theme === 'desert' ? '#c58259' : theme === 'snow' ? '#bedce9' : '#78ad7a'],
      ['cone', visual.foliage], ['sphere', '#fff2d2'], ['rounded', '#ffb958'], ['rounded', '#516c92'], ['rounded', '#89d7ed'],
    ]
    for (let i = 0; i < recipes.length; i++) {
      const [mesh, color] = recipes[i]
      const material = i === 6 && theme === 'neon' ? resources.windowMaterial() : resources.material(color, i === 7 && theme === 'neon' ? .8 : 0)
      this.batches.push(new InstanceBatch(root, resources.device, resources.mesh(mesh), material, 512))
    }
    const orchard = theme === 'meadow' ? resources.orchardMesh() : null
    if (orchard) this.batches.push(new InstanceBatch(root, resources.device, orchard.mesh, orchard.material, 128))
    const rng = new SeededRandom(7331)
    for (let i = 0; i < 280; i++) {
      const t = i / 280, s = course.sample(t), side = i % 2 ? 1 : -1
      const offset = side * (course.def.halfWidth + 5 + rng.range(0, 9))
      const x = s.position.x + s.rightX * offset, z = s.position.z + s.rightZ * offset
      // Avoid scenery on a nearby section of winding road.
      if (Math.abs(course.query({ x, y: s.position.y, z }).lateral) < course.def.halfWidth + 4) continue
      const scale = rng.range(3, 7), yaw = rng.range(0, 360)
      if (theme === 'meadow') {
        this.props.push({ kind: 0, x, y: s.position.y + 1.4, z, scale: 1, yaw, detail: 1 })
        this.props.push({ kind: 1, x, y: s.position.y + scale * .7, z, scale, yaw, detail: 0 })
        this.props.push({ kind: 4, x: x + 2, y: s.position.y + .4, z: z + 2, scale: .6, yaw, detail: 2 })
      } else if (theme === 'desert') {
        this.props.push({ kind: 2, x, y: s.position.y + scale * .7, z, scale: scale * 2, yaw, detail: 0 })
        this.props.push({ kind: 3, x: x + 4, y: s.position.y + 1.8, z: z - 2, scale: 2.8, yaw, detail: 1 })
      } else if (theme === 'snow') {
        this.props.push({ kind: 3, x, y: s.position.y + scale * .5, z, scale, yaw, detail: 0 })
        this.props.push({ kind: 4, x, y: s.position.y + scale * .68, z, scale: scale * .65, yaw, detail: 1 })
      } else {
        this.props.push({ kind: 6, x, y: s.position.y + scale * 2, z, scale: scale * 1.4, yaw: 0, detail: 0 })
        this.props.push({ kind: 7, x, y: s.position.y + scale * 4.1, z, scale: scale * 1.5, yaw: 0, detail: 1 })
      }
    }
    // Distant silhouettes are deliberately big, sparse and low-poly.
    for (let i = 0; i < 20; i++) {
      const a = i / 20 * Math.PI * 2
      shape(root, resources, 'rock', theme === 'snow' ? '#cfebf0' : theme === 'desert' ? '#b77760' : theme === 'neon' ? '#354767' : '#7faf8c',
        [Math.sin(a) * 260, -8, Math.cos(a) * 260], [65, 35 + i % 4 * 13, 60])
    }
  }

  update(camera: pc.Entity, distance: number, detailDistance: number): void {
    const position = camera.getPosition(), forward = camera.forward
    if (Math.hypot(position.x - this.lastX, position.z - this.lastZ) < 4 && distance === this.lastDistance && Math.abs(forward.x - this.lastForwardX) < .08) return
    this.lastX = position.x; this.lastZ = position.z; this.lastDistance = distance
    this.lastForwardX = forward.x
    for (const batch of this.batches) batch.clear()
    for (const prop of this.props) {
      const d = Math.hypot(position.x - prop.x, position.z - prop.z)
      if (d > distance || (prop.detail === 1 && d > detailDistance * 1.7) || (prop.detail === 2 && d > detailDistance)) continue
      // Conservative view cone avoids submitting whole-track instance batches.
      if (d > 25 && ((prop.x - position.x) * forward.x + (prop.z - position.z) * forward.z) / d < -.25) continue
      if (this.batches[8] && d < Math.min(detailDistance, 55)) {
        if (prop.kind === 0) continue
        if (prop.kind === 1) {
          const scale = prop.scale / 5
          this.batches[8].add(prop.x, prop.y - prop.scale * .7, prop.z, scale, scale, scale, prop.yaw)
          continue
        }
      }
      let sx = prop.scale, sy = prop.scale, sz = prop.scale
      if (prop.kind === 0) { sx = sz = .65; sy = 3 }
      if (prop.kind === 6) sy *= 3
      if (prop.kind === 7) sy = .22
      this.batches[prop.kind].add(prop.x, prop.y, prop.z, sx, sy, sz, prop.yaw)
    }
    for (const batch of this.batches) batch.upload()
  }

  destroy(): void { for (const batch of this.batches) batch.destroy() }
}
