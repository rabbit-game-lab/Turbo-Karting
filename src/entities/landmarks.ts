import * as pc from 'playcanvas'
import { TRACK_VISUALS } from '../data/visuals.ts'
import type { TrackId } from '../data/content.ts'
import type { TrackCourse } from '../sim/track.ts'
import { ProceduralResources, shape } from './resources.ts'

/** Three authored beats per course, positioned relative to the racing line. */
export function buildLandmarks(parent: pc.Entity, course: TrackCourse, resources: ProceduralResources): void {
  const theme = course.def.theme
  const points = [0, ...TRACK_VISUALS[course.def.id as TrackId].landmark]
  for (let index = 0; index < points.length; index++) {
    const s = course.sample(points[index])
    const root = new pc.Entity(`landmark-${index}`)
    parent.addChild(root)
    root.setPosition(s.position.x, s.position.y, s.position.z)
    root.setEulerAngles(0, Math.atan2(s.tangentX, s.tangentZ) * 180 / Math.PI, 0)
    const w = course.def.halfWidth + 2
    const accent = course.def.palette.accent
    if (resources.modelsReady && (index === 0 || theme !== 'meadow')) {
      resources.spawnLandmark(index === 0 ? 'meadow' : theme, root)
      continue
    }
    if (index === 0) {
      for (const side of [-1, 1]) {
        shape(root, resources, 'rounded', '#fff1d1', [side * w, 3.7, 0], [1.4, 7.4, 1.4])
        shape(root, resources, 'sphere', accent, [side * w, 7.8, 0], [2.3, 2.3, 2.3], .2)
      }
      shape(root, resources, 'rounded', accent, [0, 7, 0], [w * 2.2, 1.6, 1.2], .15)
      for (let i = -6; i <= 6; i++) shape(root, resources, 'rounded', i % 2 ? '#273447' : '#fff8dc', [i * 1.2, 7.05, -.64], [1.18, .75, .08])
    } else if (theme === 'meadow') {
      const x = (index % 2 ? -1 : 1) * (w + 12)
      if (resources.modelsReady) {
        resources.spawnLandmark('windmill', root).setLocalPosition(x, 0, 0)
        continue
      }
      shape(root, resources, 'cone', '#f4e0b4', [x, 5, 0], [5, 10, 5])
      shape(root, resources, 'cone', '#d97568', [x, 11, 0], [7, 4, 7])
      for (let arm = 0; arm < 4; arm++) {
        const sail = shape(root, resources, 'rounded', '#fff7dc', [x, 9, -3], [1, 10, .2])
        sail.setLocalEulerAngles(0, 0, arm * 90 + 35)
      }
      for (let i = -6; i <= 6; i++) {
        const flag = shape(root, resources, 'cone', i % 2 ? accent : '#ffd66f', [i * 1.5, 6.5 - Math.cos(i / 6) * .8, 5], [.7, 1.2, .15])
        flag.setLocalEulerAngles(0, 0, 180)
      }
    } else if (theme === 'desert') {
      for (const side of [-1, 1]) for (let layer = 0; layer < 4; layer++) {
        shape(root, resources, 'rock', layer % 2 ? '#d39164' : '#b97051', [side * (w + 4), layer * 3 + 1, 0], [10 - layer, 5, 11])
      }
      shape(root, resources, 'rock', '#ca855d', [0, 14, 0], [w * 3, 5, 9])
    } else if (theme === 'snow') {
      for (const side of [-1, 1]) {
        shape(root, resources, 'rock', '#c8edf3', [side * (w + 9), 8, 0], [13, 23, 10])
        shape(root, resources, 'rounded', '#88c6e5', [side * (w + 7), 5, -5], [5, 21, .6], .15)
        shape(root, resources, 'rock', '#f5faf6', [side * (w + 9), 19, 0], [15, 4, 12])
      }
    } else {
      for (let rib = 0; rib < 5; rib++) {
        for (const side of [-1, 1]) shape(root, resources, 'rounded', '#5775ab', [side * w, 4, rib * 6], [.7, 8, .7])
        shape(root, resources, 'rounded', rib % 2 ? '#65dce7' : accent, [0, 8, rib * 6], [w * 2, .35, .5], 1.2)
      }
    }
  }
}
