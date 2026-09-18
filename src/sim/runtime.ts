import { ITEMS, RACERS, TRACKS, type Difficulty, type ItemId, type RacerId, type TrackId, racerById, trackById } from '../data/content.ts'
import { CONFIG } from '../game.config.ts'
import { AIController } from './ai.ts'
import { applyBoost, createKart, resolveKartCollisions, spinKart, stepKart } from './kart.ts'
import { forwardDistance, hashString, SeededRandom, signedWrap } from './math.ts'
import { ItemSystem } from './items.ts'
import { TrackCourse } from './track.ts'
import { createTrackQuery } from './track.ts'
import type { GamePhase, HudSnapshot, KartState, RaceInputSnapshot, RaceSettings, SimEvent, Standing } from './types.ts'
import { EMPTY_INPUT } from './types.ts'

const KART_COUNT = 8

export class GameSim {
  phase: GamePhase = 'title'
  selectedRacerId: RacerId = RACERS[0].id
  selectedTrackId: TrackId = TRACKS[0].id
  difficulty: Difficulty = 'normal'
  raceTime = 0
  countdown = 0
  readonly karts: KartState[] = []
  private course: TrackCourse | null = null
  private items: ItemSystem | null = null
  private ai: AIController | null = null
  private settings: RaceSettings | null = null
  private playerInput: RaceInputSnapshot = { ...EMPTY_INPUT }
  private events: SimEvent[] = []
  private drained: SimEvent[] = []
  private finishWait = 0
  private finishCount = 0
  private bestTimes: Record<string, number> = {}
  private startThrottleAt=-1
  private startThrottleHeld=false
  private readonly inputs:RaceInputSnapshot[]=Array.from({length:8},()=>({...EMPTY_INPUT}))
  private readonly stateSample=createTrackQuery()
  private readonly ordered:KartState[]=[]
  private qaAltered=false
  private qaAutoDrive=false

  showTitle(): void { this.phase='title'; this.playerInput={...EMPTY_INPUT} }
  showRacers(): void { this.phase='racerSelect' }
  showTracks(): void { this.phase='trackSelect' }
  chooseRacer(id: RacerId): void { this.selectedRacerId=id }
  chooseTrack(id: TrackId): void { this.selectedTrackId=id }
  chooseDifficulty(value: Difficulty): void { this.difficulty=value }
  setLoading(): void { this.phase='loading' }
  setInput(input: RaceInputSnapshot): void { Object.assign(this.playerInput,input) }
  setBestTimes(records: Record<string,number>): void { this.bestTimes={...records} }
  bestTimeKey(): string { return `${this.selectedTrackId}:${this.difficulty}` }
  getBestTimes(): Readonly<Record<string,number>> { return this.bestTimes }
  getCourse(): TrackCourse | null { return this.course }
  getItems(): ItemSystem | null { return this.items }

  startRace(seed = hashString(`${this.selectedTrackId}:${this.difficulty}`)): void {
    this.settings={racerId:this.selectedRacerId,trackId:this.selectedTrackId,difficulty:this.difficulty,seed}
    this.course=new TrackCourse(trackById(this.selectedTrackId))
    const rng=new SeededRandom(seed); this.items=new ItemSystem(this.course,rng); this.ai=new AIController(this.difficulty,rng)
    this.karts.length=0
    const roster=[racerById(this.selectedRacerId),...RACERS.filter((entry)=>entry.id!==this.selectedRacerId)]
    for (let index=0;index<KART_COUNT;index+=1) this.karts.push(createKart(index,roster[index],index===0,this.course))
    this.raceTime=0; this.countdown=CONFIG.race.countdownSeconds; this.finishWait=0; this.finishCount=0;this.startThrottleAt=-1;this.startThrottleHeld=false
    this.qaAltered=false;this.qaAutoDrive=false
    this.events.length=0; this.phase='countdown'; this.events.push({type:'sound',cue:'countdown'})
  }

  restart(): void {
    if (this.settings) { this.selectedRacerId=this.settings.racerId; this.selectedTrackId=this.settings.trackId; this.difficulty=this.settings.difficulty; this.startRace(this.settings.seed) }
    else this.showTitle()
  }

