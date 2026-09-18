import './ui.css'
import './presentation.css'
import { trackArt, trackOutline, itemArt } from './art.ts'
import { createRacerShowroom } from './racer-showroom.ts'
import type { QualityChoice } from '../data/visuals.ts'
import { ITEMS, RACERS, TRACKS, itemById, racerById, type Difficulty, type RacerId, type TrackId } from '../data/content.ts'
import type { HudSnapshot } from '../sim/types.ts'
import type { MenuAction } from '../systems/input.ts'

export interface UICallbacks {
  title():void; racers():void; tracks():void; chooseRacer(id:RacerId):void; chooseTrack(id:TrackId):void; chooseDifficulty(value:Difficulty):void
  start():void; pause():void; resume():void; restart():void; toggleMute():void
  quality(choice:QualityChoice):void
}
export interface UIHandle { update(snapshot:HudSnapshot):void; banner(text:string):void; setPaused(value:boolean):void; setMuted(value:boolean):void; setQualityChoice(choice:QualityChoice):void; navigate(action:MenuAction):void; showError(message:string):void; destroy():void }

function element<K extends keyof HTMLElementTagNameMap>(tag:K,className='',text=''):HTMLElementTagNameMap[K]{const node=document.createElement(tag);node.className=className;if(text)node.textContent=text;return node}
function button(text:string,onClick:()=>void,className='rabbit-button'):HTMLButtonElement{const node=element('button',className,text);node.type='button';node.addEventListener('click',onClick);return node}
function formatTime(value:number|null):string{if(value===null||!Number.isFinite(value))return'--:--.---';const minutes=Math.floor(value/60);return`${minutes}:${(value%60).toFixed(3).padStart(6,'0')}`}
function ordinal(value:number):string{return value===1?'1ST':value===2?'2ND':value===3?'3RD':`${value}TH`}

