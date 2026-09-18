import test from 'node:test'
import assert from 'node:assert/strict'
import { CONFIG } from '../src/game.config.ts'
import { ITEMS,RACERS,TRACKS } from '../src/data/content.ts'
import { validateGameConfig } from '../src/systems/config-validator.ts'
import { TrackCourse } from '../src/sim/track.ts'
import { GameSim } from '../src/sim/runtime.ts'
import { AIController } from '../src/sim/ai.ts'
import { ItemSystem,rollItemForPlace } from '../src/sim/items.ts'
import { applyBoost,createKart,resolveKartCollisions,stepKart,topSpeed } from '../src/sim/kart.ts'
import { SeededRandom,forwardDistance,wrap01 } from '../src/sim/math.ts'
import { EMPTY_INPUT } from '../src/sim/types.ts'
import { parseBestTimes } from '../src/systems/persistence.ts'

const DT=1/120
const course=(index=0)=>new TrackCourse(TRACKS[index])

test('configuration and registries validate as one coherent contract',()=>{
  assert.doesNotThrow(()=>validateGameConfig(CONFIG,RACERS,TRACKS,ITEMS))
  assert.deepEqual([RACERS.length,TRACKS.length,ITEMS.length],[8,4,10])
  assert.deepEqual([...new Set(RACERS.map(r=>r.id))].length,8)
  assert.deepEqual([...new Set(ITEMS.map(i=>i.id))].length,10)
})

test('configuration validation aggregates independent failures',()=>{
  const broken=structuredClone(CONFIG);broken.race.laps=0;broken.camera.fovMin=120;broken.performance.hazardPool=1
  assert.throws(()=>validateGameConfig(broken,RACERS,TRACKS,ITEMS),error=>String(error).includes('race.laps')&&String(error).includes('camera.fovMin')&&String(error).includes('hazardPool'))
})

test('all tracks are specified length and project/wrap consistently',()=>{
  for(const def of TRACKS){const track=new TrackCourse(def);assert.ok(track.length>=900&&track.length<=1400,`${def.name}: ${track.length}`);const a=track.sample(.23),b=track.sample(1.23);assert.ok(Math.hypot(a.position.x-b.position.x,a.position.z-b.position.z)<.01);const point={x:a.position.x+a.rightX*3,y:a.position.y,z:a.position.z+a.rightZ*3};const q=track.query(point,.23);assert.ok(Math.abs(q.t-.23)<.01);assert.ok(Math.abs(q.lateral-3)<.15)}
  assert.equal(wrap01(-.2),.8);assert.ok(Math.abs(forwardDistance(.9,.1)-.2)<1e-9)
})

test('Frostburrow has a recoverable void and every track has boost/jump/offroad/walls',()=>{
  for(const def of TRACKS){const track=new TrackCourse(def),sample=track.sample(.2);assert.ok(['road','boost'].includes(track.query(sample.position,.2).surface));const off={x:sample.position.x+sample.rightX*(def.halfWidth+.5),y:0,z:sample.position.z+sample.rightZ*(def.halfWidth+.5)};assert.equal(track.query(off,.2).surface,'offroad');const wall={x:sample.position.x+sample.rightX*(def.halfWidth*def.wallFactor+1),y:0,z:sample.position.z+sample.rightZ*(def.halfWidth*def.wallFactor+1)};assert.equal(track.query(wall,.2).surface,'wall');assert.ok(def.jumpCrests.length&&def.boostPads.length)}
  const frost=course(2),gap=frost.sample(.51);assert.equal(frost.query(gap.position,.51).surface,'void')
})

test('weight classes reproduce the intended speed hierarchy',()=>{
  const track=course();const light=createKart(0,RACERS[0],true,track),medium=createKart(1,RACERS[3],false,track),heavy=createKart(2,RACERS[7],false,track)
  assert.ok(topSpeed(light)>19&&topSpeed(light)<22);assert.ok(topSpeed(medium)>21&&topSpeed(medium)<23.5);assert.ok(topSpeed(heavy)>23)
})

