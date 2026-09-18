# Graphics validation — 2026-09-17

## Delivered art

Reference images were generated with built-in ImageGen before Blender authoring. Exact prompts and retained originals are in `art/references/manifest.json` and `art/references/item-manifest.json`. These are art-direction references, not screenshots of the running game.

Blender 5.2.1 LTS recipes and editable scenes produce 22 local GLBs: three kart bodies in two LODs, four theme landmarks, two repeated props and ten items. Eight racers use body/color/accessory variants rather than eight independent sculpts. Ten transparent item icons are rendered from the models. Four generated background paintings are shipped as compact JPEGs. See [art pipeline](art-pipeline.md) for rebuild instructions.

## Available test hardware

Apple Mac16,1, M4, 10 CPU / 10 GPU cores, 16 GB unified memory, Metal 4. GPU-backed Codex in-app browser. Phone-sized viewports below test layout, **not mobile hardware performance**.

## Measured sample

Neon Warren, High, 1920×1080, QA auto-drive; five-second warm-up followed by 60.0163 active seconds (6,325 frame samples).

| Counter | Observed |
| --- | --- |
| Frame interval median | 8.3 ms |
| Frame interval p95 | 16.7 ms |
| Maximum draw calls | 137 |
| Maximum visible triangles, sampled every 500 ms | 214,862 |
| Maximum estimated engine VRAM | 45,990,700 bytes / 43.86 MiB |
| Instancing at inspected frame | 586 instances across 8 groups |

Another production game context was running during part of this sample. This is an observed local run, not an isolated lab benchmark or certification of every track/profile. Frame intervals are not GPU timer-query measurements; engine VRAM excludes total browser/process memory. Triangle sampling can miss short peaks.

## Restart regression

Ten consecutive Carrot Canyon restarts after warm-up held exactly 789 entities and 45,719,540 estimated VRAM bytes for sessions 2–11. Cache counts remained stable: six procedural meshes, 72 materials, one generated texture.

The test exposed 408,192 bytes of accumulating vertex-buffer accounting per restart. PlayCanvas counted construction of unused instance pools but did not subtract uninitialized buffers on destruction. Supplying initial zeroed buffer data now reserves pools up front and produces stable counters. The earlier counter growth alone did not establish a physical GPU memory leak.

## Automated checks

- Locked install (`npm ci`) completed.
- All 26 simulation/graphics tests passed, including deterministic replay, road winding, void/surface agreement, graphics profiles, GLB bounds, kart pivots/LODs and all ten item exports/icons.
- TypeScript and Rabbit contract checks passed.
- Production build passed after the portrait presentation fix.
- Rabbit template audit: 24 checks passed, zero warnings.
- Local skill validator passed using a temporary Python environment with PyYAML; no game dependency was added.

Build retains PlayCanvas worker externalization and bundle-size warnings (~513 KB gzip JavaScript). Install audit reports two dependency advisories (nanoid high and postcss moderate). No automatic lockfile upgrade was performed as part of art work; these remain pending review.

## Browser acceptance performed

- Development and production rendering inspected at 1920×1080, 1280×720, 390×844 and 844×390 across this work.
- Portrait title corrected to show the complete hero kart below the title; compact racing HUD and controls remain usable in both phone orientations.
- Pointer drag on the touch joystick moved the kart. This is not a real-device multitouch or gamepad certification.
- Ten item grants showed the corresponding rendered icon; simulation tests cover their gameplay behavior.
- QA-forced Frostburrow finish displayed complete standings, no saved QA record, and working Race Again back to lap one.
- Production iframe harness observed one `rabbit:ready`, zero `rabbit:error`; Studio pause resisted local Resume, Studio resume/mute/restart worked.
- Standalone development and production game tabs returned no console errors during final checks. The separate iframe harness logged one MutationObserver argument error without a source URL; its origin is unconfirmed and remains an automation/harness investigation item.

## Still pending / not claimed

- Real mid-range mobile performance, physical multitouch and gamepad acceptance.
- Isolated 60-second stress runs for every track and quality tier, and ten-restart mixed-track cache testing.
- Matched-camera before/after capture set and complete unassisted three-lap traversal of every circuit.
- Full original graphics wish list: animated 3D results podium and a broader set of bespoke environment models remain future work. Current results use the standings screen.

The game is locally playable with integrated Blender assets; “AAA” is an art-direction ambition, not a measured completion claim.
