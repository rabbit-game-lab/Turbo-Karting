import { RACERS, racerById, type RacerId } from '../data/content.ts'
import './racer-showroom.css'

/** DOM owns only portraits and copy; MenuView owns the single live 3D model. */
export function createRacerShowroom(select: (id: RacerId) => void, confirm: () => void, back: () => void) {
  const screen = document.createElement('section')
  screen.className = 'screen racer-showroom hidden'
  screen.innerHTML = `<div class="showroom-panel">
    <header><span class="eyebrow">01 / THE STARTING LINEUP</span><h2>MEET YOUR<br><em>RACER.</em></h2></header>
    <div class="portrait-grid" aria-label="Choose your racer"></div>
    <div class="racer-dossier" aria-live="polite"><span class="dossier-class"></span><h3></h3><p></p><div class="dossier-stats"></div></div>
    <div class="showroom-actions"><button class="rabbit-button ghost" type="button">‹ TITLE</button><button class="rabbit-button primary" type="button">CHOOSE RACER ›</button></div>
  </div><div class="showroom-caption"><span>LIVE SHOWROOM / 3D</span><strong></strong><small>BUILT TO CHASE THE CROWN</small></div>`
  const grid = screen.querySelector('.portrait-grid')!
  const cards: HTMLButtonElement[] = []
  for (const racer of RACERS) {
    const card = document.createElement('button')
    card.type = 'button'
    card.className = 'portrait-card'
    card.dataset.racer = racer.id
    card.setAttribute('aria-label', racer.name)
    card.style.setProperty('--racer', racer.color)
    const image = document.createElement('img')
    image.src = `assets/portraits/${racer.id}.png`
    image.alt = ''
    image.width = 320; image.height = 400
    image.draggable = false
    const label = document.createElement('span')
    label.textContent = racer.name.split(' ')[0]
    card.append(image, label)
    card.addEventListener('click', () => select(racer.id))
    card.addEventListener('focus', () => select(racer.id))
    cards.push(card); grid.append(card)
  }
  screen.querySelector<HTMLButtonElement>('.ghost')!.onclick = back
  screen.querySelector<HTMLButtonElement>('.primary')!.onclick = confirm
  let current: RacerId | null = null
  function update(id: RacerId): void {
    if (id === current) return
    current = id
    const racer = racerById(id)
    screen.style.setProperty('--selected-racer', racer.color)
    for (const card of cards) {
      const selected = card.dataset.racer === id
      card.classList.toggle('selected', selected)
      card.setAttribute('aria-pressed', String(selected))
    }
    screen.querySelector('.dossier-class')!.textContent = `${racer.weightClass.toUpperCase()} CLASS / ${String(RACERS.findIndex(entry => entry.id === id) + 1).padStart(2, '0')}`
    screen.querySelector('h3')!.textContent = racer.name
    screen.querySelector('.racer-dossier p')!.textContent = racer.bio
    screen.querySelector('.showroom-caption strong')!.textContent = racer.name
    const stats = screen.querySelector('.dossier-stats')!
    stats.replaceChildren()
    for (const [label, value] of [['SPEED', racer.stats.speed], ['HANDLING', racer.stats.handling], ['ACCEL.', racer.stats.acceleration]] as const) {
      const stat = document.createElement('div')
      const name = document.createElement('span')
      name.textContent = label
      const meter = document.createElement('meter')
      meter.min = 0; meter.max = 1; meter.value = value
      meter.setAttribute('aria-label', label)
      stat.append(name, meter); stats.append(stat)
    }
  }
  return { screen, update }
}
