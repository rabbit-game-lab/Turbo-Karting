import * as pc from 'playcanvas'
import { racerById } from '../data/content.ts'
import { RACER_VISUALS } from '../data/visuals.ts'
import type { KartState } from '../sim/types.ts'
import { ProceduralResources, shape } from './resources.ts'

/** One reusable model recipe powers races, selection and the podium. */
export class KartView {
  readonly root = new pc.Entity('rabbit-kart')
  private readonly suspension = new pc.Entity('suspension')
  private readonly ears: pc.Entity[] = []
  private readonly wheels: pc.Entity[] = []
  private readonly head: pc.Entity
  private readonly shadow: pc.Entity
  private time = 0
  private wheelAngle = 0
  private readonly previous = new pc.Vec3()
  private previousHeading = 0

  constructor(parent: pc.Entity, readonly state: KartState, resources: ProceduralResources, dynamicBatchGroupId: number) {
    const racer = racerById(state.racerId), visual = RACER_VISUALS[state.racerId]
    const width = visual.width, heavy = racer.weightClass === 'heavy', light = racer.weightClass === 'light'
    parent.addChild(this.root); this.root.addChild(this.suspension)
    this.suspension.setLocalScale(width, 1, heavy ? 1.1 : 1)
    if (resources.modelsReady) {
      const model = resources.spawnKart(state.racerId, this.suspension, state.isPlayer)
      this.head = model.findByName('Head') as pc.Entity
      for (const name of ['Ear_L', 'Ear_R']) this.ears.push(model.findByName(name) as pc.Entity)
      for (const name of ['Wheel_LF', 'Wheel_RF', 'Wheel_LB', 'Wheel_RB']) this.wheels.push(model.findByName(name) as pc.Entity)
      this.shadow = this.createShadow(resources)
      for (const component of model.findComponents('render') as pc.RenderComponent[]) {
        component.batchGroupId = dynamicBatchGroupId
        // Tiny lenses, trim and spokes add shadow draws without a useful
        // silhouette. Only the hero's body, fur and tyres cast the near shadow.
        component.castShadows = state.isPlayer && component.meshInstances.some(instance =>
          ['Paint', 'Fur', 'Rubber'].includes(instance.material.name))
      }
      this.capture(); this.sync(0, 1)
      return
    }
    const part = (mesh: Parameters<typeof shape>[2], color: string, p: [number, number, number], s: [number, number, number], glow = 0) => shape(this.suspension, resources, mesh, color, p, s, glow)
    part('rounded', '#23374a', [0, .35, 0], [1.65, .25, 2.55])
    part('rounded', racer.color, [0, .6, -.25], [heavy ? 1.85 : 1.55, .48, light ? 2.25 : 2.45])
    part('rounded', racer.accent, [0, .58, -1.35], [1.32, .26, .38])
    part('rounded', '#f6efd5', [0, .86, -.8], [.2, .05, 1.1])
    part('rounded', '#314358', [0, .92, .57], [.8, .8, .35])
    for (const side of [-1, 1]) {
      part('rounded', racer.color, [side * .78, .7, .62], [.4, .34, .95])
      part('cylinder', '#b5c5cd', [side * .54, .56, 1.3], [.19, .55, .19]).setLocalEulerAngles(75, 0, 0)
      for (const z of [-.87, .85]) {
        const pivot = new pc.Entity('wheel-pivot'); this.suspension.addChild(pivot); pivot.setLocalPosition(side * .88, .37, z)
        const tyre = shape(pivot, resources, 'cylinder', '#263144', [0, 0, 0], [.61, .34, .61]); tyre.setLocalEulerAngles(0, 0, 90)
        const rim = shape(pivot, resources, 'cylinder', '#e6e8da', [side * .18, 0, 0], [.33, .035, .33]); rim.setLocalEulerAngles(0, 0, 90)
        this.wheels.push(pivot)
      }
    }
    if (!light) {
      part('rounded', racer.accent, [0, 1.1, 1.2], [heavy ? 1.9 : 1.5, .15, .42])
      for (const side of [-1, 1]) part('rounded', '#314358', [side * .5, .87, 1.2], [.1, .5, .1])
    }
    part('sphere', visual.fur, [0, 1.2, .25], [.75, .85, .66])
    part('sphere', '#fff4dd', [0, 1.22, -.06], [.48, .56, .13])
    this.head = part('sphere', visual.fur, [0, 1.96, .08], [.94, .85, .82])
    for (const side of [-1, 1]) {
      shape(this.head, resources, 'sphere', '#fff6e7', [side * .17, -.15, -.4], [.4, .27, .3])
      shape(this.head, resources, 'sphere', '#26374b', [side * .23, .09, -.4], [.12, .2, .08])
      shape(this.head, resources, 'sphere', '#ffffff', [side * .23 - .02, .13, -.44], [.045, .06, .025])
      const ear = shape(this.head, resources, 'sphere', visual.fur, [side * .25, .65, .04], [.29, visual.ears, .24])
      shape(ear, resources, 'sphere', '#ed9cac', [0, .03, -.41], [.53, .76, .14]); this.ears.push(ear)
      part('sphere', visual.fur, [side * .36, 1.06, -.36], [.25, .35, .5]).setLocalEulerAngles(-25, 0, side * 15)
      part('sphere', visual.fur, [side * .28, .88, -.73], [.25, .2, .42])
    }
    shape(this.head, resources, 'sphere', '#d47f92', [0, -.08, -.56], [.15, .12, .1])
    part('sphere', '#fff7e9', [0, 1.1, .7], [.38, .38, .38])
    const steering = part('cylinder', '#314358', [0, 1.2, -.6], [.5, .07, .5]); steering.setLocalEulerAngles(35, 0, 0)
    if (visual.accessory === 'goggles') {
      for (const side of [-1, 1]) shape(this.head, resources, 'rounded', racer.accent, [side * .22, .25, -.32], [.38, .2, .17])
    } else if (visual.accessory === 'cap') {
      shape(this.head, resources, 'sphere', racer.color, [0, .38, .04], [.88, .33, .82])
      shape(this.head, resources, 'rounded', racer.accent, [0, .31, -.4], [.8, .08, .4])
    } else {
      for (const side of [-1, 1]) shape(this.head, resources, 'sphere', racer.accent, [side * .14, .42, -.25], [.3, .2, .12])
    }
    this.shadow = this.createShadow(resources)
    for (const component of this.suspension.findComponents('render') as pc.RenderComponent[]) {
      component.batchGroupId = dynamicBatchGroupId; component.castShadows = true
    }
    this.capture(); this.sync(0, 1)
  }

