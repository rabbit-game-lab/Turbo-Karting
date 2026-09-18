export type Difficulty = 'easy' | 'normal' | 'hard'
export type WeightClass = 'light' | 'medium' | 'heavy'

export interface RacerDef {
  readonly id: string
  readonly name: string
  readonly weightClass: WeightClass
  readonly color: string
  readonly accent: string
  readonly bio: string
  readonly stats: { readonly speed: number; readonly acceleration: number; readonly handling: number; readonly weight: number; readonly miniTurbo: number }
}

export interface TrackDef {
  readonly id: string
  readonly name: string
  readonly theme: 'meadow' | 'desert' | 'snow' | 'neon'
  readonly description: string
  readonly difficulty: 1 | 2 | 3
  readonly laps: number
  readonly halfWidth: number
  readonly wallFactor: number
  readonly controlPoints: readonly (readonly [number, number, number])[]
  readonly itemRows: readonly number[]
  readonly boostPads: readonly number[]
  readonly jumpCrests: readonly number[]
  readonly voidRanges?: readonly (readonly [number, number])[]
  readonly palette: { readonly sky: string; readonly horizon: string; readonly ground: string; readonly road: string; readonly curb: string; readonly accent: string; readonly fog: string }
}

export type ItemKind = 'hazard' | 'projectile' | 'homing' | 'leader' | 'boost' | 'tripleBoost' | 'goldenBoost' | 'star' | 'lightning' | 'bomb'
export interface ItemDef { readonly id: string; readonly name: string; readonly glyph: string; readonly color: string; readonly kind: ItemKind }

export const RACERS = [
  { id: 'pip', name: 'Pip Quicktail', weightClass: 'light', color: '#62e6ff', accent: '#ff4fa3', bio: 'Tiny wheels, enormous nerve.', stats: { speed: 0.42, acceleration: 0.94, handling: 0.95, weight: 0.3, miniTurbo: 0.88 } },
  { id: 'clover', name: 'Clover Comet', weightClass: 'light', color: '#8df26e', accent: '#fff16a', bio: 'Finds the fastest line by luck.', stats: { speed: 0.48, acceleration: 0.9, handling: 0.9, weight: 0.32, miniTurbo: 0.96 } },
  { id: 'tansy', name: 'Tansy Twirl', weightClass: 'light', color: '#ff8fcf', accent: '#8f7cff', bio: 'Turns every hairpin into a dance.', stats: { speed: 0.45, acceleration: 0.88, handling: 1, weight: 0.28, miniTurbo: 0.9 } },
  { id: 'juniper', name: 'Juniper Jet', weightClass: 'medium', color: '#ff7b54', accent: '#ffd166', bio: 'Fast, focused, and always composed.', stats: { speed: 0.72, acceleration: 0.73, handling: 0.7, weight: 0.58, miniTurbo: 0.72 } },
  { id: 'hazel', name: 'Hazel Hop', weightClass: 'medium', color: '#ffd166', accent: '#55d6be', bio: 'A balanced racer with fearless hops.', stats: { speed: 0.68, acceleration: 0.78, handling: 0.78, weight: 0.55, miniTurbo: 0.76 } },
  { id: 'bramble', name: 'Bramble Bolt', weightClass: 'medium', color: '#9b87f5', accent: '#49e0ff', bio: 'A technical drifter with a bright spark.', stats: { speed: 0.76, acceleration: 0.69, handling: 0.74, weight: 0.62, miniTurbo: 0.83 } },
  { id: 'bruno', name: 'Bruno Burrow', weightClass: 'heavy', color: '#53b175', accent: '#f7c95c', bio: 'Built like a barn, moves like thunder.', stats: { speed: 0.96, acceleration: 0.42, handling: 0.45, weight: 0.98, miniTurbo: 0.44 } },
  { id: 'rosie', name: 'Rosie Rumble', weightClass: 'heavy', color: '#ed5b72', accent: '#ffd9a3', bio: 'Owns the straight and never yields.', stats: { speed: 1, acceleration: 0.38, handling: 0.42, weight: 1, miniTurbo: 0.48 } },
] as const satisfies readonly RacerDef[]

const meadowPoints = [[0,0,70],[-36,1,58],[-68,0,24],[-62,2,-24],[-28,5,-52],[18,7,-60],[58,2,-42],[70,0,2],[48,1,40],[18,0,55]] as const
const desertPoints = [[0,0,84],[-46,2,70],[-82,7,28],[-64,12,-18],[-78,5,-62],[-20,2,-80],[32,6,-64],[76,10,-34],[84,2,18],[48,0,60]] as const
const snowPoints = [[0,2,76],[-42,5,62],[-70,10,22],[-52,15,-20],[-76,8,-58],[-24,2,-78],[28,9,-64],[68,14,-30],[76,6,18],[44,2,58]] as const
const neonPoints = [[0,0,82],[-48,0,72],[-84,4,30],[-60,8,-8],[-78,2,-58],[-26,0,-84],[22,5,-66],[66,0,-70],[86,2,-24],[64,7,20],[48,0,64]] as const

