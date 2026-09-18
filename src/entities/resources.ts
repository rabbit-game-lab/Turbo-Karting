import * as pc from 'playcanvas'
import type { ProceduralMeshId } from '../data/visuals.ts'
import { makeMat } from './helpers.ts'
import { createAssets, type AssetsHandle } from '../rabbit/assets.ts'
import { ASSETS } from '../data/assets.ts'
import { racerById, type RacerId, type ItemId } from '../data/content.ts'
import { RACER_VISUALS } from '../data/visuals.ts'

/** App-owned immutable GPU resources. Mesh references survive session destruction. */
export class ProceduralResources {
  private readonly materials = new Map<string, pc.StandardMaterial>()
  private readonly meshes = new Map<ProceduralMeshId, pc.Mesh>()
  private readonly textures = new Map<string, pc.Texture>()
  private assets: AssetsHandle | null = null
  private orchard: { mesh: pc.Mesh; material: pc.Material } | null = null
  private readonly itemMeshes = new Map<ItemId, { mesh: pc.Mesh; material: pc.Material }>()
  modelsReady = false
  constructor(readonly device: pc.GraphicsDevice) {}

  async loadModels(app: pc.Application): Promise<void> {
    this.assets = createAssets(app, ASSETS)
    await this.assets.load()
    this.modelsReady = true
  }

  spawnKart(id: RacerId, parent: pc.Entity, detailed: boolean): pc.Entity {
    const racer = racerById(id), visual = RACER_VISUALS[id]
    const root = this.assets!.spawn(`kart-${racer.weightClass}${detailed ? '' : '-low'}`, { parent })
    for (const accessory of ['goggles', 'cap', 'bow']) {
      const node = root.findByName(`Accessory_${accessory}`) as pc.Entity | null
      if (node) node.enabled = accessory === visual.accessory
    }
    for (const render of root.findComponents('render') as pc.RenderComponent[]) {
      for (const instance of render.meshInstances) {
        const original = instance.material as pc.StandardMaterial
        const tint = original.name === 'Paint' ? racer.color : original.name === 'Accent' ? racer.accent : original.name === 'Fur' ? visual.fur : null
        if (!tint) continue
        const key = `blender:${id}:${original.name}`
        let material = this.materials.get(key)
        if (!material) {
          material = original.clone(); material.diffuse.fromString(tint); material.update()
          this.materials.set(key, material)
        }
        instance.material = material
      }
    }
    return root
  }

  spawnLandmark(theme: string, parent: pc.Entity): pc.Entity {
    return this.assets!.spawn(theme === 'windmill' ? 'prop-windmill' : `landmark-${theme}`, { parent })
  }

  orchardMesh(): { mesh: pc.Mesh; material: pc.Material } | null {
    if (!this.modelsReady) return null
    if (this.orchard) return this.orchard
    const root = this.assets!.spawn('prop-orchard')
    const render = root.findComponent('render') as pc.RenderComponent
    const source = render.meshInstances[0]
    source.mesh.incRefCount()
    this.orchard = { mesh: source.mesh, material: source.material }
    root.destroy()
    return this.orchard
  }

  backdrop(theme: string): pc.Texture | null { return this.assets?.texture(`background-${theme}`) ?? null }

  itemMesh(id: ItemId): { mesh: pc.Mesh; material: pc.Material } {
    const cached = this.itemMeshes.get(id)
    if (cached) return cached
    const root = this.assets!.spawn(`item-${id}`)
    const render = root.findComponent('render') as pc.RenderComponent
    const source = render.meshInstances[0]
    source.mesh.incRefCount()
    const entry = { mesh: source.mesh, material: source.material }
    this.itemMeshes.set(id, entry)
    root.destroy()
    return entry
  }

  material(hex: string, emissive = 0, opacity = 1): pc.StandardMaterial {
    const key = `${hex}:${emissive}:${opacity}`
    let material = this.materials.get(key)
    if (!material) {
      material = makeMat(hex, { emissive: emissive > 0 ? hex : undefined, emissiveIntensity: emissive, opacity, gloss: emissive > 0 ? .5 : .28 })
      material.diffuseVertexColor = true
      material.update()
      this.materials.set(key, material)
    }
    return material
  }

