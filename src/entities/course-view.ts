import * as pc from 'playcanvas'
import { CONFIG } from '../game.config.ts'
import { TRACK_VISUALS } from '../data/visuals.ts'
import type { TrackId } from '../data/content.ts'
import type { ItemSystem } from '../sim/items.ts'
import type { TrackCourse } from '../sim/track.ts'
import { ProceduralResources, shape } from './resources.ts'
import { roadGeometry, type RoadGeometry } from './road-geometry.ts'
import { buildLandmarks } from './landmarks.ts'
import { Scenery } from './scenery.ts'
import { InstanceBatch } from './instances.ts'

interface Sector {
  entity: pc.Entity
  levels: pc.Entity[]
  center: pc.Vec3
  level: number
}

/** Race-owned geometry. A build iterator yields after each bounded job. */
export class CourseView {
  readonly root = new pc.Entity('course-session')
  private readonly sectors: Sector[] = []
  private readonly boxes: InstanceBatch
  private readonly scenery: Scenery
  private readonly stripes: InstanceBatch
  private readonly boxPositions: pc.Vec3[] = []

  constructor(private readonly app: pc.Application, readonly course: TrackCourse, readonly items: ItemSystem,
    private readonly resources: ProceduralResources, private readonly staticBatchGroupId: number) {
    this.scenery = new Scenery(this.root, course, resources)
    this.boxes = new InstanceBatch(this.root, resources.device, resources.mesh('rounded'), resources.material('#75e8f0', .4), items.boxes.length)
    this.stripes = new InstanceBatch(this.root, resources.device, resources.mesh('quad'), resources.material(course.def.palette.accent, .1), 512)
  }

  *build(): Generator<void> {
    const { course, resources } = this
    const visual = TRACK_VISUALS[course.def.id as TrackId], w = course.def.halfWidth
    if (course.def.theme !== 'snow') {
      shape(this.root, resources, 'quad', visual.shoulder, [0, -6, 0], [1200, 1, 1200])
    }
    const count = Math.ceil(course.length / CONFIG.graphics.sectorMetres)
    for (let i = 0; i < count; i++) {
      const entity = new pc.Entity(`road-sector-${i}`)
      const s = course.sample((i + .5) / count)
      const sector: Sector = { entity, levels: [], center: new pc.Vec3(s.position.x, s.position.y, s.position.z), level: 0 }
      this.root.addChild(entity)
      this.sectors.push(sector)
      for (let lod = 0; lod < 3; lod++) {
        const merged: RoadGeometry = { positions: [], normals: [], indices: [], uvs: [], colors: [] }
        const strips: [number, number, number, string, boolean][] = [
          [-w, w, 0, visual.road, true], [-w - 1, -w, .045, '#fff4d4', false], [w, w + 1, .045, '#fff4d4', false],
          [-w - 15, -w - 1, -.16, visual.shoulder, false], [w + 1, w + 15, -.16, visual.shoulder, false],
          [-w, w, -.7, '#465462', true],
        ]
        for (const [left, right, y, hex, gap] of strips) {
          const data = roadGeometry(course, i / count, (i + 1) / count, left, right, y,
            Math.max(3, Math.ceil(CONFIG.performance.trackSegments / count / (1 << lod))), gap)
          const offset = merged.positions.length / 3
          merged.positions.push(...data.positions); merged.normals.push(...data.normals); merged.uvs.push(...data.uvs)
          for (const index of data.indices) merged.indices.push(index + offset)
          // Vertex colors are already linear in the lighting shader (unlike
          // StandardMaterial.diffuse, which accepts sRGB swatches).
          const color = new pc.Color().fromString(hex).linear()
          for (let v = 0; v < data.positions.length / 3; v++) merged.colors.push(color.r, color.g, color.b, 1)
        }
        // Declare every stream before the first upload. Adding COLOR after
        // fromGeometry cannot extend its already-created GPU vertex format.
        const mesh = new pc.Mesh(this.app.graphicsDevice)
        mesh.setPositions(merged.positions)
        mesh.setNormals(merged.normals)
        mesh.setUvs(0, merged.uvs)
        mesh.setColors(merged.colors)
        mesh.setIndices(merged.indices)
        mesh.update()
        const level = new pc.Entity(`lod-${lod}`)
        level.addComponent('render', { meshInstances: [new pc.MeshInstance(mesh, resources.material('#ffffff'))], castShadows: false, receiveShadows: true })
        entity.addChild(level); level.enabled = lod === 0; sector.levels.push(level)
        yield
      }
      if (s.position.y > 2) for (const side of [-1, 1]) {
        shape(this.root, resources, 'rounded', '#718495',
          [s.position.x + s.rightX * w * side, s.position.y - 7, s.position.z + s.rightZ * w * side], [1.4, 13, 1.4])
      }
    }
    for (let i = 0; i < 160; i++) {
      const s = course.sample(i / 160), yaw = Math.atan2(s.tangentX, s.tangentZ) * 180 / Math.PI
      for (const side of [-1, 1]) this.stripes.add(s.position.x + s.rightX * (w + .5) * side, s.position.y + .09,
        s.position.z + s.rightZ * (w + .5) * side, .95, .06, 2.7, yaw)
    }
    this.stripes.upload()
    yield
    for (const t of course.def.boostPads) {
      const s = course.sample(t)
      const pad = shape(this.root, resources, 'rounded', '#6de6dd', [s.position.x, s.position.y + .025, s.position.z], [w * 1.7, .05, 3], .7)
      pad.setEulerAngles(0, Math.atan2(s.tangentX, s.tangentZ) * 180 / Math.PI, 0)
    }
    buildLandmarks(this.root, course, resources)
    for (const child of this.root.children) if (child.name.startsWith('landmark')) {
      for (const render of (child as pc.Entity).findComponents('render') as pc.RenderComponent[]) render.batchGroupId = this.staticBatchGroupId
    }
    for (const box of this.items.boxes) {
      const s = course.sample(box.t)
      this.boxPositions.push(new pc.Vec3(s.position.x + s.rightX * box.lateral, s.position.y + 1.05, s.position.z + s.rightZ * box.lateral))
    }
    yield
  }

  sync(time: number, camera: pc.Entity, distance: number, detail: number): void {
    const position = camera.getPosition()
    for (const sector of this.sectors) {
      const d = sector.center.distance(position)
      sector.entity.enabled = d < distance + CONFIG.graphics.sectorMetres
      const level = d < detail ? 0 : d < detail * 2 ? 1 : 2
      if (level !== sector.level) {
        sector.levels[sector.level].enabled = false
        sector.levels[level].enabled = true
        sector.level = level
      }
    }
    this.boxes.clear()
    for (let i = 0; i < this.items.boxes.length; i++) {
      const box = this.items.boxes[i], p = this.boxPositions[i]
      if (!box.active || !p) continue
      this.boxes.add(p.x, p.y + Math.sin(time * 3 + i) * .18, p.z, .8, .8, .8, box.spin * 57.3, 25)
    }
    this.boxes.upload()
    this.scenery.update(camera, distance, detail)
  }

  destroy(): void {
    this.boxes.destroy(); this.stripes.destroy(); this.scenery.destroy()
    this.root.destroy()
  }
}
