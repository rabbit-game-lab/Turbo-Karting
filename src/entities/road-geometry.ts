import type { TrackCourse } from '../sim/track.ts'
import { forwardDistance } from '../sim/math.ts'

export interface RoadGeometry { positions: number[]; normals: number[]; indices: number[]; uvs: number[]; colors: number[] }

/** Pure mesh data, tested in Node. Front faces and normals always agree. */
export function roadGeometry(course: TrackCourse, from: number, to: number,
  left: number, right: number, height: number, segments: number, cutVoid = true): RoadGeometry {
  const data: RoadGeometry = { positions: [], normals: [], indices: [], uvs: [], colors: [] }
  const cuts = [from, to]
  for (let i = 1; i < segments; i++) cuts.push(from + (to - from) * i / segments)
  for (const range of course.def.voidRanges ?? []) for (const t of range) if (t > from && t < to) cuts.push(t)
  cuts.sort((a, b) => a - b)
  const bands = [left, right]
  const edge = course.def.halfWidth * .72
  if (left < -edge && right > -edge) bands.push(-edge)
  if (left < edge && right > edge) bands.push(edge)
  bands.sort((a, b) => a - b)
  for (let i = 0; i < cuts.length - 1; i++) {
    const a = course.sample(cuts[i]), b = course.sample(cuts[i + 1])
    const mid = (cuts[i] + cuts[i + 1]) / 2
    const gap = cutVoid && (course.def.voidRanges?.some(([start, end]) => forwardDistance(start, mid) < forwardDistance(start, end)) ?? false)
    for (let j = 0; j < bands.length - 1; j++) {
      const l = bands[j], r = bands[j + 1]
      if (gap && Math.abs((l + r) / 2) < edge) continue
      const n = data.positions.length / 3
      const points = [
        [a.position.x + a.rightX * l, a.position.y + height, a.position.z + a.rightZ * l],
        [a.position.x + a.rightX * r, a.position.y + height, a.position.z + a.rightZ * r],
        [b.position.x + b.rightX * l, b.position.y + height, b.position.z + b.rightZ * l],
        [b.position.x + b.rightX * r, b.position.y + height, b.position.z + b.rightZ * r],
      ]
      const ux = points[1][0] - points[0][0], uz = points[1][2] - points[0][2]
      const vx = points[2][0] - points[0][0], vy = points[2][1] - points[0][1], vz = points[2][2] - points[0][2]
      const nx = -uz * vy, ny = uz * vx - ux * vz, nz = ux * vy, length = Math.hypot(nx, ny, nz) || 1
      for (const p of points) { data.positions.push(...p); data.normals.push(nx / length, ny / length, nz / length); data.colors.push(1, 1, 1, 1) }
      data.uvs.push(0, cuts[i] * 80, 1, cuts[i] * 80, 0, cuts[i + 1] * 80, 1, cuts[i + 1] * 80)
      data.indices.push(n, n + 1, n + 2, n + 1, n + 3, n + 2)
    }
  }
  return data
}
