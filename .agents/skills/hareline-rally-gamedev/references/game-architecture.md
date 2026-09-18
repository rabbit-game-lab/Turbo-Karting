# Game architecture

The 120 Hz `GameSim` owns race truth. The frame loop caps input delta at 50 ms and runs at most eight fixed steps. Seeded randomness owns AI personalities and item rolls. Simulation arrays and item hazards are bounded; tests must prove deterministic replay and restart stability.

Per-step order is input → AI → kart movement/drift → kart collision → boxes/items/hazards → checkpoints/laps/positions → phase/events. Rendering, camera, effects, audio, and HUD consume state afterward and never mutate it.

App scope owns the PlayCanvas app, base scene, resource/material cache, controls, UI, audio, post effect, pause controller, and loop script. Session scope owns the course mesh, kart views, hazards, effects, and race state. Restart reuses the recorded seed, destroys the prior session view, and constructs one replacement.

Tracks are closed Catmull-Rom courses with an arc-length lookup, nearest projection, ordered checkpoints, surface bands, placements, jump crests, and optional void ranges. Preserve 900–1400 m lengths. Karts use kinematic movement only.

Content registries are stable and typed. Do not rename IDs without a migration. Best-time keys are `track-id:difficulty`; version 1 is the only persisted format.
