// Les réglages de la règle du chauffage automatique, gardés dans STATE_DIR/heating.json (écriture dans un fichier temporaire puis renommé).
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

export interface HeatingSettings {
  /** La règle est active. */
  enabled: boolean
  /** Chauffer quand il fait moins que ça (°C). */
  thresholdC: number
  /** La durée de chaque activation (minutes) : la prise s'éteint ensuite toute seule. */
  minutes: number
  /** Le temps entre le DÉBUT d'une activation et la suivante possible (minutes) : la durée allumée, plus le repos. */
  cooldownMinutes: number
  /** Le prix du kWh en heures creuses (€ TTC) : 0,1589 € chez TotalEnergies au 8 novembre 2026 (donné par l'utilisateur). */
  priceKwh: number
  /** Le prix du kWh en heures pleines (€ TTC) : 0,2142 €. */
  peakPriceKwh: number
  /** Début et fin des heures creuses, « HH:MM » heure de Paris : 23:10 → 07:10 chez Enedis, été comme hiver (donné par l'utilisateur) ; null : inconnues, le coût compte alors tout au tarif creux. */
  offPeakStart: string | null
  offPeakEnd: string | null
  /** La puissance du chauffage en watts (2000 W, donnée par l'utilisateur ; la prise HS100 ne mesure rien), pour chiffrer le coût ; null : inconnue. */
  heaterWatts: number | null
}

export const DEFAULT_SETTINGS: HeatingSettings = {
  enabled: true,
  thresholdC: 3,
  minutes: 5,
  cooldownMinutes: 20,
  priceKwh: 0.1589,
  peakPriceKwh: 0.2142,
  offPeakStart: '23:10',
  offPeakEnd: '07:10',
  heaterWatts: 2000,
}
export const MAX_PRICE = 5
export const MAX_WATTS = 5000
const CLOCK = /^([01][0-9]|2[0-3]):[0-5][0-9]$/

export const MIN_THRESHOLD = -30
export const MAX_THRESHOLD = 30
/** Le même plafond que le minuteur de la prise. */
export const MAX_MINUTES = 120
export const MAX_COOLDOWN = 1440

/**
 * Les réglages demandés par une requête, fusionnés avec les actuels : une valeur absente garde l'ancienne.
 * Rend le texte de l'erreur si une valeur est refusée.
 */
export const mergeSettings = (body: unknown, current: HeatingSettings): HeatingSettings | string => {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return 'body must be an object'
  const { enabled, thresholdC, minutes, cooldownMinutes, priceKwh, peakPriceKwh, offPeakStart, offPeakEnd, heaterWatts } = body as Record<string, unknown>
  const next = { ...current }
  if (enabled !== undefined) {
    if (typeof enabled !== 'boolean') return 'enabled must be a boolean'
    next.enabled = enabled
  }
  if (thresholdC !== undefined) {
    if (typeof thresholdC !== 'number' || !Number.isFinite(thresholdC) || thresholdC < MIN_THRESHOLD || thresholdC > MAX_THRESHOLD) {
      return `thresholdC must be a number from ${MIN_THRESHOLD} to ${MAX_THRESHOLD}`
    }
    next.thresholdC = thresholdC
  }
  if (minutes !== undefined) {
    if (typeof minutes !== 'number' || !Number.isInteger(minutes) || minutes < 1 || minutes > MAX_MINUTES) return `minutes must be an integer from 1 to ${MAX_MINUTES}`
    next.minutes = minutes
  }
  if (cooldownMinutes !== undefined) {
    if (typeof cooldownMinutes !== 'number' || !Number.isInteger(cooldownMinutes) || cooldownMinutes > MAX_COOLDOWN) {
      return `cooldownMinutes must be an integer up to ${MAX_COOLDOWN}`
    }
    next.cooldownMinutes = cooldownMinutes
  }
  for (const [key, value] of [['priceKwh', priceKwh], ['peakPriceKwh', peakPriceKwh]] as const) {
    if (value === undefined) continue
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > MAX_PRICE) return `${key} must be a number from 0 to ${MAX_PRICE}`
    next[key] = value
  }
  for (const [key, value] of [['offPeakStart', offPeakStart], ['offPeakEnd', offPeakEnd]] as const) {
    if (value === undefined) continue
    if (value !== null && (typeof value !== 'string' || !CLOCK.test(value))) return `${key} must be "HH:MM" or null`
    next[key] = value
  }
  if (heaterWatts !== undefined) {
    if (heaterWatts !== null && (typeof heaterWatts !== 'number' || !Number.isInteger(heaterWatts) || heaterWatts < 1 || heaterWatts > MAX_WATTS)) {
      return `heaterWatts must be an integer from 1 to ${MAX_WATTS} or null`
    }
    next.heaterWatts = heaterWatts
  }
  if (next.cooldownMinutes < next.minutes) return 'cooldownMinutes must be at least minutes (the delay counts from the start of an activation)'
  return next
}

export const createHeatingSettings = (file: string) => ({
  /** Les réglages gardés ; ceux par défaut si le fichier manque ou est abîmé. */
  get: (): HeatingSettings => {
    try {
      const merged = mergeSettings(JSON.parse(readFileSync(file, 'utf8')), DEFAULT_SETTINGS)
      return typeof merged === 'string' ? DEFAULT_SETTINGS : merged
    } catch {
      return DEFAULT_SETTINGS
    }
  },
  set: (settings: HeatingSettings): void => {
    mkdirSync(dirname(file), { recursive: true })
    const partial = `${file}.tmp`
    writeFileSync(partial, JSON.stringify(settings, null, 2))
    renameSync(partial, file)
  },
})

export type HeatingSettingsStore = ReturnType<typeof createHeatingSettings>