  mesh(id: ProceduralMeshId): pc.Mesh {
    let mesh = this.meshes.get(id)
    if (mesh) return mesh
    let geometry: pc.Geometry
    if (id === 'sphere') geometry = new pc.SphereGeometry({ latitudeBands: 8, longitudeBands: 12 })
    else if (id === 'cone') geometry = new pc.ConeGeometry({ capSegments: 8 })
    else if (id === 'cylinder') geometry = new pc.CylinderGeometry({ capSegments: 24 })
    else if (id === 'quad') geometry = new pc.PlaneGeometry({ widthSegments: 1, lengthSegments: 1 })
    else if (id === 'rock') geometry = new pc.SphereGeometry({ latitudeBands: 4, longitudeBands: 7 })
    else {
      geometry = new pc.BoxGeometry({ widthSegments: 4, heightSegments: 4, lengthSegments: 4 })
      const positions = geometry.positions!
      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i], y = positions[i + 1], z = positions[i + 2]
        const cx = Math.max(-.34, Math.min(.34, x)), cy = Math.max(-.34, Math.min(.34, y)), cz = Math.max(-.34, Math.min(.34, z))
        const length = Math.hypot(x - cx, y - cy, z - cz) || 1
        positions[i] = cx + (x - cx) / length * .16
        positions[i + 1] = cy + (y - cy) / length * .16
        positions[i + 2] = cz + (z - cz) / length * .16
      }
      geometry.normals = pc.calculateNormals(geometry.positions!, geometry.indices!)
    }
    const colors: number[] = []
    for (let i = 0; i < geometry.positions!.length; i += 3) {
      const shade = .78 + Math.max(0, geometry.positions![i + 1] + .5) * .22
      colors.push(Math.round(shade * 255), Math.round(shade * 255), Math.round(shade * 255), 255)
    }
    geometry.colors = colors
    mesh = pc.Mesh.fromGeometry(this.device, geometry)
    mesh.incRefCount()
    this.meshes.set(id, mesh)
    return mesh
  }

  /** One tiny procedural atlas, shared by every city window. */
  windowMaterial(): pc.StandardMaterial {
    const existing = this.materials.get('windows')
    if (existing) return existing
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 128
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#27375a'; ctx.fillRect(0, 0, 128, 128)
    for (let y = 4; y < 128; y += 16) for (let x = 4; x < 128; x += 16) {
      ctx.fillStyle = (x * 7 + y * 13) % 5 ? '#91ddeb' : '#344766'; ctx.fillRect(x, y, 7, 10)
    }
    const texture = new pc.Texture(this.device, { name: 'window-atlas', mipmaps: true })
    texture.setSource(canvas); this.textures.set('windows', texture)
    const material = makeMat('#607995', { emissive: '#a0ddea', emissiveIntensity: .65 })
    material.diffuseMap = texture; material.emissiveMap = texture; material.update()
    this.materials.set('windows', material)
    return material
  }

  contactShadowMaterial(): pc.StandardMaterial {
    const existing = this.materials.get('contact-shadow')
    if (existing) return existing
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 64
    const context = canvas.getContext('2d')!
    const gradient = context.createRadialGradient(32, 32, 4, 32, 32, 32)
    gradient.addColorStop(0, '#ffffff')
    gradient.addColorStop(.45, '#929292')
    gradient.addColorStop(1, '#000000')
    context.fillStyle = gradient
    context.fillRect(0, 0, 64, 64)
    const texture = new pc.Texture(this.device, { name: 'contact-shadow', mipmaps: false })
    texture.setSource(canvas)
    this.textures.set('contact-shadow', texture)
    const material = makeMat('#152538', { unlit: true, opacity: .42 })
    material.opacityMap = texture
    material.opacityMapChannel = 'r'
    material.update()
    this.materials.set('contact-shadow', material)
    return material
  }

  get counts() { return { meshes: this.meshes.size, materials: this.materials.size, textures: this.textures.size } }
  destroy(): void {
    if (this.orchard) { this.orchard.mesh.decRefCount(); this.orchard = null }
    for (const entry of this.itemMeshes.values()) entry.mesh.decRefCount()
    this.itemMeshes.clear()
    this.assets?.destroy(); this.modelsReady = false
    for (const material of this.materials.values()) material.destroy()
    for (const texture of this.textures.values()) texture.destroy()
    for (const mesh of this.meshes.values()) { mesh.decRefCount(); mesh.destroy() }
    this.materials.clear(); this.meshes.clear(); this.textures.clear()
  }
}

export function shape(parent: pc.Entity, resources: ProceduralResources, mesh: ProceduralMeshId,
  color: string, position: [number, number, number], scale: [number, number, number], glow = 0): pc.Entity {
  const entity = new pc.Entity(mesh)
  entity.addComponent('render', { meshInstances: [new pc.MeshInstance(resources.mesh(mesh), resources.material(color, glow))], castShadows: false, receiveShadows: true })
  entity.setLocalPosition(...position); entity.setLocalScale(...scale); parent.addChild(entity)
  return entity
}
