import * as pc from 'playcanvas'
import { ITEMS, RACERS, TRACKS, trackById, type Difficulty, type RacerId, type TrackId } from '../data/content.ts'
import { MenuView } from '../entities/menu-view.ts'
import { createPostFx } from '../entities/post-fx.ts'
import { ProceduralResources } from '../entities/resources.ts'
import { RaceView } from '../entities/race-view.ts'
import { createScene } from '../entities/scene.ts'
import { CONFIG } from '../game.config.ts'
import { createPause } from '../rabbit/pause.ts'
import { sim } from '../sim/runtime.ts'
import { EMPTY_INPUT, type GamePhase, type RaceInputSnapshot } from '../sim/types.ts'
import { createUI, type UIHandle } from '../ui/hud.ts'
import { RallyAudio } from './audio.ts'
import { validateGameConfig } from './config-validator.ts'
import { createRaceInput } from './input.ts'
import { loadBestTimes, saveBestTimes } from './persistence.ts'
import { QualityController } from './quality.ts'
import type { QualityChoice } from '../data/visuals.ts'
import { installTelemetry } from './telemetry.ts'

const FIXED_STEP=1/120,MAX_FRAME_DELTA=.05
const RACE_PHASES:readonly GamePhase[]=['countdown','racing','finished']

export interface GameHandle { restart():void; setMuted(muted:boolean):void; setPaused(paused:boolean):void; destroy():void }

export class GameLoopScript extends pc.Script {
  static scriptName='gameLoopScript'
  tick!:(dt:number)=>void
  update(dt:number):void{this.tick(dt)}
}

