import { ITEMS, type ItemId, itemById } from '../data/content.ts'
import { CONFIG } from '../game.config.ts'
import { applyBoost, spinKart } from './kart.ts'
import { clamp, distanceSq, SeededRandom, signedWrap } from './math.ts'
import type { HazardState, ItemBoxState, KartState, RaceInputSnapshot, SimEvent } from './types.ts'
import { createTrackQuery, type TrackCourse } from './track.ts'

const LEADER_WEIGHTS = [28,25,18,0,10,5,0,5,0,9]
const MID_WEIGHTS = [14,18,23,2,18,10,2,5,2,6]
const TRAIL_WEIGHTS = [5,8,15,12,18,16,12,8,4,2]

export function rollItemForPlace(place:number,rng:SeededRandom):ItemId{
  const weights=place<=2?LEADER_WEIGHTS:place>=6?TRAIL_WEIGHTS:MID_WEIGHTS
  let total=0;for(const weight of weights)total+=weight
  let roll=rng.next()*total;let chosen=0
  for(let index=0;index<weights.length;index+=1){roll-=weights[index];if(roll<=0){chosen=index;break}}
  return ITEMS[chosen].id as ItemId
}

function emptyHazard(): HazardState {
  return { active:false,kind:'berry-slick',ownerId:-1,targetId:-1,position:{x:0,y:0,z:0},heading:0,speed:0,verticalSpeed:0,trackT:0,lateral:0,age:0,life:0,bounces:0 }
}

export class ItemSystem {
  private readonly query = createTrackQuery()
  readonly boxes: ItemBoxState[] = []
  readonly hazards: HazardState[] = Array.from({length:CONFIG.performance.hazardPool},emptyHazard)
  constructor(private readonly course: TrackCourse, private readonly rng: SeededRandom) {
    for (const t of course.def.itemRows) for (let slot=-2;slot<=2;slot+=1) this.boxes.push({active:true,t,lateral:slot*course.def.halfWidth*0.28,respawnTimer:0,spin:this.rng.range(0,6.28)})
  }

  restart(): void {
    for (const box of this.boxes) { box.active=true; box.respawnTimer=0 }
    for (const hazard of this.hazards) Object.assign(hazard,emptyHazard())
  }

  update(dt: number, karts: KartState[], events: SimEvent[]): void {
    for (const box of this.boxes) {
      box.spin+=dt*2.5
      if (!box.active) { box.respawnTimer-=dt; if (box.respawnTimer<=0) box.active=true; continue }
      for (const kart of karts) {
        if (kart.finished||kart.item||kart.rouletteTimer>0) continue
        if (Math.abs(signedWrap(kart.trackT-box.t))<0.007&&Math.abs(kart.lateral-box.lateral)<1.35) {
          box.active=false; box.respawnTimer=CONFIG.race.itemBoxRespawnSeconds; kart.rouletteTimer=CONFIG.race.rouletteSeconds
          events.push({type:'sound',cue:'pickup',kartId:kart.id},{type:'burst',effect:'pickup',position:{...kart.position}}); break
        }
      }
    }
    for (const kart of karts) {
      if (kart.rouletteTimer>0) { kart.rouletteTimer-=dt; if (kart.rouletteTimer<=0) this.award(kart) }
      if (kart.item==='golden-carrot'&&kart.itemCount===0&&kart.goldenTimer===0) kart.item=null
    }
    for (const hazard of this.hazards) if (hazard.active) this.updateHazard(hazard,dt,karts,events)
  }

  use(kart: KartState, input: RaceInputSnapshot, karts: KartState[], events: SimEvent[]): void {
    if (!kart.item||kart.rouletteTimer>0) return
    const id=kart.item; const def=itemById(id); if (!def) return
    if (def.kind==='boost'||def.kind==='tripleBoost') applyBoost(kart,CONFIG.items.boostStrength,CONFIG.items.boostSeconds)
    else if (def.kind==='goldenBoost') { kart.goldenTimer=Math.max(kart.goldenTimer,5.5); kart.itemCount=0; applyBoost(kart,0.42,0.72) }
    else if (def.kind==='star') { kart.invulnerableTimer=CONFIG.items.starSeconds; applyBoost(kart,0.35,CONFIG.items.starSeconds) }
    else if (def.kind==='lightning') { for (const rival of karts) if (rival.id!==kart.id&&rival.invulnerableTimer<=0) rival.frozenTimer=CONFIG.items.lightningSeconds }
    else { this.spawnHazard(id,kart,input.lookBack,karts) }
    events.push({type:'sound',cue:def.kind==='boost'||def.kind==='tripleBoost'||def.kind==='goldenBoost'?'boost':'item',kartId:kart.id})
    if (def.kind==='lightning') events.push({type:'burst',effect:'lightning',position:{...kart.position}},{type:'shake',strength:kart.isPlayer?0.2:0.5})
    if (id==='triple-carrot') { kart.itemCount-=1; if (kart.itemCount<=0) kart.item=null }
    else if (id==='golden-carrot'&&kart.goldenTimer>0) { /* reusable during the golden window */ }
    else { kart.item=null; kart.itemCount=0 }
  }

