import type { RacerDef } from '../data/content.ts'
import { racerById } from '../data/content.ts'
import { CONFIG } from '../game.config.ts'
import { angleDelta, clamp, clamp01, damp, distanceSq, signedWrap } from './math.ts'
import type { KartState, RaceInputSnapshot, SimEvent } from './types.ts'
import type { TrackCourse } from './track.ts'
import { createTrackQuery } from './track.ts'
const movementQuery=createTrackQuery()

export function createKart(id: number, racer: RacerDef, isPlayer: boolean, course: TrackCourse): KartState {
  // The player launches from the final row, leaving the chase camera a clean view of the field.
  const gridIndex = isPlayer ? 7 : id-1; const row = Math.floor(gridIndex / 2); const side = gridIndex % 2 === 0 ? -1 : 1
  // Stage beyond t=0 so the opening straight never straddles the track-progress wrap seam.
  const t = 0.008 + (3-row) * 0.009; const sample = course.sample(t); const lateral = side * 1.55
  return {
    id, racerId: racer.id as KartState['racerId'], isPlayer,
    position: { x:sample.position.x + sample.rightX*lateral, y:sample.position.y+0.34, z:sample.position.z+sample.rightZ*lateral },
    heading: Math.atan2(-sample.tangentX,-sample.tangentZ), speed:0, verticalSpeed:0,
    trackT:t, lastTrackT:t, lateral, surface:'road', lap:1, nextCheckpoint:1, place:gridIndex+1,
    finished:false, finishTime:0, wrongWay:false, raceProgress:t,
    driftDirection:0, driftHeldLast:false, driftCharge:0, driftStage:0, hopTimer:0, airborne:false,
    boostTimer:0, boostStrength:0, spinTimer:0, frozenTimer:0, invulnerableTimer:0, padCooldown:0,
    item:null, itemCount:0, rouletteTimer:0, goldenTimer:0, stuckTimer:0,
  }
}

export function topSpeed(kart: KartState): number {
  const racer = racerById(kart.racerId)
  let speed = CONFIG.handling.mediumTopSpeed * (0.86 + racer.stats.speed * 0.21)
  if (kart.surface === 'offroad' && kart.boostTimer <= 0 && kart.invulnerableTimer <= 0) speed *= CONFIG.handling.offroadFactor
  if (kart.boostTimer > 0) speed *= 1 + kart.boostStrength
  if (kart.frozenTimer > 0) speed *= 0.48
  return speed
}

export function applyBoost(kart: KartState, strength: number, seconds: number): void {
  kart.boostStrength = Math.max(kart.boostStrength,strength); kart.boostTimer = Math.max(kart.boostTimer,seconds)
}

export function spinKart(kart: KartState, seconds = 1.05): void {
  if (kart.invulnerableTimer > 0) return
  kart.spinTimer = Math.max(kart.spinTimer,seconds); kart.speed *= 0.52; kart.driftDirection = 0; kart.driftStage = 0; kart.driftCharge = 0
}