export function setupGame(app:pc.Application):GameHandle {
  validateGameConfig(CONFIG,RACERS,TRACKS,ITEMS)
  const resources=new ProceduralResources(app.graphicsDevice),scene=createScene(app),menuView=new MenuView(app,resources)
  const quality=new QualityController(window.matchMedia('(pointer: coarse)').matches)
  const staticBatchGroup=app.batcher.addGroup('hareline-track-static',false,180)
  const dynamicBatchGroup=app.batcher.addGroup('hareline-session-dynamic',true,500)
  const input=createRaceInput(),audio=new RallyAudio(),postFx=createPostFx(scene.camera)
  let raceView:RaceView|null=null,paused=false,muted=false,accumulator=0,lastPhase:GamePhase='title',publishClock=0,startToken=0
  let ui!:UIHandle, pause!:ReturnType<typeof createPause>, destroyed=false
  let sessionsBuilt = 0
  const modelsLoaded=resources.loadModels(app).then(()=>{
    if(!destroyed){menuView.select(sim.selectedRacerId,true);scene.setBackdrop(resources.backdrop('meadow'))}
  }).catch((error:unknown)=>{if(!destroyed)ui.showError(String(error));throw error})
  const applyQuality=()=>{
    app.graphicsDevice.maxPixelRatio=Math.min(window.devicePixelRatio||1,quality.profile.pixelRatio)*quality.resolutionScale
    app.resizeCanvas(app.graphicsDevice.canvas.clientWidth,app.graphicsDevice.canvas.clientHeight)
    scene.setQuality(quality.level);raceView?.setQuality(quality.level)
  }
  applyQuality()

  const publish=()=>ui.update(sim.getSnapshot())
  const configureMenu=()=>{raceView?.destroy();raceView=null;menuView.setVisible(true);input.setTouchVisible(false);postFx.setSpeed(0);scene.setPalette('#53bde5','#e0f5d5');scene.setBackdrop(resources.backdrop('meadow'));scene.camera.setPosition(0,4.2,9);scene.camera.lookAt(2.5,1,-3);accumulator=0}
  const title=()=>{startToken+=1;pause?.set(false);configureMenu();sim.showTitle();input.clear();publish()}
  const racers=()=>{configureMenu();sim.showRacers();input.clear();publish();audio.cue('menu')}
  const tracks=()=>{configureMenu();sim.showTracks();input.clear();publish();audio.cue('menu')}
  const constructRace=(restart=false)=>{
    sessionsBuilt += 1
    raceView?.destroy(); if(restart)sim.restart();else sim.startRace()
    const def=trackById(sim.selectedTrackId);scene.setPalette(def.palette.sky,def.palette.fog);menuView.setVisible(false);input.clear();input.setTouchVisible(true)
    scene.setTrack(sim.selectedTrackId)
    scene.setBackdrop(resources.backdrop(def.theme))
    raceView=new RaceView(app,sim,scene.camera,resources,staticBatchGroup.id,dynamicBatchGroup.id)
    raceView.setQuality(quality.level)
    sim.setLoading(); publish()
    const token=++startToken, builder=raceView.build()
    const buildFrame=()=>{
      if(token!==startToken||sim.phase!=='loading')return
      const deadline=performance.now()+7
      let done=false
      do { done=Boolean(builder.next().done) } while(!done&&performance.now()<deadline)
      if(!done){requestAnimationFrame(buildFrame);return}
      sim.phase='countdown';accumulator=0;lastPhase=sim.phase;publish()
    }
    requestAnimationFrame(buildFrame)
  }
  const start=()=>{sim.setLoading();publish();const token=++startToken;void modelsLoaded.then(()=>requestAnimationFrame(()=>{if(token===startToken&&sim.phase==='loading')constructRace()}))}
  const restart=()=>{startToken+=1;pause?.set(false);if(sim.getCourse()){constructRace(true)}else title()}
  const toggleMute=()=>{muted=!muted;audio.setMuted(muted);ui.setMuted(muted)}

  ui=createUI({title,racers,tracks,quality(choice:QualityChoice){quality.select(choice);applyQuality()},chooseRacer(id:RacerId){sim.chooseRacer(id);menuView.select(id);publish();audio.cue('select')},chooseTrack(id:TrackId){sim.chooseTrack(id);publish();audio.cue('select')},chooseDifficulty(value:Difficulty){sim.chooseDifficulty(value);publish();audio.cue('select')},start,
    pause(){pause.toggle()},resume(){pause.set(false)},restart,toggleMute})
  sim.setBestTimes(loadBestTimes());publish()
  pause=createPause({overlay:false,pauseOnBlur:false,inputs:[input],onChange(value){paused=value;app.timeScale=value?0:1;ui.setPaused(value);audio.setPaused(value);input.clear()}})
  input.setPauseHandler(()=>pause.toggle())
  const onBlur=()=>input.clear();window.addEventListener('blur',onBlur)

  const gameEntity=new pc.Entity('hareline-game-loop');gameEntity.addComponent('script')
  const loop=gameEntity.script!.create(GameLoopScript) as unknown as GameLoopScript
  let latestInput:RaceInputSnapshot={...EMPTY_INPUT}
  loop.tick=(rawDt:number)=>{
    if(quality.update(rawDt,sim.phase==='racing'&&!paused&&!document.hidden))applyQuality()
    const dt=Math.min(MAX_FRAME_DELTA,Math.max(0,rawDt));menuView.update(dt,sim.phase==='racerSelect')
    for(const action of input.consumeMenu())if(!RACE_PHASES.includes(sim.phase))ui.navigate(action)
    if(RACE_PHASES.includes(sim.phase)&&!paused){
      latestInput=input.snapshot(dt);accumulator=Math.min(accumulator+dt,FIXED_STEP*CONFIG.performance.maxCatchUpSteps)
      let steps=0
      while(accumulator>=FIXED_STEP&&steps<CONFIG.performance.maxCatchUpSteps){raceView?.capture();sim.setInput(latestInput);sim.step(FIXED_STEP);latestInput.useItem=false;accumulator-=FIXED_STEP;steps+=1}
      raceView?.sync(dt,latestInput,accumulator/FIXED_STEP);postFx.setSpeed(Math.min(1,Math.abs(sim.karts[0]?.speed??0)/24))
    }
    if(sim.phase!==lastPhase&&(sim.phase==='finished'||sim.phase==='results')){input.clear();input.setTouchVisible(false)}
    const events=sim.consumeEvents();for(const event of events){raceView?.event(event);if(event.type==='sound')audio.cue(event.cue);else if(event.type==='banner')ui.banner(event.text)}
    audio.update(dt,sim.phase,sim.karts);publishClock+=dt
    if(sim.phase!==lastPhase||events.length>0||publishClock>=.08){if(sim.phase==='results'&&lastPhase!=='results')saveBestTimes(sim.getBestTimes());lastPhase=sim.phase;publishClock=0;publish()}
  }
  app.root.addChild(gameEntity)

  const destroyQa=import.meta.env.DEV&&new URLSearchParams(location.search).has('qa')?installQa(app,()=>constructRace(),restart,pause):()=>{}
  if (import.meta.env.DEV) {
    const params=new URLSearchParams(location.search)
    const track=TRACKS.find(entry=>entry.id===params.get('track'))
    if(params.has('qa')&&track)void modelsLoaded.then(()=>{
      if(destroyed)return
      sim.chooseTrack(track.id)
      const racer=RACERS.find(entry=>entry.id===params.get('racer'))
      if(racer)sim.chooseRacer(racer.id)
      const profile=params.get('quality')
      if(profile==='low'||profile==='medium'||profile==='high'){quality.select(profile);ui.setQualityChoice(profile);applyQuality()}
      constructRace()
      if(params.has('auto'))sim.debugDrive()
    })
  }
  const destroyMetrics=new URLSearchParams(location.search).has('qa')||new URLSearchParams(location.search).has('benchmark')
    ?installTelemetry(app,()=>sim.phase==='racing'&&!paused,()=>({phase:sim.phase,track:sim.selectedTrackId,quality:quality.level,sessionsBuilt,entities:countGraph(app.root),cache:resources.counts})):()=>{}
  return {restart,setMuted(value){muted=value;audio.setMuted(value);ui.setMuted(value)},setPaused(value){pause.set(value)},destroy(){destroyed=true;startToken+=1;destroyQa();destroyMetrics();window.removeEventListener('blur',onBlur);pause.destroy();input.destroy();audio.destroy();postFx.destroy();raceView?.destroy();app.batcher.removeGroup(staticBatchGroup.id);app.batcher.removeGroup(dynamicBatchGroup.id);menuView.destroy();scene.destroy();resources.destroy();ui.destroy();gameEntity.destroy()}}
}

