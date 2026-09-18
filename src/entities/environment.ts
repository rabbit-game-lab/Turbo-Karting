import * as pc from 'playcanvas'

/** App-owned studio/sky reflection probe. Generated once; no extra scene render. */
export function createEnvironment(app: pc.Application): () => void {
  const width = 128, height = 64
  const source = new pc.Texture(app.graphicsDevice, {
    width, height, format: pc.PIXELFORMAT_RGBA8,
    projection: pc.TEXTUREPROJECTION_EQUIRECT, mipmaps: false,
  })
  const pixels = source.lock() as Uint8Array
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const u = x / width, v = y / height, index = (y * width + x) * 4
    const softbox = Math.exp(-((u - .23) ** 2 / .007 + (v - .33) ** 2 / .022))
      + .65 * Math.exp(-((u - .75) ** 2 / .01 + (v - .36) ** 2 / .03))
    const sky = v < .5 ? .25 + v * .7 : .18
    pixels[index] = Math.min(255, (sky * .8 + softbox) * 255)
    pixels[index + 1] = Math.min(255, (sky * .95 + softbox) * 255)
    pixels[index + 2] = Math.min(255, (sky * 1.1 + softbox) * 255)
    pixels[index + 3] = 255
  }
  source.unlock()
  const atlas = pc.EnvLighting.generateAtlas(source, { size: 128, numReflectionSamples: 32, numAmbientSamples: 32 })
  source.destroy()
  app.scene.envAtlas = atlas
  return () => { app.scene.envAtlas = null; atlas.destroy() }
}