export function createUI(callbacks:UICallbacks):UIHandle {
  const root=document.getElementById('ui')!;root.replaceChildren()
  const topbar=element('div','topbar');const brand=element('div','mini-brand','HARELINE RALLY');const mute=button('SOUND ON',callbacks.toggleMute,'icon-button mute-button');topbar.append(brand,mute)
  const quality=element('select','quality-select');quality.setAttribute('aria-label','Calidad gráfica')
  for(const [value,label] of [['auto','Automática'],['high','Alta'],['medium','Media'],['low','Baja']]){const option=element('option','',label);option.value=value;quality.append(option)}
  quality.addEventListener('change',()=>callbacks.quality(quality.value as QualityChoice));topbar.append(quality)
  const titleScreen=element('section','screen title-screen')
  const eyebrow=element('div','eyebrow','THE GRAND BURROW PRIX');const title=element('h1','game-title','HARELINE');const title2=element('h1','game-title outline','RALLY')
  const slogan=element('p','slogan','Grip the bend. Chase the crown. Leave a trail of sparks.');const race=button('RACE THE HARELINE  ›',callbacks.racers,'rabbit-button primary huge')
  const tips=element('div','control-strip','WASD / ARROWS  ·  SPACE / SHIFT DRIFT  ·  E / CTRL ITEM  ·  Q LOOK BACK')
  titleScreen.append(eyebrow,title,title2,slogan,race,tips)

  const showroom=createRacerShowroom(callbacks.chooseRacer,callbacks.tracks,callbacks.title)
  const racerScreen=showroom.screen

  const trackScreen=element('section','screen selection track-selection hidden');trackScreen.append(screenHeading('02','PICK YOUR CHALLENGE','Every course has a jump, a hairpin, S-bends, and a very long straight.'))
  const trackGrid=element('div','track-grid')
  for(const track of TRACKS){const card=button('',()=>callbacks.chooseTrack(track.id),'track-card');card.dataset.track=track.id;card.style.setProperty('--sky',track.palette.sky);card.style.setProperty('--ground',track.palette.ground);card.style.setProperty('--accent',track.palette.accent)
    const art=element('div',`track-art theme-${track.theme}`);art.append(element('span','track-number',String(TRACKS.indexOf(track)+1).padStart(2,'0')))
    art.append(trackArt(track.id))
    const copy=element('div','track-copy');copy.append(element('strong','',track.name),element('small','',track.description),element('span','track-meta',`${'◆'.repeat(track.difficulty)}${'◇'.repeat(3-track.difficulty)} · 3 LAPS`));card.append(art,copy);trackGrid.append(card)}
  const difficulty=element('div','difficulty-row');difficulty.append(element('span','field-label','DIFFICULTY'))
  for(const value of ['easy','normal','hard'] as const){const node=button(value.toUpperCase(),()=>callbacks.chooseDifficulty(value),'difficulty-button');node.dataset.difficulty=value;difficulty.append(node)}
  const start=button('START RACE  ›',callbacks.start,'rabbit-button primary start-race');trackScreen.append(trackGrid,difficulty,start,button('‹ RACERS',callbacks.racers,'rabbit-button ghost'))

  const loading=element('section','screen loading-screen hidden');loading.append(element('div','loader-rabbit','◖ ◗'),element('h2','','DIGGING THE STARTING TUNNEL…'),element('p','','Building the track, briefing seven rivals, polishing carrots.'))
  const raceHud=buildRaceHud(callbacks);const pauseOverlay=buildPause(callbacks);const results=element('section','screen results-screen hidden')
  const bannerNode=element('div','race-banner hidden');const error=element('div','fatal-error hidden')
  root.append(topbar,titleScreen,racerScreen,trackScreen,loading,raceHud.root,pauseOverlay,results,bannerNode,error)
  let phase:HudSnapshot['phase']='title',bannerTimer=0,paused=false,renderedResults=false
  let lastItem='',lastTrack=''

  function update(snapshot:HudSnapshot):void{
    phase=snapshot.phase
    for(const screen of [titleScreen,racerScreen,trackScreen,loading,results])screen.classList.add('hidden')
    raceHud.root.classList.add('hidden');topbar.classList.toggle('during-race',snapshot.phase==='countdown'||snapshot.phase==='racing'||snapshot.phase==='finished')
    if(snapshot.phase==='title')titleScreen.classList.remove('hidden');else if(snapshot.phase==='racerSelect')racerScreen.classList.remove('hidden');else if(snapshot.phase==='trackSelect')trackScreen.classList.remove('hidden');else if(snapshot.phase==='loading')loading.classList.remove('hidden');else if(snapshot.phase==='results'){results.classList.remove('hidden');if(!renderedResults){renderResults(results,snapshot,callbacks);renderedResults=true}}else raceHud.root.classList.remove('hidden')
    if(snapshot.phase!=='results')renderedResults=false
    showroom.update(snapshot.selectedRacerId)
    for(const card of trackGrid.querySelectorAll<HTMLElement>('[data-track]'))card.classList.toggle('selected',card.dataset.track===snapshot.selectedTrackId)
    for(const node of difficulty.querySelectorAll<HTMLElement>('[data-difficulty]'))node.classList.toggle('selected',node.dataset.difficulty===snapshot.difficulty)
    raceHud.lap.textContent=`LAP ${Math.min(snapshot.lap,snapshot.totalLaps)} / ${snapshot.totalLaps}`;raceHud.place.textContent=ordinal(snapshot.place);raceHud.speed.textContent=String(Math.round(snapshot.speedKph));raceHud.time.textContent=formatTime(snapshot.raceTime);raceHud.best.textContent=`BEST ${formatTime(snapshot.bestTime)}`
    const item=snapshot.item?itemById(snapshot.item):undefined;raceHud.itemGlyph.textContent=snapshot.roulette?ITEMS[Math.floor(performance.now()/80)%ITEMS.length].glyph:item?.glyph??'—';raceHud.itemName.textContent=snapshot.roulette?'ROULETTE':item?`${item.name}${snapshot.itemCount>1?` ×${snapshot.itemCount}`:''}`:'NO ITEM'
    const iconId=snapshot.roulette?ITEMS[Math.floor(performance.now()/100)%ITEMS.length].id:snapshot.item
    if(iconId!==lastItem){lastItem=iconId??'';raceHud.itemIcon.replaceChildren();if(iconId)raceHud.itemIcon.append(itemArt(iconId))}
    raceHud.drift.style.setProperty('--charge',String(snapshot.driftStage/3));raceHud.drift.dataset.stage=String(snapshot.driftStage)
    raceHud.wrong.classList.toggle('hidden',!snapshot.wrongWay);raceHud.countdown.textContent=snapshot.countdown>0?String(snapshot.countdown):'';raceHud.countdown.classList.toggle('hidden',snapshot.phase!=='countdown')
    const outline=trackOutline(snapshot.selectedTrackId)
    if(lastTrack!==snapshot.selectedTrackId){lastTrack=snapshot.selectedTrackId;raceHud.mapPath.setAttribute('d',outline.path)}
    for(let i=0;i<raceHud.dots.length;i+=1){const kart=snapshot.karts[i];if(!kart)continue;raceHud.dots[i].style.left=`${((kart.position.x-outline.minX)*outline.scale+20)/2}%`;raceHud.dots[i].style.top=`${((kart.position.z-outline.minZ)*outline.scale+20)/2}%`;raceHud.dots[i].classList.toggle('player',i===0)}
    if(bannerTimer>0){bannerTimer-=.12;if(bannerTimer<=0)bannerNode.classList.add('hidden')}
  }
  function navigate(action:MenuAction):void{if(paused){if(action==='confirm')callbacks.resume();return}const buttons=[...root.querySelectorAll<HTMLButtonElement>('.screen:not(.hidden) button:not([disabled])')];if(buttons.length===0)return;let index=Math.max(0,buttons.indexOf(document.activeElement as HTMLButtonElement));if(action==='confirm'){buttons[index].click();return}if(action==='back'){if(phase==='trackSelect')callbacks.racers();else if(phase==='racerSelect')callbacks.title();return}index=(index+(action==='left'||action==='up'?-1:1)+buttons.length)%buttons.length;buttons[index].focus()}
  return {update,setQualityChoice(choice){quality.value=choice},banner(text){bannerNode.textContent=text;bannerNode.classList.remove('hidden');bannerTimer=2.5},setPaused(value){paused=value;pauseOverlay.classList.toggle('hidden',!value)},setMuted(value){mute.textContent=value?'SOUND OFF':'SOUND ON';mute.classList.toggle('muted',value)},navigate,showError(message){error.textContent=`HARELINE COULD NOT START\n${message}`;error.classList.remove('hidden')},destroy(){root.replaceChildren()}}
}

