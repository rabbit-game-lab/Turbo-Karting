import * as pc from 'playcanvas'
import { CONFIG } from '../game.config.ts'
import { clamp01 } from '../sim/math.ts'
import type { KartState, RaceInputSnapshot } from '../sim/types.ts'

export class ChaseCamera {
  private readonly position=new pc.Vec3()
  private readonly target=new pc.Vec3()
  private readonly desiredPos=new pc.Vec3()
  private readonly desiredTarget=new pc.Vec3()
  private readonly reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches
  private shake=0
  constructor(private readonly camera: pc.Entity) {}

  snap(kart: KartState): void { this.compute(kart,false,this.position,this.target); this.camera.setPosition(this.position); this.camera.lookAt(this.target) }
  addShake(amount: number): void { if(!this.reducedMotion)this.shake=Math.max(this.shake,amount*CONFIG.effects.cameraShake) }

  update(kart: KartState,input: RaceInputSnapshot,dt: number): void {
    const desiredPos=this.desiredPos, desiredTarget=this.desiredTarget; this.compute(kart,input.lookBack,desiredPos,desiredTarget)
    const alpha=1-Math.exp(-CONFIG.camera.smoothing*dt)
    this.position.lerp(this.camera.getPosition(),desiredPos,alpha); this.target.lerp(this.target,desiredTarget,alpha)
    if (this.shake>0) { const strength=this.shake; this.position.x+=(Math.random()-.5)*strength; this.position.y+=(Math.random()-.5)*strength; this.shake=Math.max(0,this.shake-dt*1.8) }
    this.camera.setPosition(this.position); this.camera.lookAt(this.target)
    const speed=clamp01(Math.abs(kart.speed)/24); const desiredFov=CONFIG.camera.fovMin+(CONFIG.camera.fovMax-CONFIG.camera.fovMin)*speed
    this.camera.camera!.fov += (desiredFov-this.camera.camera!.fov)*Math.min(1,dt*3.4)
  }

  private compute(kart: KartState,lookBack: boolean,outPos: pc.Vec3,outTarget: pc.Vec3): void {
    const flip=lookBack?-1:1, fx=-Math.sin(kart.heading),fz=-Math.cos(kart.heading), rx=Math.cos(kart.heading),rz=-Math.sin(kart.heading)
    const drift=kart.driftDirection*0.55
    const portrait=window.innerHeight>window.innerWidth
    const distance=CONFIG.camera.distance*(portrait?1.18:1)
    outPos.set(kart.position.x-fx*distance*flip+rx*drift,kart.position.y+CONFIG.camera.height+(portrait?1:0),kart.position.z-fz*distance*flip+rz*drift)
    outTarget.set(kart.position.x+fx*CONFIG.camera.lookAhead*flip,kart.position.y+0.8,kart.position.z+fz*CONFIG.camera.lookAhead*flip)
  }
}
