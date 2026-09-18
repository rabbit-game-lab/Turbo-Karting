import * as pc from 'playcanvas'
import type { GameSim } from '../sim/runtime.ts'
import type { RaceInputSnapshot, SimEvent } from '../sim/types.ts'
import { CourseView } from './course-view.ts'
import { EffectPool } from './effects.ts'
import { KartView } from './kart-view.ts'
import { ChaseCamera } from './chase-camera.ts'
import { ItemView } from './item-view.ts'
import type { ProceduralResources } from './resources.ts'
import { CONFIG } from '../game.config.ts'
import type { QualityLevel } from '../data/visuals.ts'

export class RaceView {
  readonly root=new pc.Entity('race-view')
  private readonly courseView: CourseView
  private readonly karts: KartView[]=[]
  private readonly itemView: ItemView
  private readonly effects: EffectPool
  private readonly chase: ChaseCamera
  private quality: QualityLevel = 'medium'

  constructor(app: pc.Application,private readonly sim: GameSim,private readonly camera: pc.Entity,resources: ProceduralResources,staticBatchGroupId:number,dynamicBatchGroupId:number) {
    app.root.addChild(this.root)
    const course=sim.getCourse(),items=sim.getItems()
    if (!course||!items) throw new Error('Cannot create RaceView before the race session')
    this.courseView=new CourseView(app,course,items,resources,staticBatchGroupId); this.root.addChild(this.courseView.root)
    for (const kart of sim.karts) this.karts.push(new KartView(this.root,kart,resources,dynamicBatchGroupId))
    this.itemView = new ItemView(this.root, resources, items.hazards.length)
    this.effects=new EffectPool(this.root,resources,dynamicBatchGroupId); this.chase=new ChaseCamera(camera)
    if (sim.karts[0]) this.chase.snap(sim.karts[0])
  }

  capture(): void { for (const kart of this.karts) kart.capture() }
  build(): Generator<void> { return this.courseView.build() }
  setQuality(level: QualityLevel): void { this.quality = level; this.effects.limit = CONFIG.graphics.profiles[level].particles }

  sync(dt: number,input: RaceInputSnapshot,alpha=1): void {
    for (const kart of this.karts) kart.sync(dt,alpha)
    const items = this.sim.getItems()
    if (items && this.sim.karts[0]) this.itemView.sync(items, this.sim.karts[0], this.sim.raceTime)
    const profile = CONFIG.graphics.profiles[this.quality]
    this.courseView.sync(this.sim.raceTime,this.camera,profile.viewDistance,profile.detailDistance); this.effects.update(dt,this.sim.karts[0])
    if (this.sim.karts[0]) this.chase.update(this.sim.karts[0],input,dt)
  }

  event(event: SimEvent): void {
    if (event.type==='burst') this.effects.burst(event.effect,event.position)
    else if (event.type==='shake') this.chase.addShake(event.strength)
  }
  destroy(): void { this.courseView.destroy(); this.itemView.destroy(); this.effects.destroy(); this.root.destroy() }
}