  private award(kart: KartState): void {
    kart.item=rollItemForPlace(kart.place,this.rng); kart.itemCount=kart.item==='triple-carrot'?3:1
  }

  private spawnHazard(id: ItemId, kart: KartState, backwards: boolean, karts: KartState[]): void {
    const hazard=this.hazards.find((entry)=>!entry.active); if (!hazard) return
    const forwardX=-Math.sin(kart.heading),forwardZ=-Math.cos(kart.heading); const direction=backwards?-1:1
    const kind=id as HazardState['kind']; let leader=karts[0]
    for (const rival of karts) if(rival.place<leader.place) leader=rival
    hazard.active=true; hazard.kind=kind; hazard.ownerId=kart.id; hazard.targetId=kind==='crown-comet'?leader.id:-1
    hazard.position.x=kart.position.x+forwardX*direction*1.35
    hazard.position.y=kart.position.y+0.25
    hazard.position.z=kart.position.z+forwardZ*direction*1.35
    hazard.heading=kart.heading+(backwards?Math.PI:0); hazard.speed=kind==='berry-slick'?0:kind==='crown-comet'?30:24
    hazard.verticalSpeed=kind==='burrow-bomb'?5.5:0; hazard.trackT=kart.trackT; hazard.lateral=kart.lateral; hazard.age=0
    hazard.life=kind==='burrow-bomb'?CONFIG.items.bombFuseSeconds:kind==='berry-slick'?20:8; hazard.bounces=0
  }

  private updateHazard(hazard: HazardState, dt: number, karts: KartState[], events: SimEvent[]): void {
    hazard.age+=dt; hazard.life-=dt
    if (hazard.kind==='beet-seeker'||hazard.kind==='crown-comet') {
      let target=karts.find((kart)=>kart.id===hazard.targetId&&!kart.finished)
      if (!target) {
        let nearest=Infinity
        for(const rival of karts) {
          if(rival.id===hazard.ownerId||rival.finished)continue
          const distance=Math.abs(signedWrap(rival.trackT-hazard.trackT))
          if(distance<nearest){nearest=distance;target=rival}
        }
      }
      if (target) { hazard.targetId=target.id; const desired=Math.atan2(-(target.position.x-hazard.position.x),-(target.position.z-hazard.position.z)); const delta=Math.atan2(Math.sin(desired-hazard.heading),Math.cos(desired-hazard.heading)); hazard.heading+=clamp(delta,-2.2*dt,2.2*dt) }
    }
    if (hazard.kind!=='berry-slick') { hazard.position.x+=-Math.sin(hazard.heading)*hazard.speed*dt; hazard.position.z+=-Math.cos(hazard.heading)*hazard.speed*dt }
    if (hazard.kind==='burrow-bomb') { hazard.verticalSpeed-=18*dt; hazard.position.y+=hazard.verticalSpeed*dt }
    const query=this.course.queryInto(hazard.position,this.query,hazard.trackT); hazard.trackT=query.t; hazard.lateral=query.lateral
    if (hazard.kind==='burrow-bomb'&&hazard.position.y<query.position.y+0.3) { hazard.position.y=query.position.y+0.3; hazard.verticalSpeed=0; hazard.speed*=0.94 }
    if (query.surface==='wall'&&hazard.speed>0) { hazard.heading-=2*Math.atan2(Math.sin(hazard.heading-Math.atan2(-query.tangentX,-query.tangentZ)),Math.cos(hazard.heading-Math.atan2(-query.tangentX,-query.tangentZ))); hazard.bounces+=1; if (hazard.bounces>6) hazard.life=0 }
    for (const kart of karts) {
      if (kart.id===hazard.ownerId&&hazard.age<0.7||kart.finished) continue
      if (distanceSq(kart.position,hazard.position)<1.45**2) { if (kart.invulnerableTimer<=0) spinKart(kart,hazard.kind==='crown-comet'?1.5:1.05); this.explode(hazard,events,karts); return }
    }
    if (hazard.life<=0) this.explode(hazard,events,karts)
  }

  private explode(hazard: HazardState, events: SimEvent[],karts:KartState[]): void {
    if(hazard.kind==='burrow-bomb')for(const kart of karts)if(kart.id!==hazard.ownerId&&kart.invulnerableTimer<=0&&distanceSq(kart.position,hazard.position)<=CONFIG.items.bombRadius**2)spinKart(kart,1.25)
    events.push({type:'burst',effect:hazard.kind==='burrow-bomb'||hazard.kind==='crown-comet'?'explosion':'hit',position:{...hazard.position}},{type:'sound',cue:'hit'})
    hazard.active=false
  }
}