function countGraph(node:pc.GraphNode):number { let total=1;for(const child of node.children)total+=countGraph(child);return total }

function installQa(app:pc.Application,start:()=>void,restart:()=>void,pause:ReturnType<typeof createPause>):()=>void {
  const target=window as typeof window&{__HARELINE_QA__?:unknown}
  const grant=(item:string)=>{if(ITEMS.some(entry=>entry.id===item))sim.debugGrantItem(item as (typeof ITEMS)[number]['id'])}
  const metrics=()=>{const {frame,drawCalls,vram}=app.stats;return {fps:frame.fps,frameMs:frame.ms,triangles:frame.triangles,entities:countGraph(app.root),drawCalls:drawCalls.total,shadowDrawCalls:drawCalls.shadow,instancedDrawCalls:drawCalls.instanced,removedByInstancing:drawCalls.removedByInstancing,vramBytes:vram.tex+vram.vb+vram.ib}}
  target.__HARELINE_QA__={racers:RACERS.map(r=>r.id),tracks:TRACKS.map(t=>t.id),items:ITEMS.map(i=>i.id),select(racer:RacerId,track:TrackId,difficulty:Difficulty){sim.chooseRacer(racer);sim.chooseTrack(track);sim.chooseDifficulty(difficulty);start()},grant,finish(){sim.debugFinishPlayer()},pause(){pause.toggle()},restart,
    studioPause(value=true){window.postMessage({type:'rabbit:pause',paused:value},'*')},studioRestart(){window.postMessage({type:'rabbit:restart'},'*')},studioMute(value=true){window.postMessage({type:'rabbit:mute',muted:value},'*')},snapshot(){return sim.getSnapshot()},metrics}
  let seek=0
  const onKey=(event:KeyboardEvent)=>{if(event.code==='F9')sim.debugFinishPlayer();else if(event.code==='F8')restart();else if(event.code==='F7')pause.toggle();else if(event.code==='F6')sim.debugDrive();else if(event.code==='F4'){sim.debugSeek([.12,.31,.51,.78][seek++%4])}else if(/^Digit[0-9]$/.test(event.code)){const index=event.code==='Digit0'?9:Number(event.code.slice(5))-1;grant(ITEMS[index]?.id??'')}}
  window.addEventListener('keydown',onKey)
  return()=>{window.removeEventListener('keydown',onKey);delete target.__HARELINE_QA__}
}
