# Hareline Rally — local art pipeline

## Sources and exports

Art direction is a colorful animated-film kart racer: soft rabbit faces, rounded bodywork, crisp racing silhouettes, warm key light and cool edge light. Reference paintings express a target, not an assertion that the real-time render is identical.

- `art/references/manifest.json`: original concept/background images and exact built-in ImageGen prompts.
- `tools/blender/`: deterministic, editable Blender Python recipes; no add-ons or downloaded models.
- `art/blender/*.blend`: editable source scenes; `hero-review.png` is an offline Cycles review, not an in-game screenshot.
- `public/assets/blender/`: self-contained GLB exports with embedded materials and no external texture URIs.
- `public/assets/backgrounds/`: 1536 px JPEG background panoramas, also reused by track cards.
- `src/data/assets.ts`: the single runtime registration point.

Rebuild on the current macOS installation:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --python tools/blender/build_assets.py
/Applications/Blender.app/Contents/MacOS/Blender --background --python tools/blender/build_items.py
/Applications/Blender.app/Contents/MacOS/Blender --background --python tools/blender/build_portraits.py
```

On another machine use its Blender executable. Tested authoring version: Blender 5.2.1 LTS. The normal Node build consumes checked-in exports and does not require Blender. No additional npm dependency is used.

The ten item references and prompts are in `art/references/item-manifest.json`. `items.py` builds distinct silhouettes; `build_items.py` renders 192 px transparent icons from those exact models, retains PBR source scenes, and bakes a single vertex-colored runtime primitive per item for hardware instancing. `public/assets/icons/` is consumed by the HUD. Held items float beside the player; projectiles and dropped hazards use the same model identity.

## Change a kart body

The racer selector uses eight 320×400 transparent Blender portraits under `public/assets/portraits/`. `build_portraits.py` reads the typed racer colors and visual identity, using the same kart recipe and a shared studio setup. No new image-generation prompt is used for these renders. The DOM portraits do not create extra PlayCanvas cameras or models. `racer-showroom.ts` owns selection/copy; `MenuView` reuses one live kart clone and oscillates its heading gently, respecting reduced motion. Selecting a portrait previews it; the separate confirmation button advances to tracks.

Edit `tools/blender/kart.py` for chassis, wheels and rabbit anatomy; use `sculpt.py` for the lofted bonnet, grille and cockpit trim. Coordinates are metres, Blender Z-up/+Y-forward; glTF export converts to PlayCanvas Y-up/-Z-forward. Keep the wheel and ear pivots intact. `merge_static_parts` merges by parent/material, retaining articulation. Rebuild High and decimated Low versions together. Racer color/accessory identity belongs in `src/data/visuals.ts`, not eight duplicated model files.

## Add decoration

For a new landmark, add its recipe in `landmarks.py`, register the exported GLB and place it at normalized progress in `TRACK_VISUALS`. Use local track tangent/right vectors, not absolute guessed world coordinates. For a repeated prop, author it in `props.py`; bake a vertex palette and join static geometry into a single primitive before instancing. A shared primitive produces one draw call for many copies. Give the instance batch a bounded capacity and destroy it with the session.

## Adjust a track

Gameplay control points live in `src/data/content.ts`; road/shoulder colors and landmark progress live in `src/data/visuals.ts`. Road samples and simulated surface bands must agree. Frostburrow's center gap starts/ends at the exact void parameters and leaves the same 28% edge bands drivable. Run the winding/void tests after any road change.

## Reduce render cost

Measure with `?benchmark=1` before changing detail. Reduce internal resolution for fill-rate pressure. For triangle pressure, shorten detailed-prop distance or simplify the repeated source mesh; do not merely hide distant individual parts after submission. For draw pressure, merge static materials and avoid enabling eight full directional-shadow casters. Keep two-triangle curb decals. Low-detail geometry must not alter collision, item logic or the 120 Hz step.

Asset caches, materials and generated textures survive restarts. Road meshes, clones, particles and matrix buffers do not. Compare resource counts after warm-up and ten restarts; an engine cache plateau is acceptable, continuous growth is not.