  private createShadow(resources: ProceduralResources): pc.Entity {
    const shadow = new pc.Entity('contact-shadow')
    shadow.addComponent('render', {
      meshInstances: [new pc.MeshInstance(resources.mesh('quad'), resources.contactShadowMaterial())],
      castShadows: false, receiveShadows: false,
    })
    shadow.setLocalPosition(0, -.29, 0)
    shadow.setLocalScale(3.1, 1, 3.8)
    this.root.addChild(shadow)
    return shadow
  }

  capture(): void { this.previous.set(this.state.position.x, this.state.position.y, this.state.position.z); this.previousHeading = this.state.heading }

  sync(dt: number, alpha = 1): void {
    const s = this.state
    this.time += dt
    this.wheelAngle = (this.wheelAngle + s.speed * dt * 50) % 360
    this.root.setLocalPosition(this.previous.x + (s.position.x - this.previous.x) * alpha,
      this.previous.y + (s.position.y - this.previous.y) * alpha, this.previous.z + (s.position.z - this.previous.z) * alpha)
    const delta = Math.atan2(Math.sin(s.heading - this.previousHeading), Math.cos(s.heading - this.previousHeading))
    this.root.setLocalEulerAngles(0, (this.previousHeading + delta * alpha) * 180 / Math.PI, 0)
    this.suspension.setLocalEulerAngles(s.airborne ? -Math.max(-12, Math.min(12, s.verticalSpeed)) : Math.sin(this.time * 11) * Math.min(1, Math.abs(s.speed) / 22), 0, -s.driftDirection * 6)
    for (let i = 0; i < this.wheels.length; i++) this.wheels[i].setLocalEulerAngles(this.wheelAngle, i < 2 ? -s.driftDirection * 12 : 0, 0)
    for (let i = 0; i < this.ears.length; i++) this.ears[i].setLocalEulerAngles(Math.sin(this.time * 7 + i) * 7 + Math.abs(s.speed) * .4, 0, i ? -10 : 10)
    this.head.setLocalEulerAngles(0, -s.driftDirection * 12, Math.sin(this.time * 2) * 2)
    this.shadow.enabled = !s.airborne
  }
}
