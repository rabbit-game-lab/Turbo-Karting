import * as pc from 'playcanvas'
import { CONFIG } from '../game.config.ts'

class RallyPostEffect extends pc.PostEffect {
  private readonly shader: pc.Shader
  amount=0.22
  constructor(device: pc.GraphicsDevice) {
    super(device)
    this.shader=pc.ShaderUtils.createShader(device,{
      uniqueName:'HarelineRallyPostFx',attributes:{aPosition:pc.SEMANTIC_POSITION},vertexGLSL:pc.PostEffect.quadVertexShader,
      fragmentGLSL:`
        uniform sampler2D uColorBuffer; uniform float uAmount; varying vec2 vUv0;
        void main(void){
          vec2 p=vUv0-0.5; float edge=1.0-smoothstep(.25,.75,length(p));
          vec3 col=texture2D(uColorBuffer,vUv0).rgb;
          vec3 glow=vec3(0.0);
          glow+=max(texture2D(uColorBuffer,vUv0+vec2(.003,0.)).rgb-.8,0.);
          glow+=max(texture2D(uColorBuffer,vUv0-vec2(.003,0.)).rgb-.8,0.);
          glow+=max(texture2D(uColorBuffer,vUv0+vec2(0.,.005)).rgb-.8,0.);
          glow+=max(texture2D(uColorBuffer,vUv0-vec2(0.,.005)).rgb-.8,0.);
          col=(col+glow*.1*uAmount)*(.94+.06*edge);
          gl_FragColor=vec4(col,1.0);
        }`,
    })
  }
  render(inputTarget: pc.RenderTarget,outputTarget: pc.RenderTarget,rect?: pc.Vec4): void {
    this.device.scope.resolve('uColorBuffer').setValue(inputTarget.colorBuffer)
    this.device.scope.resolve('uAmount').setValue(this.amount)
    this.drawQuad(outputTarget,this.shader,rect)
  }
  release(): void { this.shader.destroy() }
}

export interface PostFxHandle { setSpeed(ratio: number): void; destroy(): void }

/** Mobile-aware single-pass finish. Unsupported devices keep the plain renderer. */
export function createPostFx(camera: pc.Entity): PostFxHandle {
  if (!CONFIG.effects.postFx||!camera.camera||window.matchMedia('(prefers-reduced-motion: reduce)').matches) return {setSpeed(){},destroy(){}}
  try {
    const effect=new RallyPostEffect(camera.camera.system.app.graphicsDevice)
    const queue=camera.camera.postEffects; queue.addEffect(effect)
    const mobile=window.matchMedia('(pointer: coarse)').matches
    return {setSpeed(ratio){effect.amount=Math.min(1,(mobile ? .1 : .18)+ratio*(mobile ? .42 : .82))},destroy(){queue.removeEffect(effect);effect.release()}}
  } catch (error) {
    console.info('Hareline Rally post effect fallback:',error)
    return {setSpeed(){},destroy(){}}
  }
}