  step(dt: number): void {
    if (this.phase==='countdown') {
      const held=this.playerInput.throttle>.72
      if(held&&!this.startThrottleHeld)this.startThrottleAt=this.countdown
      this.startThrottleHeld=held
      const previous=Math.ceil(this.countdown); this.countdown=Math.max(0,this.countdown-dt)
      if (Math.ceil(this.countdown)!==previous&&this.countdown>0) this.events.push({type:'sound',cue:'countdown'})
      if (this.countdown===0) { this.phase='racing';const player=this.karts[0];if(this.startThrottleAt>=.22&&this.startThrottleAt<=1.08){const precision=1-Math.min(1,Math.abs(this.startThrottleAt-.62)/.58);applyBoost(player,.28+precision*.22,.7+precision*.75);this.events.push({type:'banner',text:precision>.72?'PERFECT START!':'BOOST START!'})}else if(this.startThrottleAt>1.72){spinKart(player,.65);this.events.push({type:'banner',text:'TOO EARLY!'})}else this.events.push({type:'banner',text:'GO!'});this.events.push({type:'sound',cue:'go'}) }
      this.playerInput.useItem=false; return
    }
    if ((this.phase!=='racing'&&this.phase!=='finished')||!this.course||!this.items||!this.ai) return
    this.raceTime+=dt
    const player=this.karts[0]; const inputs=this.inputs
    inputs[0]=this.phase==='finished'||this.qaAutoDrive?this.ai.input(player,player,this.course,this.items.hazards,dt,this.items.boxes):this.playerInput
    for (let index=1;index<this.karts.length;index+=1) inputs[index]=this.ai.input(this.karts[index],player,this.course,this.items.hazards,dt,this.items.boxes)
    for (let index=0;index<this.karts.length;index+=1) {
      const kart=this.karts[index]; stepKart(kart,inputs[index],this.course,dt,this.events)
      if (inputs[index].useItem&&!kart.finished) this.items.use(kart,inputs[index],this.karts,this.events)
    }
    this.playerInput.useItem=false
    resolveKartCollisions(this.karts,this.events); this.items.update(dt,this.karts,this.events)
    for (const kart of this.karts) this.updateRaceState(kart,dt)
    this.updatePlaces()
    if (this.phase==='finished') {
      this.finishWait+=dt
      if (this.finishCount===this.karts.length||this.finishWait>=CONFIG.race.postFinishSeconds) this.finishRemaining();
    }
  }

  consumeEvents(): SimEvent[] { this.drained.length=0; this.drained.push(...this.events); this.events.length=0; return this.drained }

  getSnapshot(): HudSnapshot {
    const player=this.karts[0]
    const standings: Standing[]=this.karts.map((kart)=>({kartId:kart.id,racerId:kart.racerId,place:kart.place,finished:kart.finished,time:kart.finishTime})).sort((a,b)=>a.place-b.place)
    return { phase:this.phase,selectedRacerId:this.selectedRacerId,selectedTrackId:this.selectedTrackId,difficulty:this.difficulty,
      lap:player?.lap??1,totalLaps:CONFIG.race.laps,place:player?.place??1,speedKph:Math.max(0,(player?.speed??0)*3.6),raceTime:this.raceTime,
      countdown:Math.ceil(this.countdown),item:player?.item??null,itemCount:player?.itemCount??0,roulette:(player?.rouletteTimer??0)>0,
      driftStage:player?.driftStage??0,wrongWay:player?.wrongWay??false,bestTime:this.bestTimes[this.bestTimeKey()]??null,standings,karts:this.karts }
  }

  recordPlayerTime(): number | null {
    const player=this.karts[0]; if (!player?.finished||this.qaAltered) return null
    const key=this.bestTimeKey(); const previous=this.bestTimes[key]
    if (previous===undefined||player.finishTime<previous) this.bestTimes[key]=player.finishTime
    return this.bestTimes[key]
  }

  debugGrantItem(id: ItemId): void { this.qaAltered=true;const player=this.karts[0]; if (player) { player.item=id; player.itemCount=id==='triple-carrot'?3:1; player.rouletteTimer=0 } }
  debugDrive(): void { this.qaAltered=true;this.qaAutoDrive=!this.qaAutoDrive }
  debugSeek(t:number): void {
    if(!this.course||!this.karts[0])return
    this.qaAltered=true
    const sample=this.course.sampleInto(t,this.stateSample),kart=this.karts[0]
    Object.assign(kart.position,sample.position)
    kart.position.y+=.35;kart.trackT=kart.lastTrackT=t
    kart.heading=Math.atan2(-sample.tangentX,-sample.tangentZ);kart.speed=0
  }
  debugFinishPlayer(): void { this.qaAltered=true;const player=this.karts[0]; if (player&&!player.finished) this.finish(player) }

