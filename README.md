# Hareline Rally

An original Rabbit-themed arcade kart racer for Rabbit Game Lab. Pick one of eight rabbits, choose one of four procedural courses and a difficulty, then race seven AI rivals through three laps of drifting, boosts, jumps, hazards, and ten position-weighted items.

## Play

Keyboard controls are WASD or arrows to drive, Space/Shift to hop-drift, E/Ctrl to use an item, Q to look back, and Escape/P to pause. Standard gamepads use the left stick, analog triggers, A/RB to drift, X/LB for items, Y to look back, and Start to pause. Touch devices receive a multi-touch analog stick plus Drift and Item buttons; the HUD has a separate pause button.

The race supports start-line boost timing, three drift charge tiers, boost pads, off-road and wall response, weight-based contact, wrong-way/stuck recovery, a recoverable Frostburrow void, and post-finish auto-drive.

## Content

- Racers: Pip Quicktail, Clover Comet, Tansy Twirl, Juniper Jet, Hazel Hop, Bramble Bolt, Bruno Burrow, and Rosie Rumble.
- Tracks: Meadow Mile, Carrot Canyon, Frostburrow Falls, and Neon Warren (948–1,272 m per lap).
- Items: Berry Slick, Acorn Bolt, Beet Seeker, Crown Comet, Carrot Turbo, Triple Carrot, Golden Carrot, Lucky Clover, Storm Bell, and Burrow Bomb.
- Difficulty: Easy, Normal, and Hard AI profiles with bounded rubber-banding.

## Development

Requires Node 24 or newer.

```sh
npm ci
npm run test:sim
npm run check
npm run build
npm run dev -- --port 5174
```

Development QA: append `?qa=1`. F4 visits fixed course locations, F6 toggles player auto-drive, F7 pauses, F8 restarts, F9 forces a finish, and 1–0 grant the ten items. A reproducible example is `?qa=1&track=meadow-mile&racer=bruno&quality=high&auto=1`. Altered races never save records; mutation/debug controls are excluded from production.

Append `?benchmark=1` for read-only GPU/frame diagnostics in development or production. The hidden `#hareline-qa-metrics` output reports a 5-second warm-up followed by a 60-second active-race sample. Reload between independent measurements.

## Technical design

The simulation is engine-independent and deterministic at 120 Hz with a 50 ms input delta cap and eight-step catch-up ceiling. Render state is interpolated into restartable PlayCanvas views. The user-approved art pipeline starts with generated visual references, then locally authored Blender scenes and GLBs. Roads, distant scenery, effects, icons and audio remain procedural. Four small background paintings serve both the sky and track cards. Nothing loads from a remote asset service.

Three articulated kart bodies have high/low detail exports, eight color/accessory identities, named ear/head/wheel pivots, and shared materials. Repeated scenery and particles use explicit GPU instance buffers. Road sectors use three geometric detail levels. Quality can be Automatic, High, Medium or Low without changing simulation rules.

Only a versioned `{ track:difficulty → best finish time }` map is persisted through Rabbit storage. Corrupt or future-version data is ignored safely.

See [configuration documentation](docs/game-config.md), [art pipeline and recipes](docs/art-pipeline.md), [agent guide](AGENTS.md), and [third-party notices](THIRD_PARTY_NOTICES.md).

## Scope

Hareline Rally is complete single-player play. It intentionally omits multiplayer, championship progression, accounts, monetization, online leaderboards, and a track editor.
