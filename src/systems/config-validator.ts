import type { GameConfig } from '../config/types.ts'
import type { ItemDef, RacerDef, TrackDef } from '../data/content.ts'
import { RACER_VISUALS, TRACK_VISUALS } from '../data/visuals.ts'

function range(value: number, min: number, max: number, path: string, errors: string[]): void {
  if (!Number.isFinite(value)) errors.push(`${path} must be finite`)
  else if (value < min || value > max) errors.push(`${path} must be between ${min} and ${max}`)
}

function uniqueIds(entries: readonly { id: string }[], path: string, errors: string[]): void {
  const seen = new Set<string>()
  for (const entry of entries) {
    if (!entry.id.trim()) errors.push(`${path} contains an empty id`)
    if (seen.has(entry.id)) errors.push(`${path} contains duplicate id "${entry.id}"`)
    seen.add(entry.id)
  }
}

export function validateGameConfig(config: GameConfig, racers: readonly RacerDef[], tracks: readonly TrackDef[], items: readonly ItemDef[]): void {
  const errors: string[] = []
  range(config.race.laps, 1, 9, 'race.laps', errors)
  range(config.race.countdownSeconds, 1, 6, 'race.countdownSeconds', errors)
  range(config.race.checkpointCount, 6, 48, 'race.checkpointCount', errors)
  range(config.handling.mediumTopSpeed, 8, 45, 'handling.mediumTopSpeed', errors)
  range(config.handling.kartRadius, 0.3, 2, 'handling.kartRadius', errors)
  range(config.handling.offroadFactor, 0.2, 0.95, 'handling.offroadFactor', errors)
  range(config.camera.fovMin, 40, 95, 'camera.fovMin', errors)
  range(config.camera.fovMax, config.camera.fovMin, 110, 'camera.fovMax', errors)
  range(config.controls.gamepadDeadZone, 0, 0.5, 'controls.gamepadDeadZone', errors)
  range(config.performance.trackSegments, 96, 1024, 'performance.trackSegments', errors)
  range(config.performance.trackLookupSamples, 256, 4096, 'performance.trackLookupSamples', errors)
  range(config.graphics.sectorMetres, 30, 100, 'graphics.sectorMetres', errors)
  range(config.graphics.downgradeSeconds, 1, 10, 'graphics.downgradeSeconds', errors)
  range(config.graphics.upgradeSeconds, 10, 60, 'graphics.upgradeSeconds', errors)
  for (const [id, profile] of Object.entries(config.graphics.profiles)) {
    range(profile.pixelRatio, .5, 2, `graphics.${id}.pixelRatio`, errors)
    range(profile.viewDistance, 90, 600, `graphics.${id}.viewDistance`, errors)
    range(profile.detailDistance, 20, profile.viewDistance, `graphics.${id}.detailDistance`, errors)
    range(profile.particles, 16, config.performance.particlePool, `graphics.${id}.particles`, errors)
    range(profile.targetFps, 30, 120, `graphics.${id}.targetFps`, errors)
    range(profile.drawCalls, 30, 300, `graphics.${id}.drawCalls`, errors)
  }
  for (const racer of racers) if (!(racer.id in RACER_VISUALS)) errors.push(`racer.${racer.id} has no visual recipe`)
  for (const track of tracks) if (!(track.id in TRACK_VISUALS)) errors.push(`track.${track.id} has no visual recipe`)
  if (config.performance.hazardPool < items.length * 2) errors.push('performance.hazardPool is too small for the item roster')
  if (config.performance.particlePool < 128) errors.push('performance.particlePool is too small for race effects')
  for (const [index, value] of config.handling.driftThresholds.entries()) range(value, 0.1, 5, `handling.driftThresholds[${index}]`, errors)
  if (!(config.handling.driftThresholds[0] < config.handling.driftThresholds[1] && config.handling.driftThresholds[1] < config.handling.driftThresholds[2])) errors.push('drift thresholds must be strictly increasing')
  for (const key of ['musicVolume','sfxVolume','engineVolume'] as const) range(config.audio[key], 0, 1, `audio.${key}`, errors)
  uniqueIds(racers, 'racers', errors); uniqueIds(tracks, 'tracks', errors); uniqueIds(items, 'items', errors)
  if (racers.length !== 8) errors.push(`racers must contain exactly 8 entries (found ${racers.length})`)
  if (tracks.length !== 4) errors.push(`tracks must contain exactly 4 entries (found ${tracks.length})`)
  if (items.length !== 10) errors.push(`items must contain exactly 10 entries (found ${items.length})`)
  for (const racer of racers) for (const [key, value] of Object.entries(racer.stats)) range(value, 0, 1, `racer.${racer.id}.stats.${key}`, errors)
  for (const track of tracks) {
    if (track.controlPoints.length < 8) errors.push(`track.${track.id} needs at least 8 control points`)
    range(track.halfWidth, 4, 18, `track.${track.id}.halfWidth`, errors)
    range(track.wallFactor, 1.05, 2, `track.${track.id}.wallFactor`, errors)
    for (const [index, point] of track.controlPoints.entries()) if (point.length !== 3 || point.some((value) => !Number.isFinite(value))) errors.push(`track.${track.id}.controlPoints[${index}] is invalid`)
    for (const value of [...track.itemRows, ...track.boostPads,...track.jumpCrests]) range(value, 0, 1, `track.${track.id}.placement`, errors)
    if(track.jumpCrests.length<1)errors.push(`track.${track.id} needs a jump crest`)
  }
  if (errors.length > 0) throw new Error(`Hareline Rally configuration failed:\n- ${errors.join('\n- ')}`)
}
