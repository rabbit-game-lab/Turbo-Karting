import test from 'node:test'
import assert from 'node:assert/strict'
import { deviceSteerToHeading } from '../src/systems/steering.ts'
import { createKart, stepKart } from '../src/sim/kart.ts'
import { TrackCourse } from '../src/sim/track.ts'
import { RACERS, TRACKS } from '../src/data/content.ts'
import { EMPTY_INPUT } from '../src/sim/types.ts'

test('device steering preserves analog magnitude and converts right to negative heading', () => {
  assert.equal(deviceSteerToHeading(1), -1)
  assert.equal(deviceSteerToHeading(-1), 1)
  assert.equal(deviceSteerToHeading(.35), -.35)
  assert.equal(deviceSteerToHeading(-.35), .35)
  assert.equal(deviceSteerToHeading(2), -1)
})

test('left/right device input moves toward the corresponding driver side, including drift', () => {
  const course = new TrackCourse(TRACKS[0])
  for (const heading of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    for (const axis of [-1, 1]) {
      for (const drift of [false, true]) {
        const kart = createKart(0, RACERS[0], true, course)
        kart.heading = heading
        kart.speed = 18
        const { x, z } = kart.position
        stepKart(kart, { ...EMPTY_INPUT, throttle: 1, steer: deviceSteerToHeading(axis), drift }, course, 1 / 120, [])
        const rightward = (kart.position.x - x) * Math.cos(heading)
          - (kart.position.z - z) * Math.sin(heading)
        assert.ok(rightward * axis > 0, `heading=${heading}, axis=${axis}, drift=${drift}`)
      }
    }
  }
})
