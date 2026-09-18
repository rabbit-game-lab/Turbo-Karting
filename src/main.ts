/**
 * BOOT + Rabbit SDK wiring.
 *
 * ⛔ AGENTS MUST NOT EDIT THIS FILE.
 * Tuning lives in `game.config.ts`; game code lives in `src/sim`,
 * `src/entities`, `src/systems` and `src/ui`.
 * The game side of this contract is `setupGame(app)` in `src/systems/loop.ts`.
 */
import * as pc from 'playcanvas'
import * as sdk from './rabbit/sdk'
import { setupGame } from './systems/loop'

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement
const container = document.getElementById('app') as HTMLElement
let game: ReturnType<typeof setupGame> | null = null

// Error and Studio listeners exist before any engine or game construction.
sdk.init({
  onPause: (paused) => game?.setPaused(paused),
  onRestart: () => game?.restart(),
  onMute: (muted) => game?.setMuted(muted),
})

const app = new pc.Application(canvas, {
  graphicsDeviceOptions: {
    antialias: true,
    powerPreference: 'high-performance',
  },
})

app.setCanvasFillMode(pc.FILLMODE_NONE)
app.setCanvasResolution(pc.RESOLUTION_AUTO)
// devicePixelRatio clamp: avoids 3x rendering on high-end phones.
app.graphicsDevice.maxPixelRatio = Math.min(window.devicePixelRatio || 1, 2)

try {
  game = setupGame(app)
} catch (cause) {
  const message = cause instanceof Error ? cause.message : String(cause)
  const error = document.createElement('pre')
  error.style.cssText = 'position:fixed;inset:0;z-index:100;background:#1a0710;color:#ffb7cc;padding:8vw;white-space:pre-wrap;font:700 16px/1.6 system-ui'
  error.textContent = `HARELINE RALLY COULD NOT START\n\n${message}`
  document.body.append(error)
  setTimeout(() => { throw cause }, 0)
}

sdk.observeResize(container, (width, height) => {
  app.resizeCanvas(width, height)
})

// Handshake: `rabbit:ready` after the first rendered frame.
app.once('postrender', () => sdk.ready())

app.start()
