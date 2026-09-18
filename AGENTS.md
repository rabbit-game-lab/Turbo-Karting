# Hareline Rally — Agent Guide

Hareline Rally is a Rabbit Game Lab single-player 3D kart racer built with PlayCanvas 2, Vite, and strict TypeScript. The complete loop is title → racer → track/difficulty → countdown → three-lap race → standings. Art combines locally authored Blender models, generated background paintings, and runtime procedural geometry. Audio remains procedural.

## Commands

| Command | Purpose |
| --- | --- |
| `npm ci` | Install the locked Node 24 dependency set. |
| `npm run dev -- --port 5174` | Start the CORS-enabled development server. |
| `npm run test:sim` | Run dependency-free deterministic simulation tests. |
| `npm run check` | Run TypeScript and Rabbit contract checks. |
| `npm run build` | Build the relative-base production bundle. |
| `npm run preview -- --port 4173` | Serve the production bundle. |

## Boundaries

- Treat `src/rabbit/`, `scripts/check.mjs`, `rabbit.json`, and `vite.config.ts` as vendored platform code. Do not edit them.
- Keep `rabbit:ready` exactly once after the first meaningful frame and initialize `sdk.init` before game construction.
- Keep simulation code under `src/sim/` engine-independent. It may not import PlayCanvas or browser APIs.
- Configuration belongs in `src/game.config.ts`; stable racer, track, item, and procedural-resource registries belong in `src/data/`.
- The user explicitly approved Blender models and generated background images, superseding the original empty-asset requirement. Register local exports in `src/data/assets.ts`; do not add runtime URLs or downloaded third-party asset packs. Keep editable sources and image prompts in `art/` and reproducible Blender recipes in `tools/blender/`.
- Keep app resources app-scoped and race content session-scoped. Restart must destroy/reconstruct only the session.
- Use `sdk.storage` only for the versioned best-time map. Store no identity, unlock, or telemetry data.
- Use the Rabbit keyboard, gamepad, touch, sound, pause, storage, and resize seams.
- Keep source files at or below 400 lines and avoid steady-state allocations in the 120 Hz simulation.

## Architecture

- `src/main.ts`: boot, early Rabbit error wiring, resize, first-frame ready handshake.
- `src/sim/`: fixed-step state, track projection, karts, AI, items, collisions, race phases.
- `src/entities/`: app/session PlayCanvas views, shared procedural resources, camera, effects.
- `tools/blender/`: parameterized Blender authoring and GLB export; `art/` holds source scenes and image references, while `public/assets/` contains only runtime exports.
- `src/systems/`: composition, input normalization, pause, procedural audio, validation, persistence.
- `src/ui/`: responsive DOM menus, HUD, pause, and results.
- `tests/`: Node-only simulation and persistence acceptance tests.

## Definition of done

Run every check listed above, the Rabbit template audit, the local skill validator, and GPU-backed browser acceptance at desktop and compact/phone viewports. Verify no console errors, one `rabbit:ready`, every screen path, pause/mute/restart, resize, keyboard/touch inputs, and at least one complete or QA-forced race.

For task-specific guidance, use `.agents/skills/hareline-rally-gamedev/SKILL.md`.