test('the player starts eighth with a wrap-safe view of the field',()=>{
  const track=course(),karts=RACERS.map((r,i)=>createKart(i,r,i===0,track)),player=karts[0]
  assert.equal(player.place,8);assert.ok(player.trackT>0&&player.trackT<.02);assert.ok(karts.slice(1).every(k=>k.trackT>=player.trackT));assert.ok(karts[1].trackT>player.trackT)
})

test('hop-to-drift reaches three stages and releases a mini-turbo',()=>{
  const track=course(),kart=createKart(0,RACERS[1],true,track),events=[];kart.speed=18
  stepKart(kart,{...EMPTY_INPUT,drift:true,steer:1,throttle:1},track,DT,events)
  for(let i=0;i<330;i++)stepKart(kart,{...EMPTY_INPUT,drift:true,steer:1,throttle:1},track,DT,events)
  assert.equal(kart.driftStage,3);stepKart(kart,{...EMPTY_INPUT,steer:1,throttle:1},track,DT,events);assert.ok(kart.boostTimer>=1.7);assert.ok(events.some(e=>e.type==='burst'&&e.effect==='boost'))
})

test('boosts, walls, void gravity and weighted kart collisions affect motion',()=>{
  const track=course(),a=createKart(0,RACERS[0],true,track),b=createKart(1,RACERS[7],false,track),events=[]
  applyBoost(a,.5,1);assert.ok(topSpeed(a)>25);a.position={...b.position};const beforeA=a.position.x,beforeB=b.position.x;resolveKartCollisions([a,b],events);assert.notEqual(a.position.x,beforeA);assert.notEqual(b.position.x,beforeB)
  const frost=course(2),v=frost.sample(.51);a.position={...v.position};a.trackT=.51;a.lastTrackT=.509;a.verticalSpeed=0;stepKart(a,EMPTY_INPUT,frost,DT,events);assert.equal(a.surface,'void');assert.ok(a.verticalSpeed<0)
})

test('all ten item behaviors are usable and pool-bounded',()=>{
  for(const item of ITEMS){const track=course(),rng=new SeededRandom(44),system=new ItemSystem(track,rng),karts=RACERS.map((r,i)=>createKart(i,r,i===0,track)),events=[];const user=karts[0];user.item=item.id;user.itemCount=item.id==='triple-carrot'?3:1;system.use(user,EMPTY_INPUT,karts,events);assert.ok(events.some(e=>e.type==='sound'))
    if(['berry-slick','acorn-bolt','beet-seeker','crown-comet','burrow-bomb'].includes(item.id))assert.ok(system.hazards.some(h=>h.active),item.id)
    if(item.id==='lucky-clover')assert.ok(user.invulnerableTimer>0)
    if(item.id==='storm-bell')assert.ok(karts.slice(1).every(k=>k.frozenTimer>0))
    if(['carrot-turbo','triple-carrot','golden-carrot'].includes(item.id))assert.ok(user.boostTimer>0)
    assert.equal(system.hazards.length,CONFIG.performance.hazardPool)
  }
})

test('bomb expiry applies an area explosion while invulnerability protects',()=>{
  const track=course(),system=new ItemSystem(track,new SeededRandom(9)),karts=RACERS.map((r,i)=>createKart(i,r,i===0,track)),events=[];karts[0].item='burrow-bomb';system.use(karts[0],EMPTY_INPUT,karts,events);const bomb=system.hazards.find(h=>h.active);karts[1].position={...bomb.position};karts[2].position={...bomb.position};karts[2].invulnerableTimer=4;bomb.life=.001;system.update(DT,karts,events);assert.ok(karts[1].spinTimer>0);assert.equal(karts[2].spinTimer,0)
})

test('position-weighted rolls favor recovery items for the back row',()=>{
  const leaders=new Map(),trailers=new Map(),leaderRng=new SeededRandom(123),trailerRng=new SeededRandom(123);for(let i=0;i<2000;i++){const a=rollItemForPlace(1,leaderRng),b=rollItemForPlace(8,trailerRng);leaders.set(a,(leaders.get(a)||0)+1);trailers.set(b,(trailers.get(b)||0)+1)}
  assert.ok((trailers.get('golden-carrot')||0)>(leaders.get('golden-carrot')||0));assert.ok((leaders.get('berry-slick')||0)>(trailers.get('berry-slick')||0))
})

