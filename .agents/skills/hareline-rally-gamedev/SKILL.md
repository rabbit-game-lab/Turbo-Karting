---
name: hareline-rally-gamedev
description: Maintain, tune, test, or extend Hareline Rally, its deterministic kart simulation, procedural PlayCanvas presentation, Rabbit iframe lifecycle, controls, HUD, audio, tracks, racers, AI, and items.
---

# Hareline Rally game development

Use this skill for repository work on Hareline Rally. Preserve the complete single-player race and Rabbit contract.

## Route the task

- Read [game architecture](references/game-architecture.md) before changing simulation, content, race phases, pooling, or restart behavior.
- Read [Rabbit and PlayCanvas contract](references/rabbit-playcanvas.md) before changing boot, rendering, input, audio, pause, storage, resizing, or browser acceptance.
- Read both references for cross-layer changes.
- Read [art pipeline](references/art-pipeline.md) before changing Blender models, backgrounds, instancing, materials, LOD or graphics budgets.

## Workflow

1. Inspect `AGENTS.md`, the relevant reference, and `src/game.config.ts`.
2. Put player-facing tuning in config and stable identities in typed registries.
3. Keep gameplay deterministic and engine-independent; mirror it into the rendering and UI layers.
4. Preserve app/session ownership and fixed pool sizes.
5. Add or update Node simulation coverage for every rule change.
6. Run `npm run test:sim`, `npm run check`, and `npm run build`.
7. For presentation or lifecycle changes, run development and production preview in the GPU-backed browser and inspect wide and phone viewports.

Do not add a physics engine, remote runtime asset URLs, npm dependencies, accounts, analytics or direct browser storage. Locally authored Blender GLBs and generated background images are explicitly user-approved. Preserve source scenes, recipes and prompt provenance. Read-only opt-in benchmark counters are allowed; never transmit or persist them.
