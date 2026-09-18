import * as pc from 'playcanvas'

/** Session-owned hardware instancing. Only the active matrix prefix is submitted. */
export class InstanceBatch {
  readonly entity = new pc.Entity('hardware-instances')
  readonly matrices: Float32Array
  private readonly buffer: pc.VertexBuffer
  private readonly instance: pc.MeshInstance
  private readonly matrix = new pc.Mat4()
  private readonly position = new pc.Vec3()
  private readonly rotation = new pc.Quat()
  private readonly scale = new pc.Vec3()
  count = 0

  constructor(parent: pc.Entity, device: pc.GraphicsDevice, mesh: pc.Mesh, material: pc.Material, readonly capacity: number) {
    this.matrices = new Float32Array(capacity * 16)
    // Reserve the complete pool up front. PlayCanvas 2.20 accounts constructor
    // bytes immediately, but only subtracts initialized buffers on destroy.
    // Uploading zeros also avoids a first-use GPU allocation during a race.
    this.buffer = new pc.VertexBuffer(device, pc.VertexFormat.getDefaultInstancingFormat(device), capacity, {
      usage: pc.BUFFER_DYNAMIC,
      data: this.matrices.buffer as ArrayBuffer,
    })
    this.instance = new pc.MeshInstance(mesh, material)
    this.instance.setInstancing(this.buffer); this.instance.instancingCount = 0
    this.entity.addComponent('render', { meshInstances: [this.instance], castShadows: false, receiveShadows: true })
    parent.addChild(this.entity)
  }

  add(x: number, y: number, z: number, sx: number, sy: number, sz: number, yaw = 0, roll = 0): boolean {
    if (this.count >= this.capacity) return false
    this.position.set(x, y, z); this.scale.set(sx, sy, sz); this.rotation.setFromEulerAngles(0, yaw, roll)
    this.matrix.setTRS(this.position, this.rotation, this.scale)
    this.matrices.set(this.matrix.data, this.count * 16); this.count++
    return true
  }
  clear(): void { this.count = 0 }
  upload(): void {
    this.instance.instancingCount = this.count; this.entity.enabled = this.count > 0
    if (this.count) this.buffer.setData(this.matrices.buffer as ArrayBuffer)
  }
  destroy(): void { this.instance.setInstancing(null); this.buffer.destroy(); this.entity.destroy() }
}
