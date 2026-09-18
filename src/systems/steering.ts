import { clamp } from '../sim/math.ts'

/** Devices use +X right; simulation heading increases toward the driver's left. */
export function deviceSteerToHeading(axis: number): number {
  return -clamp(axis, -1, 1)
}
