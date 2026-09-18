# Local art and graphics

Read `docs/art-pipeline.md` for the concrete rebuild and editing recipes. The original empty-asset constraint was superseded by the user's explicit Blender/image request. Do not remove these assets to satisfy outdated baseline prose.

`tools/blender/` authors models with Blender's Python API. `art/references/` retains the generated concept images and exact prompts. `art/blender/` contains editable scenes and offline review renders. Only `public/assets/` is shipped. Rabbit's asset adapter loads registered files once; clones and instance buffers belong to the session.

Preserve named pivots `Head`, `Ear_L`, `Ear_R`, `Wheel_LF`, `Wheel_RF`, `Wheel_LB`, `Wheel_RB`, and `Accessory_*`. Merge only parts with the same parent and material, never across animated pivots. Test both kart LODs. Avoid per-racer duplication of source meshes.

Create all vertex streams before the initial mesh upload. `Mesh.fromGeometry` interprets `Geometry.colors` as normalized bytes. `Mesh.setColors` uses linear floats. Adding a stream after the first update does not extend the existing GPU vertex format. Road palette swatches therefore need sRGB-to-linear conversion before `setColors`.

Repeated decoration must use `InstanceBatch`, not an assertion that dynamic batching equals instancing. Cull candidate instances and keep detailed orchard trees near the camera. Flat curb paint uses a two-triangle plane. Every allocated instance buffer has an explicit destroy path.

Report actual render resolution, hardware, warm-up and sample length. Engine VRAM counters are estimates, not total process memory. Phone viewport tests prove layout only, not mobile performance. QA-altered races must never save records.
