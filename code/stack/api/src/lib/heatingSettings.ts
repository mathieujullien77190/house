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
}

/** Le prix du kWh en heures creuses (€ TTC) : 0,1589 € chez TotalEnergies au 8 novembre 2026 (donné par l'utilisateur). Une constante, pas un réglage. */
export const OFF_PEAK_PRICE_KWH = 0.1589
/** Le prix du kWh en heures pleines (€ TTC) : 0,2142 €. Copié dans `sync/src/cameraEnergy.ts` : si l'un change, changer l'autre. */
export const PEAK_PRICE_KWH = 0.2142

/** Les heures creuses « HH:MM » heure de Paris : 23:10 → 07:10 chez Enedis, été comme hiver (donné par l'utilisateur). Des constantes, pas des réglages. Copiées dans `sync/src/cameraEnergy.ts` : si l'un change, changer l'autre. */
export const OFF_PEAK_START = '23:10'
export const OFF_PEAK_END = '07:10'

/** La puissance du chauffage en watts (donnée par l'utilisateur ; la prise HS100 ne mesure rien), pour chiffrer le coût. Une constante, pas un réglage. */
export const HEATER_WATTS = 2000

export const DEFAULT_SETTINGS: HeatingSettings = {
  enabled: true,
  thresholdC: 3,
  minutes: 5,
  cooldownMinutes: 20,
}

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
  const { enabled, thresholdC, minutes, cooldownMinutes } = body as Record<string, unknown>
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
  if (next.cooldownMinutes < next.minutes) return 'cooldownMinutes must be at least minutes (the delay counts from the start of an activation)'
  return next
}

export const createHeatingSettings = (file: string) => {
  const store = {
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
    /** Désactive la règle (un mouvement a coupé le chauffage) ; les autres réglages restent. */
    disable: (): void => store.set({ ...store.get(), enabled: false }),
  }
  return store
}

export type HeatingSettingsStore = ReturnType<typeof createHeatingSettings>
