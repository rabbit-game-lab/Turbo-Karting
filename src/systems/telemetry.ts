import type * as pc from 'playcanvas'

/** Read-only opt-in diagnostics. Never persists data and never alters gameplay. */
export function installTelemetry(app: pc.Application, active: () => boolean, extra: () => object): () => void {
  const output = document.createElement('output')
  output.id = 'hareline-qa-metrics'; output.hidden = true
  document.body.append(output)
  const frames = new Float32Array(7200)
  let count = 0, elapsed = 0, warmup = 0, maximumDraws = 0, maximumVram = 0, maximumTriangles = 0
  const onUpdate = (dt: number) => {
    if (!active() || document.hidden || dt <= 0) return
    warmup += dt
    if (warmup < 5 || elapsed >= 60 || count === frames.length) return
    frames[count++] = dt * 1000; elapsed += dt
    maximumDraws = Math.max(maximumDraws, app.stats.drawCalls.total)
    const vram = app.stats.vram
    maximumVram = Math.max(maximumVram, vram.tex + vram.vb + vram.ib)
  }
  app.on('update', onUpdate)
  const timer = window.setInterval(() => {
    let visibleTriangles = 0, instancedGroups = 0, instances = 0
    const seen = new Set<pc.MeshInstance>()
    for (const layer of app.scene.layers.layerList) for (const instance of layer.meshInstances) {
      if (seen.has(instance) || !instance.visibleThisFrame) continue
      seen.add(instance)
      const copies = instance.instancingCount || 1
      if (instance.instancingCount) { instancedGroups++; instances += copies }
      visibleTriangles += (instance.mesh.primitive[0]?.count ?? 0) / 3 * copies
    }
    const sorted = frames.slice(0, count).sort()
    if (warmup >= 5 && elapsed < 60 && active()) maximumTriangles = Math.max(maximumTriangles, visibleTriangles)
    const vram = app.stats.vram
    output.dataset.json = JSON.stringify({
      ...extra(), fps: app.stats.frame.fps, measuredSeconds: elapsed, samples: count,
      medianMs: count ? sorted[Math.floor(count * .5)] : null,
      p95Ms: count ? sorted[Math.min(count - 1, Math.floor(count * .95))] : null,
      drawCalls: app.stats.drawCalls.total, maximumDraws,
      visibleTriangles: Math.round(visibleTriangles), instancedGroups, instances,
      maximumTriangles: Math.round(maximumTriangles),
      vramBytes: vram.tex + vram.vb + vram.ib, maximumVram,
      vramBreakdown: { textures: vram.tex, vertices: vram.vb, indices: vram.ib },
      canvas: [app.graphicsDevice.width, app.graphicsDevice.height],
    })
  }, 500)
  return () => { app.off('update', onUpdate); window.clearInterval(timer); output.remove() }
}
