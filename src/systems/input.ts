import { CONFIG } from '../game.config.ts'
import { createGamepad } from '../rabbit/gamepad.ts'
import { createKeyboard } from '../rabbit/keyboard.ts'
import { createTouch } from '../rabbit/touch.ts'
import { clamp } from '../sim/math.ts'
import { deviceSteerToHeading } from './steering.ts'
import type { RaceInputSnapshot } from '../sim/types.ts'

export type MenuAction='left'|'right'|'up'|'down'|'confirm'|'back'
type Action='left'|'right'|'up'|'down'|'drift'|'item'|'lookBack'|'confirm'|'back'|'pause'
const KEY_MAP: Record<Action,readonly string[]>={
  left:['ArrowLeft','KeyA'],right:['ArrowRight','KeyD'],up:['ArrowUp','KeyW'],down:['ArrowDown','KeyS'],
  drift:['Space','ShiftLeft','ShiftRight'],item:['KeyE','ControlLeft','ControlRight'],lookBack:['KeyQ'],confirm:['Enter'],back:['Backspace'],pause:[],
}

export interface InputHandle {
  snapshot(dt: number): RaceInputSnapshot
  consumeMenu(): MenuAction[]
  setPauseHandler(callback:()=>void): void
  setPaused(value:boolean): void
  clear(): void
  setTouchVisible(value:boolean): void
  destroy(): void
}

export function createRaceInput(): InputHandle {
  const keyboard=createKeyboard(KEY_MAP)
  const pad=createGamepad<Action>({deadZone:CONFIG.controls.gamepadDeadZone,target:keyboard,map:{
    buttons:{0:'drift',5:'drift',2:'item',4:'item',3:'lookBack',6:'down',7:'up',9:'pause',1:'back',12:'up',13:'down',14:'left',15:'right'},
    axes:{0:{negative:'left',positive:'right'}},
  }})
  const touch=createTouch<Action>({target:keyboard,joystick:{left:'left',right:'right',up:'up',down:'down'},buttons:[{action:'drift',label:'DRIFT'},{action:'item',label:'ITEM'}],size:CONFIG.controls.touchSize,opacity:.72})
  const menu: MenuAction[]=[]; let itemEdge=false,steer=0,pauseHandler=()=>{}
  const off=[
    keyboard.onDown('item',()=>{itemEdge=true}), keyboard.onDown('pause',()=>pauseHandler()), pad.onDown('pause',()=>pauseHandler()),
    keyboard.onDown('left',()=>menu.push('left')),keyboard.onDown('right',()=>menu.push('right')),keyboard.onDown('up',()=>menu.push('up')),keyboard.onDown('down',()=>menu.push('down')),
    keyboard.onDown('confirm',()=>menu.push('confirm')),keyboard.onDown('drift',()=>menu.push('confirm')),keyboard.onDown('back',()=>menu.push('back')),
  ]
  function snapshot(dt:number): RaceInputSnapshot {
    const touchAxis=touch.axis(),padAxis=pad.axis(); const desired=clamp(Math.abs(touchAxis.x)>Math.abs(padAxis.x)?touchAxis.x:padAxis.x,-1,1)
    const digital=(keyboard.pressed('right')?1:0)-(keyboard.pressed('left')?1:0); const target=Math.abs(desired)>0.01?desired:digital
    const rise=Math.abs(target)>Math.abs(steer)?CONFIG.controls.keyboardSteerRise:CONFIG.controls.keyboardSteerFall
    steer+=clamp(target-steer,-rise*dt,rise*dt)
    const result={throttle:Math.max(keyboard.pressed('up')?1:0,pad.analog('up'),Math.max(0,-touchAxis.y)),brake:Math.max(keyboard.pressed('down')?1:0,pad.analog('down'),Math.max(0,touchAxis.y)),steer:deviceSteerToHeading(steer),
      drift:keyboard.pressed('drift'),useItem:itemEdge,lookBack:keyboard.pressed('lookBack')}
    itemEdge=false; return result
  }
  return {
    snapshot,consumeMenu(){return menu.splice(0)},setPauseHandler(callback){pauseHandler=callback},
    setPaused(value){keyboard.setPaused(value);touch.setPaused(value)},clear(){steer=0;itemEdge=false;menu.length=0;keyboard.setPaused(true);keyboard.setPaused(false)},
    setTouchVisible(value){touch.setVisible(value)},destroy(){for(const unsub of off)unsub();pad.destroy();touch.destroy();keyboard.destroy()},
  }
}