export function stepKart(kart: KartState, input: RaceInputSnapshot, course: TrackCourse, dt: number, events: SimEvent[]): void {
  const racer = racerById(kart.racerId); const h = CONFIG.handling
  kart.boostTimer = Math.max(0,kart.boostTimer-dt); if (kart.boostTimer === 0) kart.boostStrength = 0
  kart.spinTimer = Math.max(0,kart.spinTimer-dt); kart.frozenTimer = Math.max(0,kart.frozenTimer-dt)
  kart.invulnerableTimer = Math.max(0,kart.invulnerableTimer-dt); kart.padCooldown = Math.max(0,kart.padCooldown-dt)
  kart.goldenTimer = Math.max(0,kart.goldenTimer-dt); kart.hopTimer = Math.max(0,kart.hopTimer-dt)

  const canDrive = kart.spinTimer <= 0 && kart.frozenTimer <= 0 && (!kart.finished||kart.isPlayer)
  const steer = canDrive ? clamp(input.steer,-1,1) : 0
  const maxSpeed = topSpeed(kart)
  if (canDrive && input.throttle > 0) kart.speed += h.acceleration*(0.65+racer.stats.acceleration*0.7)*input.throttle*dt
  else kart.speed = damp(kart.speed,0,0.7,dt)
  if (canDrive && input.brake > 0) {
    if (kart.speed > 0.25) kart.speed -= h.brakePower*input.brake*dt
    else kart.speed -= h.acceleration*0.55*input.brake*dt
  }
  kart.speed = clamp(kart.speed,-h.reverseSpeed,maxSpeed)

  const driftPressed = input.drift && !kart.driftHeldLast
  if (driftPressed && canDrive && kart.speed > maxSpeed*0.28 && !kart.airborne) {
    kart.airborne = true; kart.verticalSpeed = h.hopVelocity; kart.hopTimer = 0.24
    events.push({type:'sound',cue:'drift',kartId:kart.id})
  }
  if (input.drift && kart.driftDirection === 0 && kart.hopTimer > 0 && Math.abs(steer) > 0.18) kart.driftDirection = steer > 0 ? 1 : -1
  if (kart.driftDirection !== 0 && input.drift && canDrive) {
    kart.driftCharge += dt*(0.74+racer.stats.miniTurbo*0.52)*(0.8+Math.abs(steer)*0.35)
    const [a,b,c] = h.driftThresholds; kart.driftStage = kart.driftCharge>=c?3:kart.driftCharge>=b?2:kart.driftCharge>=a?1:0
  }
  if (!input.drift && kart.driftDirection !== 0) {
    if (kart.driftStage > 0) { applyBoost(kart,h.driftBoostStrength,h.driftBoostDurations[kart.driftStage-1]); events.push({type:'sound',cue:'boost',kartId:kart.id},{type:'burst',effect:'boost',position:{...kart.position}}) }
    kart.driftDirection=0; kart.driftCharge=0; kart.driftStage=0
  }
  kart.driftHeldLast = input.drift

  const speedRatio = clamp01(Math.abs(kart.speed)/Math.max(1,maxSpeed))
  let yawRate = steer*h.steerRate*(0.35+speedRatio*0.65)*(0.65+racer.stats.handling*0.55)
  if (kart.driftDirection !== 0) yawRate = kart.driftDirection*h.driftSteerRate*(0.65+Math.max(0,steer*kart.driftDirection)*0.5)
  if (kart.speed < -0.1) yawRate *= -0.7
  kart.heading += yawRate*dt
  if (kart.spinTimer > 0) kart.heading += dt*8

  const slip = kart.driftDirection*h.driftSlipRadians*(0.72+Math.max(0,steer*kart.driftDirection)*0.28)
  const moveHeading = kart.heading+slip; kart.position.x += -Math.sin(moveHeading)*kart.speed*dt; kart.position.z += -Math.cos(moveHeading)*kart.speed*dt
  const query = course.queryInto(kart.position,movementQuery,kart.trackT); kart.lastTrackT=kart.trackT; kart.trackT=query.t; kart.lateral=query.lateral; kart.surface=query.surface
  if(!kart.airborne&&kart.padCooldown<=0&&course.def.jumpCrests.some((crest)=>Math.abs(signedWrap(kart.trackT-crest))<.0018)&&kart.speed>6){kart.airborne=true;kart.verticalSpeed=h.hopVelocity*1.16;kart.padCooldown=.85;events.push({type:'sound',cue:'boost',kartId:kart.id})}
  const ground = query.position.y+0.34
  if (query.surface === 'void') { kart.verticalSpeed -= h.gravity*dt; kart.position.y += kart.verticalSpeed*dt; kart.airborne=true }
  else if (kart.airborne) {
    kart.verticalSpeed -= h.gravity*dt; kart.position.y += kart.verticalSpeed*dt
    if (kart.position.y<=ground) { kart.position.y=ground; kart.verticalSpeed=0; kart.airborne=false }
  } else kart.position.y = damp(kart.position.y,ground,18,dt)

  if (query.surface === 'wall') {
    const side = Math.sign(query.lateral)||1; const limit=query.wallHalfWidth-0.55
    kart.position.x=query.position.x+query.rightX*limit*side; kart.position.z=query.position.z+query.rightZ*limit*side
    kart.speed*=h.wallSpeedRetention; kart.lateral=limit*side
    events.push({type:'sound',cue:'hit',kartId:kart.id},{type:'shake',strength:kart.isPlayer?0.35:0})
  }
  if (query.surface === 'boost' && kart.padCooldown<=0) { applyBoost(kart,h.padBoostStrength,h.padBoostSeconds); kart.padCooldown=0.7; events.push({type:'sound',cue:'boost',kartId:kart.id}) }
}

export function resolveKartCollisions(karts: KartState[], events: SimEvent[]): void {
  const radius = CONFIG.handling.kartRadius
  for (let a=0;a<karts.length;a+=1) for (let b=a+1;b<karts.length;b+=1) {
    const first=karts[a], second=karts[b]; if (first.finished||second.finished||distanceSq(first.position,second.position)>(radius*2)**2) continue
    const dx=second.position.x-first.position.x; const dz=second.position.z-first.position.z; const rawDistance=Math.hypot(dx,dz);const distance=rawDistance||0.001; const overlap=radius*2-distance
    const nx=rawDistance===0?1:dx/distance,nz=rawDistance===0?0:dz/distance; const wa=0.45+racerById(first.racerId).stats.weight; const wb=0.45+racerById(second.racerId).stats.weight; const total=wa+wb
    first.position.x-=nx*overlap*(wb/total); first.position.z-=nz*overlap*(wb/total); second.position.x+=nx*overlap*(wa/total); second.position.z+=nz*overlap*(wa/total)
    first.speed*=0.985; second.speed*=0.985
    if (first.isPlayer||second.isPlayer) events.push({type:'shake',strength:0.12})
  }
}

export function headingToward(kart: KartState, x: number, z: number): number {
  return angleDelta(kart.heading,Math.atan2(-(x-kart.position.x),-(z-kart.position.z)))
}
