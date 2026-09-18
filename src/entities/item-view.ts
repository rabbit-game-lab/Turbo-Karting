import type * as pc from 'playcanvas'
import { ITEMS, type ItemId } from '../data/content.ts'
import type { ItemSystem } from '../sim/items.ts'
import type { KartState } from '../sim/types.ts'
import { InstanceBatch } from './instances.ts'
import type { ProceduralResources } from './resources.ts'

/** Session-owned matrices; the ten Blender meshes stay in the app cache. */
export class ItemView {
  private readonly batches = new Map<ItemId, InstanceBatch>()

  constructor(parent: pc.Entity, resources: ProceduralResources, capacity: number) {
    for (const item of ITEMS) {
      const source = resources.itemMesh(item.id)
      this.batches.set(item.id, new InstanceBatch(parent, resources.device, source.mesh, source.material, capacity + 1))
    }
  }

  sync(items: ItemSystem, player: KartState, time: number): void {
    for (const batch of this.batches.values()) batch.clear()
    for (const hazard of items.hazards) {
      if (!hazard.active) continue
      const berry = hazard.kind === 'berry-slick'
      this.batches.get(hazard.kind)!.add(
        hazard.position.x, hazard.position.y - (berry ? .36 : 0), hazard.position.z,
        berry ? 1.25 : .85, berry ? 1 : .85, berry ? 1.25 : .85,
        hazard.heading * 180 / Math.PI,
      )
    }
    if (player.item && player.rouletteTimer <= 0) {
      this.batches.get(player.item)!.add(
        player.position.x + Math.cos(player.heading) * 1.35,
        player.position.y + 1.65 + Math.sin(time * 3) * .12,
        player.position.z - Math.sin(player.heading) * 1.35,
        .55, .55, .55, time * 70,
      )
    }
    for (const batch of this.batches.values()) batch.upload()
  }

  destroy(): void { for (const batch of this.batches.values()) batch.destroy() }
}
