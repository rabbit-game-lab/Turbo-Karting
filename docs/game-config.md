# Game configuration

`src/game.config.ts` is the tuning surface. Values use metres, seconds, radians, and normalized 0–1 factors unless the property name says otherwise. `validateGameConfig` reports every discovered error together before a session is constructed.

## Race

- `laps`: ordered-checkpoint laps; supported range 1–9, default 3.
- `countdownSeconds`: pre-race countdown, 1–6 seconds.
- `postFinishSeconds`: maximum AI continuation after the player finishes.
- `checkpointCount`: evenly distributed ordered checkpoints; 6–48.
- `itemBoxRespawnSeconds` and `rouletteSeconds`: item-flow pacing.

## Handling

`mediumTopSpeed` anchors class speed. Racer stats yield approximately 20.5, 22, and 23.5 m/s for representative light, medium, and heavy karts. Acceleration, braking, reverse, steering, drift slip, hop velocity, gravity, off-road retention, wall retention, and kart radius interact directly; tune them as a set.

`driftThresholds` must be strictly increasing. Its three entries map to `driftBoostDurations` (0.7, 1.2, and 1.8 seconds). Boost strength is a temporary top-speed multiplier. Pad and item boosts have separate duration/strength pairs.

## Camera and controls

The chase camera interpolates `distance`, `height`, and `lookAhead` while speed maps from `fovMin` to `fovMax`. `smoothing` is an exponential response rate.

Keyboard steering has independent rise/fall rates. `gamepadDeadZone` is 0–0.5. `touchSize` controls both the joystick and derived button size; portrait layout adjustments live in CSS.

## Difficulty

Each Easy/Normal/Hard profile specifies AI top-speed factor, line accuracy, reaction time, bounded rubber-band magnitude, and item-use delay. Rubber-banding multiplies target speed only and never teleports or changes human handling.

## Items and effects

Item tuning controls boost, invulnerability, field slowdown, bomb fuse, and blast radius. Stable item identities and rank tables live in `src/data/content.ts` and `src/sim/items.ts`.

Effects can disable particles or the one-pass post effect. The renderer falls back to the normal camera path if the pass is unavailable or reduced motion is requested. Camera shake is a global multiplier.

## Audio and performance

Music, SFX, and engine levels are normalized 0–1 group values. Audio contexts are created lazily and unlocked through Rabbit on a gesture.

Performance caps bound lookup samples, hazard slots, visual particles, track tessellation, and fixed-step catch-up. Hazard capacity must be at least twice the item roster. Reducing lookup samples lowers projection precision; reducing track segments changes only road visuals.

## Graphics profiles

`graphics.profiles` separates render budgets from simulation tuning. Low/Medium/High initially allow 96/160/256 particles, view distances of 165/230/310 m and DPR caps of 1/1.25/1.5. Only High enables the player's directional shadow; all karts have a shared soft contact shadow. An automatic profile starts Low on coarse-pointer devices and Medium elsewhere. Three slow seconds lower internal resolution before the detail tier; fifteen seconds with margin permit an increase. Loading, pauses and hidden tabs are excluded.

The target draw/triangle/VRAM budgets are Low 90/120k/96 MiB, Medium 120/200k/128 MiB and High 160/350k/192 MiB. These are acceptance targets, not measured guarantees. See the [graphics validation report](graphics-validation.md) for actual equipment, observed results and outstanding checks.

`src/data/visuals.ts` owns stable racer proportions, accessory choices, theme lighting, foliage/road colors, landmark positions and effect definitions. `src/data/assets.ts` registers local Blender GLBs and background JPGs. Keep imported assets app-scoped and cloned views/instance buffers session-scoped. See [art recipes](art-pipeline.md).

## Content invariants

The validator requires eight unique racers, four unique tracks, ten unique items, at least eight finite control points per track, at least one jump crest, valid item/boost placement, sufficient pools, and supported FOV/speed/input ranges. Runtime tracks are scaled from readable control-point coordinates and must remain 900–1400 m.
