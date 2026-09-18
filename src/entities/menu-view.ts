import * as pc from 'playcanvas'
import { RACERS, TRACKS, racerById, type RacerId } from '../data/content.ts'
import { TrackCourse } from '../sim/track.ts'
import { createKart } from '../sim/kart.ts'
import { KartView } from './kart-view.ts'
import { ProceduralResources, shape } from './resources.ts'

export class MenuView {
  readonly root = new pc.Entity('menu-diorama')
  private readonly display = new pc.Entity('racer-display')
  private readonly course = new TrackCourse(TRACKS[0])
  private model: KartView | null = null
  private time = 0
  private racerId: RacerId = 'pip'
  private portrait: boolean | null = null
  private selection = false
  private readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  private readonly group: pc.BatchGroup

  constructor(private readonly app: pc.Application, private readonly resources: ProceduralResources) {
    app.root.addChild(this.root); this.root.addChild(this.display)
    this.group = app.batcher.addGroup('showroom-kart', true, 100)
    this.root.setPosition(6.7, -.5, -3)
    shape(this.root, resources, 'cylinder', '#c4dca0', [0, -.55, 0], [13, .9, 13])
    shape(this.root, resources, 'cylinder', '#e8edce', [0, 0, 0], [6, .4, 6])
    shape(this.root, resources, 'cylinder', '#ffd180', [0, .22, 0], [4.8, .1, 4.8])
    for (let i = 0; i < 14; i++) {
      const angle = Math.PI * .55 + i / 14 * Math.PI * .9
      shape(this.root, resources, 'sphere', i % 2 ? '#629f82' : '#87b795', [Math.sin(angle) * 9, .8, Math.cos(angle) * 9], [3, 3 + i % 3, 3])
      shape(this.root, resources, 'sphere', i % 2 ? '#ffc879' : '#f595a4', [Math.sin(angle) * 6, 3 + i % 3, Math.cos(angle) * 6], [.5, .7, .5])
    }
    this.select('pip')
  }

  select(id: RacerId, force = false): void {
    if (id === this.racerId && this.model && !force) return
    this.racerId = id; this.model?.root.destroy()
    const state = createKart(0, racerById(id), true, this.course)
    state.position.x = state.position.z = 0; state.position.y = .14; state.heading = -2.95
    this.model = new KartView(this.display, state, this.resources, this.group.id)
    this.display.setLocalScale(2.15, 2.15, 2.15)
  }

  update(dt: number, selection = false): void {
    if (!this.root.enabled) return
    const portrait = window.innerHeight > window.innerWidth
    if (portrait !== this.portrait || selection !== this.selection) {
      this.portrait = portrait
      this.selection = selection
      this.root.setPosition(portrait ? (selection ? 3.1 : 2.5) : 6.7, portrait ? (selection ? 3.8 : -3.4) : -.5, -3)
      const scale = portrait ? (selection ? .42 : .62) : 1
      this.root.setLocalScale(scale, scale, scale)
    }
    if (!this.reducedMotion.matches) this.time += dt
    if (this.model) { this.model.state.heading = Math.sin(this.time * .22) * (selection ? .8 : .2) - 2.95; this.model.capture(); this.model.sync(this.reducedMotion.matches ? 0 : dt) }
  }
  setVisible(value: boolean): void { this.root.enabled = value }
  destroy(): void { this.root.destroy(); this.app.batcher.removeGroup(this.group.id) }
}