  private updateRaceState(kart: KartState, dt: number): void {
    if (!this.course||kart.finished) return
    const delta=signedWrap(kart.trackT-kart.lastTrackT)
    if (delta>0&&delta<0.08) {
      for (let attempts=0;attempts<2;attempts+=1) {
        const checkpoint=kart.nextCheckpoint/CONFIG.race.checkpointCount
        if (forwardDistance(kart.lastTrackT,checkpoint)>forwardDistance(kart.lastTrackT,kart.trackT)+0.003) break
        if (kart.nextCheckpoint===0) { if (kart.lap>=CONFIG.race.laps) { this.finish(kart); break } kart.lap+=1; if (kart.isPlayer) this.events.push({type:'sound',cue:'lap'},{type:'banner',text:kart.lap===CONFIG.race.laps?'FINAL LAP':'LAP '+kart.lap}) }
        kart.nextCheckpoint=(kart.nextCheckpoint+1)%CONFIG.race.checkpointCount
      }
    }
    kart.raceProgress=(kart.lap-1)+kart.trackT
    const sample=this.course.sampleInto(kart.trackT,this.stateSample); const forwardX=-Math.sin(kart.heading),forwardZ=-Math.cos(kart.heading)
    const direction=forwardX*sample.tangentX+forwardZ*sample.tangentZ
    kart.wrongWay=direction< -0.35&&Math.abs(kart.speed)>2.5
    if (Math.abs(kart.speed)<0.45&&this.playerInput.throttle>0.7) kart.stuckTimer+=dt; else kart.stuckTimer=0
    if (kart.position.y<-18||kart.stuckTimer>4.5) this.respawn(kart)
  }

  private respawn(kart: KartState): void {
    if (!this.course) return
    const checkpoint=(kart.nextCheckpoint-1+CONFIG.race.checkpointCount)%CONFIG.race.checkpointCount; const sample=this.course.sample(checkpoint/CONFIG.race.checkpointCount)
    kart.position={x:sample.position.x,y:sample.position.y+0.34,z:sample.position.z}; kart.heading=Math.atan2(-sample.tangentX,-sample.tangentZ); kart.speed=0; kart.verticalSpeed=0; kart.airborne=false; kart.trackT=sample.t; kart.lastTrackT=sample.t; kart.stuckTimer=0; kart.wrongWay=false
  }

  private finish(kart: KartState): void {
    if (kart.finished) return
    kart.finished=true; kart.finishTime=this.raceTime; this.finishCount+=1; kart.place=this.finishCount
    this.events.push({type:'finish',kartId:kart.id},{type:'sound',cue:'finish',kartId:kart.id})
    if (kart.isPlayer) { this.phase='finished'; this.finishWait=0; this.events.push({type:'banner',text:kart.place===1?'VICTORY!':`FINISHED ${ordinal(kart.place)}`},{type:'burst',effect:'confetti',position:{...kart.position}}) }
  }

  private finishRemaining(): void {
    const unfinished=this.karts.filter((kart)=>!kart.finished).sort((a,b)=>b.raceProgress-a.raceProgress)
    for (const kart of unfinished) { kart.finished=true; kart.finishTime=this.raceTime; this.finishCount+=1; kart.place=this.finishCount }
    this.phase='results'; this.recordPlayerTime()
  }

  private updatePlaces(): void {
    this.ordered.length=0
    for(const kart of this.karts)if(!kart.finished){
      let index=this.ordered.length
      while(index>0&&this.ordered[index-1].raceProgress<kart.raceProgress){this.ordered[index]=this.ordered[index-1];index--}
      this.ordered[index]=kart
    }
    for (let index=0;index<this.ordered.length;index+=1) this.ordered[index].place=this.finishCount+index+1
  }
}

function ordinal(value: number): string { return value===1?'1ST':value===2?'2ND':value===3?'3RD':`${value}TH` }

export const sim = new GameSim()
