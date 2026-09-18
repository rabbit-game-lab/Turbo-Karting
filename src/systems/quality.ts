import { CONFIG } from '../game.config.ts'
import type { QualityChoice, QualityLevel } from '../data/visuals.ts'

/** Pure quality policy. The renderer owns applying changes, never the simulation. */
export class QualityController {
  choice: QualityChoice = 'auto'
  level: QualityLevel
  resolutionScale = 1
  private slow = 0
  private fast = 0
  constructor(touch: boolean) { this.level = touch ? 'low' : 'medium' }
  get profile() { return CONFIG.graphics.profiles[this.level] }

  select(choice: QualityChoice): void {
    this.choice = choice
    if (choice !== 'auto') this.level = choice
    this.resolutionScale = 1
    this.slow = this.fast = 0
  }

  update(frameSeconds: number, active: boolean): boolean {
    if (!active || this.choice !== 'auto' || frameSeconds <= 0 || frameSeconds > .2) {
      this.slow = this.fast = 0
      return false
    }
    const budget = 1 / this.profile.targetFps
    this.slow = frameSeconds > budget * 1.18 ? this.slow + frameSeconds : Math.max(0, this.slow - frameSeconds)
    this.fast = frameSeconds < budget * .88 ? this.fast + frameSeconds : 0
    if (this.slow >= CONFIG.graphics.downgradeSeconds) {
      if (this.resolutionScale > .75) this.resolutionScale = Math.max(.75, this.resolutionScale - .125)
      else if (this.level !== 'low') { this.level = this.level === 'high' ? 'medium' : 'low'; this.resolutionScale = 1 }
      this.slow = this.fast = 0
      return true
    }
    if (this.fast >= CONFIG.graphics.upgradeSeconds) {
      if (this.resolutionScale < 1) this.resolutionScale = Math.min(1, this.resolutionScale + .125)
      else if (this.level !== 'high') this.level = this.level === 'low' ? 'medium' : 'high'
      this.slow = this.fast = 0
      return true
    }
    return false
  }
}