function bars(value:number):string{return'▮'.repeat(Math.max(1,Math.round(value*5)))+'▯'.repeat(Math.max(0,5-Math.round(value*5)))}
function screenHeading(index:string,title:string,subtitle:string):HTMLElement{const wrap=element('header','screen-heading');const copy=element('div');copy.append(element('h2','',title),element('p','',subtitle));wrap.append(element('span','step-index',index),copy);return wrap}
function buildPause(callbacks:UICallbacks):HTMLElement{const overlay=element('div','pause-overlay hidden');const panel=element('div','pause-panel');panel.append(element('span','eyebrow','RACE CONTROL'),element('h2','','PAUSED'),element('p','','Take a breath. The hareline will wait.'),button('RESUME',callbacks.resume,'rabbit-button primary'),button('RESTART RACE',callbacks.restart),button('QUIT TO TITLE',callbacks.title,'rabbit-button ghost'));overlay.append(panel);return overlay}
function buildRaceHud(callbacks:UICallbacks){const root=element('section','race-hud hidden');const lap=element('div','hud-lap'),place=element('div','hud-place'),time=element('div','hud-time'),best=element('div','hud-best');const speed=element('strong','speed-number');const speedBox=element('div','speed-box');speedBox.append(speed,element('span','','KM/H'))
  const itemBox=element('div','item-box');const itemGlyph=element('strong','item-glyph','—'),itemName=element('span','item-name','NO ITEM');itemBox.append(itemGlyph,itemName)
  const itemIcon=element('div','item-icon');itemBox.append(itemIcon)
  const drift=element('div','drift-meter');drift.append(element('span','','MINI-TURBO'),element('i'))
  const minimap=element('div','minimap');const dots:HTMLElement[]=[];for(let i=0;i<8;i+=1){const dot=element('b','map-dot');minimap.append(dot);dots.push(dot)}
  const mapSvg=document.createElementNS('http://www.w3.org/2000/svg','svg');mapSvg.setAttribute('viewBox','0 0 200 200');const mapPath=document.createElementNS('http://www.w3.org/2000/svg','path');mapSvg.append(mapPath);minimap.prepend(mapSvg)
  const wrong=element('div','wrong-way hidden','WRONG WAY');const countdown=element('div','countdown hidden');const pause=button('Ⅱ',callbacks.pause,'pause-button');const left=element('div','hud-left'),right=element('div','hud-right');left.append(lap,place,time,best);right.append(itemBox,speedBox,drift);root.append(left,right,minimap,wrong,countdown,pause);return{root,lap,place,time,best,speed,itemGlyph,itemName,itemIcon,mapPath,drift,wrong,countdown,dots}}
function renderResults(root:HTMLElement,snapshot:HudSnapshot,callbacks:UICallbacks):void{root.replaceChildren();const player=snapshot.standings.find(s=>s.kartId===0);root.append(element('span','eyebrow',player?.place===1?'A GOLDEN RUN':'RACE COMPLETE'),element('h2','results-title',player?.place===1?'VICTORY!':`${ordinal(player?.place??1)} PLACE`),element('p','results-time',formatTime(player?.time??snapshot.raceTime)))
  const board=element('div','standings');for(const standing of snapshot.standings){const racer=racerById(standing.racerId);const row=element('div',`standing-row${standing.kartId===0?' player':''}`);row.append(element('b','',ordinal(standing.place)),element('i','racer-swatch'));(row.children[1] as HTMLElement).style.background=racer.color;row.append(element('span','',racer.name),element('time','',formatTime(standing.time)));board.append(row)}root.append(board,element('p','best-callout',`PERSONAL BEST · ${formatTime(snapshot.bestTime)}`),button('RACE AGAIN',callbacks.restart,'rabbit-button primary'),button('CHANGE COURSE',callbacks.tracks),button('TITLE',callbacks.title,'rabbit-button ghost'))}
