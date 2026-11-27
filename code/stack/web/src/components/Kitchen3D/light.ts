import type { LightMode } from './types'

/** Au départ : plein jour. */
export const DEFAULT_LIGHT: LightMode = 'day'

/** Où le choix de la lumière est gardé sur l'appareil (`localStorage`). */
export const LIGHT_KEY = 'house-3d-light'

const LIGHT_MODES: LightMode[] = ['day', 'now']

/** Le choix gardé sur l'appareil ; sans choix, ou s'il est illisible : plein jour. */
export const loadLight = (): LightMode => {
  try {
    const kept = localStorage.getItem(LIGHT_KEY)
    return LIGHT_MODES.find((mode) => mode === kept) ?? DEFAULT_LIGHT
  } catch {
    return DEFAULT_LIGHT
  }
}

/** Garde le choix sur l'appareil (sans effet si le stockage est refusé). */
export const saveLight = (light: LightMode): void => {
  try {
    localStorage.setItem(LIGHT_KEY, light)
  } catch {
    // Stockage refusé (navigation privée) : le choix vaut pour cette visite.
  }
}
