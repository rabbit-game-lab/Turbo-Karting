import type { Difficulty } from '../data/content.ts'
import { CONFIG } from '../game.config.ts'
import { createTrackQuery } from './track.ts'
import { EMPTY_INPUT } from './types.ts'
import { itemById, racerById } from '../data/content.ts'
import { clamp, clamp01, SeededRandom, signedWrap } from './math.ts'
import { headingToward, topSpeed } from './kart.ts'
import type { HazardState, ItemBoxState, KartState, RaceInputSnapshot } from './types.ts'
import type { TrackCourse } from './track.ts'

interface DriverMemory {
  lane: number
  nerve: number
  driftHold: number
  itemTimer: number
  recoveryTimer: number
}

export class AIController {
  private readonly memories: DriverMemory[] = []
  private readonly nearSample=createTrackQuery()
  private readonly farSample=createTrackQuery()
  private readonly outputs=Array.from({length:8},()=>({...EMPTY_INPUT}))
  constructor(private readonly difficulty: Difficulty, rng: SeededRandom) {
    for (let index=0;index<8;index+=1) this.memories.push({ lane:rng.range(-0.45,0.45), nerve:rng.range(0.75,1.12), driftHold:0, itemTimer:rng.range(0.2,1), recoveryTimer:0 })
  }

  input(kart: KartState, player: KartState, course: TrackCourse, hazards: readonly HazardState[], dt: number,boxes:readonly ItemBoxState[]=[]): RaceInputSnapshot {
    const memory=this.memories[kart.id]; const profile=CONFIG.difficulty[this.difficulty]
    const lookAhead=(10+Math.max(0,kart.speed)*0.75)/course.length
    const near=course.sampleInto(kart.trackT+lookAhead,this.nearSample); const far=course.sampleInto(kart.trackT+lookAhead*2.1,this.farSample)
    const curve=course.curvature(kart.trackT+lookAhead); let lane=memory.lane*course.def.halfWidth
    lane-=Math.sign(curve)*Math.min(course.def.halfWidth*0.28,Math.abs(curve)*course.def.halfWidth*1.8)
    for (const hazard of hazards) {
      if (!hazard.active||hazard.ownerId===kart.id) continue
      const ahead=signedWrap(hazard.trackT-kart.trackT)
      if (ahead>0&&ahead<0.025&&Math.abs(hazard.lateral-kart.lateral)<2.2) lane+=hazard.lateral>kart.lateral?-3:3
    }
    if(!kart.item&&kart.rouletteTimer<=0){
      let closest=.04,selected:ItemBoxState|undefined
      for(const box of boxes){const ahead=signedWrap(box.t-kart.trackT);if(box.active&&ahead>0&&ahead<closest){closest=ahead;selected=box}}
      if(selected)lane=selected.lateral
    }
    lane=clamp(lane,-course.def.halfWidth*0.68,course.def.halfWidth*0.68)
    const targetX=near.position.x+near.rightX*lane; const targetZ=near.position.z+near.rightZ*lane
    const turn=headingToward(kart,targetX,targetZ); const farHeading=Math.atan2(-far.tangentX,-far.tangentZ)
    const steer=clamp(turn*2.25*profile.steeringAccuracy,-1,1)
    const racer=racerById(kart.racerId); let target=topSpeed(kart)*profile.topSpeedFactor*memory.nerve
    const gap=player.raceProgress-kart.raceProgress
    target*=1+clamp(gap,-0.7,0.7)*profile.rubberBand
    target*=1-Math.min(0.34,Math.abs(curve)*0.9)*(1.05-racer.stats.handling*0.25)
    const throttle=kart.speed<target?1:clamp01(1-(kart.speed-target)/Math.max(1,target*0.12))
    const shouldDrift=Math.abs(curve)>0.09&&Math.abs(steer)>0.34&&kart.speed>topSpeed(kart)*0.5
    if (shouldDrift) memory.driftHold+=dt; else memory.driftHold=Math.max(0,memory.driftHold-dt*2)
    const drift=shouldDrift&&memory.driftHold<(this.difficulty==='hard'?2.1:1.45)
    if (!drift&&memory.driftHold>=1.4) memory.driftHold=0
    memory.itemTimer-=dt
    const useItem=kart.item!==null&&kart.rouletteTimer<=0&&memory.itemTimer<=0
    if (useItem) memory.itemTimer=profile.itemDelay+0.6
    if (Math.abs(signedWrap(kart.trackT-kart.lastTrackT))<0.00001&&throttle>0.8) memory.recoveryTimer+=dt; else memory.recoveryTimer=0
    const heldItem=kart.item?itemById(kart.item):undefined
    const lookBack=useItem&&(heldItem?.kind==='hazard'||heldItem?.kind==='bomb')
    const out=this.outputs[kart.id]
    out.throttle=throttle;out.brake=Math.abs(turn)>1.35?0.35:0;out.steer=memory.recoveryTimer>2?1:steer;out.drift=drift;out.useItem=useItem;out.lookBack=lookBack
    return out
  }
}
