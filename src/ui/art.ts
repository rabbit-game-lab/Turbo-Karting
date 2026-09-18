import { racerById, trackById, type RacerId, type TrackId, type ItemId } from '../data/content.ts'
import { RACER_VISUALS } from '../data/visuals.ts'
import { TrackCourse } from '../sim/track.ts'

const NS = 'http://www.w3.org/2000/svg'
function svg(markup: string, viewBox: string): SVGSVGElement {
  const node = document.createElementNS(NS, 'svg')
  node.setAttribute('viewBox', viewBox); node.setAttribute('aria-hidden', 'true')
  node.innerHTML = markup
  return node
}

export function portrait(id: RacerId): SVGSVGElement {
  const racer = racerById(id), visual = RACER_VISUALS[id]
  const accessory = visual.accessory === 'goggles'
    ? `<path d="M22 56H78" stroke="${racer.accent}" stroke-width="6"/><rect x="24" y="49" width="22" height="14" rx="6" fill="#477080"/><rect x="54" y="49" width="22" height="14" rx="6" fill="#477080"/>`
    : visual.accessory === 'cap' ? `<path d="M22 53Q24 31 50 31Q77 31 78 53Z" fill="${racer.color}"/><path d="M20 52H82" stroke="${racer.accent}" stroke-width="7"/>`
    : `<path d="M50 42L32 30V49ZM50 42L68 30V49Z" fill="${racer.accent}"/>`
  return svg(`<ellipse cx="51" cy="101" rx="40" ry="24" fill="${racer.color}"/><ellipse cx="35" cy="29" rx="10" ry="26" transform="rotate(-12 35 29)" fill="${visual.fur}"/><ellipse cx="65" cy="29" rx="10" ry="26" transform="rotate(12 65 29)" fill="${visual.fur}"/><ellipse cx="35" cy="26" rx="4" ry="18" fill="#e9a2aa"/><ellipse cx="65" cy="26" rx="4" ry="18" fill="#e9a2aa"/><ellipse cx="50" cy="65" rx="32" ry="29" fill="${visual.fur}"/><ellipse cx="37" cy="63" rx="4" ry="7" fill="#26374b"/><ellipse cx="63" cy="63" rx="4" ry="7" fill="#26374b"/><circle cx="36" cy="61" r="1.5" fill="white"/><circle cx="62" cy="61" r="1.5" fill="white"/><ellipse cx="40" cy="77" rx="13" ry="9" fill="#fff4df"/><ellipse cx="60" cy="77" rx="13" ry="9" fill="#fff4df"/><path d="M45 72Q50 67 55 72L50 77Z" fill="#bf788c"/><path d="M42 82Q50 88 58 82" fill="none" stroke="#946b65" stroke-width="2"/>${accessory}`, '0 0 100 110')
}

const outlines = new Map<TrackId, { path: string; minX: number; minZ: number; scale: number }>()
export function trackOutline(id: TrackId) {
  const cached = outlines.get(id)
  if (cached) return cached
  const course = new TrackCourse(trackById(id)), points = Array.from({ length: 128 }, (_, i) => course.sample(i / 128).position)
  const minX = Math.min(...points.map(p => p.x)), minZ = Math.min(...points.map(p => p.z))
  const width = Math.max(...points.map(p => p.x)) - minX, depth = Math.max(...points.map(p => p.z)) - minZ
  const scale = 160 / Math.max(width, depth)
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${((p.x - minX) * scale + 20).toFixed(1)},${((p.z - minZ) * scale + 20).toFixed(1)}`).join(' ') + 'Z'
  const result = { path, minX, minZ, scale }; outlines.set(id, result); return result
}

export function trackArt(id: TrackId): SVGSVGElement {
  const track = trackById(id), outline = trackOutline(id)
  return svg(`<image href="assets/backgrounds/background-${track.theme}.jpg" width="240" height="180" preserveAspectRatio="xMidYMid slice"/><path d="${outline.path}" transform="translate(26 -4) scale(.83)" fill="none" stroke="#fff4df" stroke-width="11" stroke-linejoin="round"/><path d="${outline.path}" transform="translate(26 -4) scale(.83)" fill="none" stroke="${track.palette.road}" stroke-width="6"/>`, '0 0 240 180')
}

export function itemArt(id: ItemId): SVGSVGElement {
  return svg(`<image href="assets/icons/${id}.png" width="64" height="64"/>`, '0 0 64 64')
}
