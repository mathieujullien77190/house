import type { SeasonChoice } from './garden/seasons'
import type { Sky } from './weather'

/** Ce qu'on choisit au-dessus de la vue : la saison du jardin (ou « auto »), le temps qu'il fait, et le vent. */
export interface Climate {
  season: SeasonChoice
  sky: Sky
  wind: boolean
}

/** À la première ouverture : le printemps, du soleil, pas de vent. */
export const DEFAULT_CLIMATE: Climate = { season: 'spring', sky: 'sun', wind: false }

/** Le choix est gardé sur l'appareil, sous cette clé de `localStorage`. */
export const CLIMATE_KEY = 'house-garden-climate'

const SEASON_CHOICES: SeasonChoice[] = ['spring', 'summer', 'autumn', 'winter', 'auto']
const SKY_CHOICES: Sky[] = ['sun', 'rain', 'snow']

/** Le choix gardé sur l'appareil ; ce qui manque ou n'a pas de sens reprend sa valeur de départ. */
export const loadClimate = (): Climate => {
  try {
    const kept = JSON.parse(localStorage.getItem(CLIMATE_KEY) ?? '{}') as Partial<Climate> | null
    return {
      season: SEASON_CHOICES.find((choice) => choice === kept?.season) ?? DEFAULT_CLIMATE.season,
      sky: SKY_CHOICES.find((choice) => choice === kept?.sky) ?? DEFAULT_CLIMATE.sky,
      wind: kept?.wind === true,
    }
  } catch {
    return DEFAULT_CLIMATE
  }
}

/** Garde le choix sur l'appareil. */
export const saveClimate = (climate: Climate): void => {
  try {
    localStorage.setItem(CLIMATE_KEY, JSON.stringify(climate))
  } catch {
    // pas de stockage : le choix ne survit pas au rechargement
  }
}
