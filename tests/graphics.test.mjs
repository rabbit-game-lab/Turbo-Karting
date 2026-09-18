import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { TRACKS, RACERS, ITEMS } from '../src/data/content.ts'
import { CONFIG } from '../src/game.config.ts'
import { TrackCourse, createTrackQuery } from '../src/sim/track.ts'
import { roadGeometry } from '../src/entities/road-geometry.ts'
import { QualityController } from '../src/systems/quality.ts'
import { validateGameConfig } from '../src/systems/config-validator.ts'
import { GameSim } from '../src/sim/runtime.ts'

test('every racer has a bounded transparent Blender portrait', () => {
  for (const racer of RACERS) {
    const png = readFileSync(new URL(`../public/assets/portraits/${racer.id}.png`, import.meta.url))
    assert.equal(png.subarray(1, 4).toString(), 'PNG')
    assert.equal(png.readUInt32BE(16), 320)
    assert.equal(png.readUInt32BE(20), 400)
    assert.equal(png[25], 6, `${racer.id} must retain RGBA transparency`)
    assert.ok(png.length < 180_000, `${racer.id} portrait exceeds its payload budget`)
  }
})

test('road winding and normals face upward on every circuit', () => {
  for (const def of TRACKS) {
    const mesh = roadGeometry(new TrackCourse(def), 0, 1, -def.halfWidth, def.halfWidth, 0, 256)
    for (let i = 0; i < mesh.indices.length; i += 3) {
      const [a, b, c] = mesh.indices.slice(i, i + 3).map(index => index * 3)
      const ux = mesh.positions[b] - mesh.positions[a], uz = mesh.positions[b + 2] - mesh.positions[a + 2]
      const vx = mesh.positions[c] - mesh.positions[a], vz = mesh.positions[c + 2] - mesh.positions[a + 2]
      assert.ok(uz * vx - ux * vz > 0, `${def.id}: triangle ${i / 3}`)
      assert.ok(mesh.normals[a + 1] > 0)
    }
  }
})

test('Frostburrow central gap is cut exactly; the two 28% edge bands remain', () => {
  const course = new TrackCourse(TRACKS[2]), edge = course.def.halfWidth * .72
  const center = roadGeometry(course, .495, .53, -edge, edge, 0, 12)
  assert.equal(center.indices.length, 0)
  for (const side of [-1, 1]) {
    const bounds = side < 0 ? [-8, -edge] : [edge, 8]
    assert.ok(roadGeometry(course, .495, .53, ...bounds, 0, 12).indices.length > 0)
    const sample = course.sample(.515)
    const p = { x: sample.position.x + sample.rightX * 7 * side, y: sample.position.y, z: sample.position.z + sample.rightZ * 7 * side }
    assert.notEqual(course.query(p, .515).surface, 'void')
  }
  assert.ok(roadGeometry(course, .48, .49, -edge, edge, 0, 4).indices.length > 0)
  assert.ok(roadGeometry(course, .535, .55, -edge, edge, 0, 4).indices.length > 0)
})

test('allocation-free track methods are equivalent and preserve output identity', () => {
  for (const def of TRACKS) {
    const course = new TrackCourse(def), out = createTrackQuery(), position = out.position
    for (let i = 0; i < 400; i++) {
      const t = i / 200 - .4, expected = course.sample(t)
      assert.equal(course.sampleInto(t, out), out)
      assert.equal(out.position, position)
      assert.deepEqual(out.position, expected.position)
      assert.equal(out.tangentX, expected.tangentX)
      const query = course.query(expected.position, t)
      course.queryInto(expected.position, out, t)
      assert.deepEqual(out, query)
    }
  }
})

test('quality hysteresis changes resolution first and ignores paused/hidden work', () => {
  const quality = new QualityController(false)
  assert.equal(quality.level, 'medium')
  for (let i = 0; i < 100; i++) quality.update(.04, false)
  assert.equal(quality.resolutionScale, 1)
  for (let i = 0; i < 76; i++) quality.update(.04, true)
  assert.equal(quality.resolutionScale, .875)
  assert.equal(quality.level, 'medium')
  quality.select('high')
  for (let i = 0; i < 400; i++) quality.update(.06, true)
  assert.equal(quality.level, 'high')
  assert.equal(quality.resolutionScale, 1)
  assert.equal(new QualityController(true).level, 'low')
})

