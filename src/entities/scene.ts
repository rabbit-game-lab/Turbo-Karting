import * as pc from 'playcanvas'
import { color } from './helpers'
import { TRACK_VISUALS, type QualityLevel } from '../data/visuals.ts'
import { CONFIG } from '../game.config.ts'
import type { TrackId } from '../data/content.ts'
import { createEnvironment } from './environment.ts'

export interface SceneHandle {
  camera: pc.Entity
  setPalette(sky: string, fog: string): void
  setTrack(id: TrackId): void
  setQuality(level: QualityLevel): void
  setBackdrop(texture: pc.Texture | null): void
  destroy(): void
}

/** App-scoped camera and lighting. Race scenery is owned by RaceView. */
export function createScene(app: pc.Application): SceneHandle {
  const root = new pc.Entity('hareline-stage')
  const destroyEnvironment = createEnvironment(app)
  app.root.addChild(root)
  app.scene.ambientLight = color('#a9b7cf')
  app.scene.fog.type = pc.FOG_EXP
  app.scene.fog.density = 0.0020

  const skyGeometry = new pc.SphereGeometry({ latitudeBands: 12, longitudeBands: 24 })
  skyGeometry.colors = new Array(skyGeometry.positions!.length / 3 * 4).fill(255)
  const skyMesh = pc.Mesh.fromGeometry(app.graphicsDevice, skyGeometry)
  const skyMaterial = new pc.StandardMaterial()
  skyMaterial.useLighting = false; skyMaterial.emissive = new pc.Color(1,1,1)
  skyMaterial.diffuse.set(0, 0, 0)
  skyMaterial.emissiveVertexColor = true; skyMaterial.cull = pc.CULLFACE_FRONT; skyMaterial.depthWrite = true
  skyMaterial.useFog = false
  skyMaterial.update()
  const skyEntity = new pc.Entity('gradient-sky')
  skyEntity.addComponent('render', { meshInstances: [new pc.MeshInstance(skyMesh, skyMaterial)], castShadows: false })
  skyEntity.setLocalScale(1000,1000,1000); root.addChild(skyEntity)
  const paintSky = (zenith: string, horizon: string) => {
    const top = color(zenith), bottom = color(horizon), colors: number[] = []
    for(let i=0;i<skyGeometry.positions!.length;i+=3){
      const t=Math.min(1,Math.max(0,skyGeometry.positions![i+1]*3))
      colors.push(Math.round((bottom.r+(top.r-bottom.r)*t)*255),Math.round((bottom.g+(top.g-bottom.g)*t)*255),Math.round((bottom.b+(top.b-bottom.b)*t)*255),255)
    }
    skyMesh.setColors32(colors);skyMesh.update()
  }
  paintSky('#53bde5','#e0f5d5')

  const sun = new pc.Entity('festival-sun')
  sun.addComponent('light', { type: 'directional', color: color('#fff4d6'), intensity: 1.35, castShadows: true, shadowResolution: 1024, shadowDistance: 80 })
  sun.setLocalEulerAngles(48, 32, 12)
  root.addChild(sun)

  const fill = new pc.Entity('sky-fill')
  fill.addComponent('light', { type: 'directional', color: color('#8ddcff'), intensity: 0.38, castShadows: false })
  fill.setLocalEulerAngles(-35, -120, 0)
  root.addChild(fill)

  const camera = new pc.Entity('race-camera')
  camera.addComponent('camera', {
    fov: 72,
    nearClip: 0.15,
    farClip: 900,
    clearColor: color('#72d8ff'),
    toneMapping: pc.TONEMAP_ACES,
    gammaCorrection: pc.GAMMA_SRGB,
  })
  camera.setLocalPosition(0, 4.2, 9)
  camera.lookAt(2.5, 1, -3)
  root.addChild(camera)

  return {
    camera,
    setBackdrop(texture) {
      skyMaterial.emissiveVertexColor = !texture
      skyMaterial.emissiveMap = texture
      skyMaterial.emissiveIntensity = .85
      skyMaterial.update()
    },
    setPalette(sky, fog) {
      camera.camera!.clearColor = color(sky)
      app.scene.fog.color.copy(color(fog))
      paintSky(sky,fog)
    },
    setTrack(id) {
      const visual=TRACK_VISUALS[id]
      paintSky(visual.sky,visual.horizon)
      app.scene.fog.color.copy(color(visual.horizon))
      app.scene.ambientLight.copy(color(visual.ambient))
      sun.light!.color=color(visual.sun);sun.light!.intensity=visual.sunIntensity
    },
    setQuality(level) { sun.light!.castShadows=CONFIG.graphics.profiles[level].shadows },
    destroy() { destroyEnvironment(); root.destroy(); skyMaterial.destroy() },
  }
}