export const TRACKS = [
  { id: 'meadow-mile', name: 'Meadow Mile', theme: 'meadow', description: 'Festival flags, orchard bends, and a joyful jump.', difficulty: 1, laps: 3, halfWidth: 8, wallFactor: 1.22, controlPoints: meadowPoints, itemRows: [0.11,0.39,0.64,0.84], boostPads: [0.27,0.58,0.93], jumpCrests:[0.315], palette: { sky:'#70d9ff', horizon:'#e7fbff', ground:'#6fbd58', road:'#343a46', curb:'#fff4d5', accent:'#ff5f8f', fog:'#bcecff' } },
  { id: 'carrot-canyon', name: 'Carrot Canyon', theme: 'desert', description: 'Sun-baked straights between towering red arches.', difficulty: 2, laps: 3, halfWidth: 8.5, wallFactor: 1.2, controlPoints: desertPoints, itemRows: [0.12,0.41,0.62,0.87], boostPads: [0.24,0.54,0.9], jumpCrests:[0.49], palette: { sky:'#54c8f4', horizon:'#ffe3a0', ground:'#d18b45', road:'#3e3b42', curb:'#ffe69a', accent:'#ff663f', fog:'#e9bd7a' } },
  { id: 'frostburrow-falls', name: 'Frostburrow Falls', theme: 'snow', description: 'Glacier bridges, frozen waterfalls, and a risky ledge.', difficulty: 2, laps: 3, halfWidth: 8, wallFactor: 1.2, controlPoints: snowPoints, itemRows: [0.08,0.36,0.63,0.9], boostPads: [0.2,0.66,0.94], jumpCrests:[0.43], voidRanges: [[0.49,0.535]], palette: { sky:'#91b9e8', horizon:'#eef7ff', ground:'#cfe4ed', road:'#48535f', curb:'#f6fbff', accent:'#55dfff', fog:'#dcebf4' } },
  { id: 'neon-warren', name: 'Neon Warren', theme: 'neon', description: 'A midnight sprint through glowing tunnels and towers.', difficulty: 3, laps: 3, halfWidth: 7.5, wallFactor: 1.18, controlPoints: neonPoints, itemRows: [0.09,0.4,0.57,0.8], boostPads: [0.17,0.51,0.75], jumpCrests:[0.29], palette: { sky:'#10082c', horizon:'#32155d', ground:'#15122a', road:'#211f35', curb:'#efefff', accent:'#ff48d7', fog:'#231344' } },
] as const satisfies readonly TrackDef[]

export const ITEMS = [
  { id:'berry-slick', name:'Berry Slick', glyph:'●', color:'#b63878', kind:'hazard' },
  { id:'acorn-bolt', name:'Acorn Bolt', glyph:'◆', color:'#8bc34a', kind:'projectile' },
  { id:'beet-seeker', name:'Beet Seeker', glyph:'◈', color:'#ef476f', kind:'homing' },
  { id:'crown-comet', name:'Crown Comet', glyph:'♛', color:'#4cc9f0', kind:'leader' },
  { id:'carrot-turbo', name:'Carrot Turbo', glyph:'▲', color:'#ff8c42', kind:'boost' },
  { id:'triple-carrot', name:'Triple Carrot', glyph:'▲▲▲', color:'#ffb347', kind:'tripleBoost' },
  { id:'golden-carrot', name:'Golden Carrot', glyph:'✦', color:'#ffd60a', kind:'goldenBoost' },
  { id:'lucky-clover', name:'Lucky Clover', glyph:'✤', color:'#55d66b', kind:'star' },
  { id:'storm-bell', name:'Storm Bell', glyph:'ϟ', color:'#b9d6ff', kind:'lightning' },
  { id:'burrow-bomb', name:'Burrow Bomb', glyph:'✹', color:'#34323e', kind:'bomb' },
] as const satisfies readonly ItemDef[]

export type RacerId = (typeof RACERS)[number]['id']
export type TrackId = (typeof TRACKS)[number]['id']
export type ItemId = (typeof ITEMS)[number]['id']
export function racerById(id: string): RacerDef { return RACERS.find((entry) => entry.id === id) ?? RACERS[0] }
export function trackById(id: string): TrackDef { return TRACKS.find((entry) => entry.id === id) ?? TRACKS[0] }
export function itemById(id: string): ItemDef | undefined { return ITEMS.find((entry) => entry.id === id) }