test('graphics validation aggregates invalid profiles and undersized pools', () => {
  const broken = structuredClone(CONFIG)
  broken.graphics.profiles.high.pixelRatio = 4
  broken.graphics.profiles.low.particles = 1000
  assert.throws(() => validateGameConfig(broken, RACERS, TRACKS, ITEMS), error => String(error).includes('pixelRatio') && String(error).includes('particles'))
})

test('QA-altered finishes cannot create best times', () => {
  const sim = new GameSim()
  sim.startRace(); sim.debugGrantItem('carrot-turbo'); sim.debugFinishPlayer()
  for (let i = 0; i < 1500; i++) sim.step(1 / 120)
  assert.equal(sim.phase, 'results')
  assert.deepEqual(sim.getBestTimes(), {})
})

function glb(name) {
  const data = readFileSync(new URL(`../public/assets/blender/${name}`, import.meta.url))
  assert.equal(data.readUInt32LE(0), 0x46546c67)
  assert.equal(data.readUInt32LE(4), 2)
  assert.equal(data.readUInt32LE(8), data.length)
  const jsonLength = data.readUInt32LE(12)
  const json = JSON.parse(data.subarray(20, 20 + jsonLength).toString())
  return { json, bytes: data.length }
}

test('Blender GLBs have valid bounded buffers and no external dependencies', () => {
  for (const name of readdirSync(new URL('../public/assets/blender/', import.meta.url))) {
    if (!name.endsWith('.glb')) continue
    const { json, bytes } = glb(name)
    assert.ok(bytes < 1_500_000, name)
    assert.equal(json.buffers.length, 1)
    assert.equal(json.buffers[0].uri, undefined)
    for (const view of json.bufferViews) assert.ok((view.byteOffset ?? 0) + view.byteLength <= json.buffers[0].byteLength)
    for (const mesh of json.meshes) for (const p of mesh.primitives) {
      assert.ok(json.accessors[p.attributes.POSITION].count > 0)
      assert.ok(json.accessors[p.indices].count % 3 === 0)
      assert.ok(p.material < json.materials.length)
    }
  }
})

test('each kart has stable animation pivots and a substantially cheaper LOD', () => {
  for (const weight of ['light', 'medium', 'heavy']) {
    const high = glb(`kart-${weight}.glb`).json, low = glb(`kart-${weight}-low.glb`).json
    for (const name of ['Head', 'Ear_L', 'Ear_R', 'Wheel_LF', 'Wheel_RF', 'Wheel_LB', 'Wheel_RB']) {
      assert.ok(high.nodes.some(node => node.name === name), name)
      assert.ok(low.nodes.some(node => node.name === name), name)
    }
    const tris = json => json.meshes.reduce((total, mesh) => total + mesh.primitives.reduce((sum, p) => sum + json.accessors[p.indices].count / 3, 0), 0)
    assert.ok(tris(low) < tris(high) * .4)
  }
})

test('every item is one bounded instancing primitive with a transparent Blender icon', () => {
  for (const item of ITEMS) {
    const { json } = glb(`item-${item.id}.glb`)
    assert.equal(json.meshes.length, 1, item.id)
    assert.equal(json.meshes[0].primitives.length, 1, item.id)
    const primitive = json.meshes[0].primitives[0]
    assert.ok(json.accessors[primitive.indices].count / 3 <= 7000)
    assert.ok(primitive.attributes.COLOR_0 !== undefined)
    for (const node of json.nodes) if (node.mesh !== undefined) {
      assert.deepEqual(node.translation ?? [0, 0, 0], [0, 0, 0])
      assert.deepEqual(node.scale ?? [1, 1, 1], [1, 1, 1])
      assert.deepEqual(node.rotation ?? [0, 0, 0, 1], [0, 0, 0, 1])
    }
    const icon = readFileSync(new URL(`../public/assets/icons/${item.id}.png`, import.meta.url))
    assert.equal(icon.readUInt32BE(16), 192)
    assert.equal(icon.readUInt32BE(20), 192)
    assert.equal(icon[25], 6, 'RGBA, not a baked rectangular backdrop')
  }
})
