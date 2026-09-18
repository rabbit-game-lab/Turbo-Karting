import { CONFIG } from '../game.config.ts'
import { createSound } from '../rabbit/sound.ts'
import * as sdk from '../rabbit/sdk.ts'
import type { GamePhase, KartState, SoundCue } from '../sim/types.ts'

const MELODIES: Record<'menu'|'race'|'final'|'results',readonly number[]>={
  menu:[392,494,587,494,440,523,659,523],race:[220,330,440,554,247,370,494,659],
  final:[294,440,587,740,330,494,659,784],results:[523,659,784,1047,784,659,587,523],
}

export class RallyAudio {
  private readonly sound=createSound({volumes:{music:CONFIG.audio.musicVolume,sfx:CONFIG.audio.sfxVolume}})
  private mode: keyof typeof MELODIES='menu'; private beat=0; private beatClock=0; private engineClock=0; private paused=false;private unlocked=false
  private readonly unlock=()=>{if(this.unlocked)return;this.unlocked=true;this.sound.tone({duration:.01,volume:.0001});sdk.audio.unlock()}
  constructor(){window.addEventListener('pointerdown',this.unlock,{passive:true});window.addEventListener('keydown',this.unlock,{passive:true});window.addEventListener('touchstart',this.unlock,{passive:true})}

  update(dt:number,phase:GamePhase,karts:readonly KartState[]): void {
    const next=phase==='results'?'results':phase==='finished'?'final':phase==='racing'||phase==='countdown'?'race':'menu'
    if(next!==this.mode){this.mode=next;this.beat=0;this.beatClock=0}
    if(this.paused||!this.unlocked)return
    const tempo=this.mode==='final' ? .145 : this.mode==='race' ? .19 : .29
    this.beatClock-=dt
    if(this.beatClock<=0){
      this.beatClock+=tempo; const melody=MELODIES[this.mode],freq=melody[this.beat++%melody.length]
      this.sound.tone({freq,duration:tempo*.48,type:this.mode==='menu'?'sine':'triangle',volume:.018,group:'music',release:tempo*.34})
      if(this.beat%4===1)this.sound.tone({freq:freq/2,duration:tempo*.8,type:'sine',volume:.012,group:'music'})
    }
    this.engineClock-=dt
    if(this.engineClock<=0&&karts.length>0&&(phase==='racing'||phase==='finished')){
      this.engineClock=.12; const player=karts[0]; const speed=Math.abs(player.speed)
      this.sound.tone({freq:72+speed*5.3,duration:.1,type:'sawtooth',volume:CONFIG.audio.engineVolume*.055,group:'sfx',slideTo:78+speed*5.5,attack:.025,release:.04})
    }
  }

  cue(cue:SoundCue): void {
    if(this.paused||!this.unlocked)return
    if(cue==='countdown')this.sound.tone({freq:440,duration:.12,type:'square',volume:.042})
    else if(cue==='go')this.sound.tone({freq:660,slideTo:990,duration:.32,type:'sawtooth',volume:.05})
    else if(cue==='select'||cue==='menu')this.sound.tone({freq:cue==='select'?740:560,duration:.07,type:'sine',volume:.035})
    else if(cue==='pickup')for(const [i,f] of [620,820,1080].entries())this.sound.tone({freq:f,duration:.08,delayMs:i*55,type:'square',volume:.025})
    else if(cue==='boost'){this.sound.noise({duration:.24,filter:'bandpass',freq:900,freqTo:3200,volume:.045});this.sound.tone({freq:150,slideTo:380,duration:.22,type:'sawtooth',volume:.028})}
    else if(cue==='drift')this.sound.noise({duration:.13,filter:'highpass',freq:1800,freqTo:800,volume:.035})
    else if(cue==='hit'){this.sound.noise({duration:.2,filter:'lowpass',freq:700,freqTo:120,volume:.09});this.sound.tone({freq:110,slideTo:55,duration:.18,volume:.04})}
    else if(cue==='item')this.sound.tone({freq:520,slideTo:260,duration:.18,type:'square',volume:.035})
    else if(cue==='lap')for(const [i,f] of [523,659,784].entries())this.sound.tone({freq:f,duration:.16,delayMs:i*90,volume:.042})
    else if(cue==='finish')for(const [i,f] of [523,659,784,1047].entries())this.sound.tone({freq:f,duration:.26,delayMs:i*110,type:'triangle',volume:.045})
  }
  setPaused(value:boolean):void{this.paused=value;if(value)this.sound.stop('music')}
  setMuted(value:boolean):void{this.sound.setMuted(value)}
  destroy():void{window.removeEventListener('pointerdown',this.unlock);window.removeEventListener('keydown',this.unlock);window.removeEventListener('touchstart',this.unlock);this.sound.destroy()}
}