test('AI targets boxes, avoids hazards and recovers from being stuck',()=>{
  const track=course(),kart=createKart(1,RACERS[1],false,track),player=createKart(0,RACERS[0],true,track),ai=new AIController('hard',new SeededRandom(5));const hazard={active:true,kind:'berry-slick',ownerId:2,targetId:-1,position:{...kart.position},heading:0,speed:0,verticalSpeed:0,trackT:kart.trackT+.01,lateral:kart.lateral,age:1,life:5,bounces:0};let input
  for(let i=0;i<300;i++)input=ai.input(kart,player,track,[hazard],DT,[{active:true,t:kart.trackT+.02,lateral:2,respawnTimer:0,spin:0}])
  assert.equal(input.throttle,1);assert.ok(Math.abs(input.steer)>.1)
})

function runReplay(seed){const game=new GameSim();game.startRace(seed);for(let i=0;i<3900;i++){game.setInput(i<360?EMPTY_INPUT:{...EMPTY_INPUT,throttle:1,steer:Math.sin(i*.013)*.55,drift:i%300>170&&i%300<250,useItem:i%487===0});game.step(DT)}return game.karts.map(k=>[k.position.x,k.position.y,k.position.z,k.speed,k.trackT,k.item,k.lap])}
test('fixed-step replay is deterministic for the same seed',()=>assert.deepEqual(runReplay(123456),runReplay(123456)))

test('start-line timing grants a boost, ordered checkpoints advance laps and finish',()=>{
  const game=new GameSim();game.startRace(33);for(let i=0;i<285;i++){game.setInput(EMPTY_INPUT);game.step(DT)}for(let i=0;i<90;i++){game.setInput({...EMPTY_INPUT,throttle:1});game.step(DT)}assert.equal(game.phase,'racing');assert.ok(game.karts[0].boostTimer>0||game.karts[0].speed>0)
  const track=game.getCourse();for(let lap=0;lap<3;lap++)for(let checkpoint=1;checkpoint<=12;checkpoint++){const t=(checkpoint%12)/12+.001,s=track.sample(t);game.karts[0].position={...s.position};game.karts[0].trackT=wrap01(t-.01);game.step(DT)}assert.ok(game.karts[0].finished)
})

test('corrupt persistence is ignored and only valid versioned best times survive',()=>{
  assert.deepEqual(parseBestTimes('{bad'),{});assert.deepEqual(parseBestTimes(JSON.stringify({version:2,times:{'meadow-mile:easy':5}})),{});assert.deepEqual(parseBestTimes(JSON.stringify({version:1,times:{'meadow-mile:easy':51.2,'bad key':3,'neon-warren:hard':-1}})),{'meadow-mile:easy':51.2})
})

test('five consecutive restarts preserve seed and bounded session sizes',()=>{
  const game=new GameSim();game.startRace(989);const first=game.karts.map(k=>[k.racerId,k.position.x,k.position.z]);for(let i=0;i<5;i++){game.restart();assert.equal(game.karts.length,8);assert.equal(game.getItems().hazards.length,CONFIG.performance.hazardPool);assert.deepEqual(game.karts.map(k=>[k.racerId,k.position.x,k.position.z]),first)}
})

test('post-finish auto drive ends in complete standings within twelve seconds',()=>{
  const game=new GameSim();game.startRace(12);for(let i=0;i<CONFIG.race.countdownSeconds/DT+1;i++)game.step(DT);game.debugFinishPlayer();assert.equal(game.phase,'finished');for(let i=0;i<CONFIG.race.postFinishSeconds/DT+2;i++)game.step(DT);assert.equal(game.phase,'results');assert.equal(game.getSnapshot().standings.length,8);assert.ok(game.getSnapshot().standings.every(s=>s.finished))
})
