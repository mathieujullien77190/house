import type { HeatingSettingsBody, HeatingStatus } from '@/types'
import type { HeatingForm } from './types'

/** Un nombre à la française : virgule, sans zéros inutiles (« 0,1589 », « 3 »). */
export const frNumber = (value: number, maxDigits = 4): string => value.toLocaleString('fr-FR', { maximumFractionDigits: maxDigits, useGrouping: false })

/** Les réglages reçus en champs de formulaire. */
export const toForm = (status: HeatingStatus): HeatingForm => ({
  threshold: frNumber(status.thresholdC),
  minutes: String(status.minutes),
  cooldown: String(status.cooldownMinutes),
})

/** Un nombre tapé (virgule ou point) ; null s'il n'en est pas un. */
export const parseDecimal = (text: string): number | null => {
  const clean = text.trim().replace(',', '.')
  return /^-?\d+(\.\d+)?$/.test(clean) ? Number(clean) : null
}

const parseInteger = (text: string): number | null => {
  const value = parseDecimal(text)
  return value !== null && Number.isInteger(value) ? value : null
}

/** Ce qu'on envoie à l'API ; null si un champ n'est pas lisible (les bornes sont vérifiées par l'API). */
export const toBody = (form: HeatingForm, enabled: boolean): HeatingSettingsBody | null => {
  const thresholdC = parseDecimal(form.threshold)
  const minutes = parseInteger(form.minutes)
  const cooldownMinutes = parseInteger(form.cooldown)
  if (thresholdC === null || minutes === null || cooldownMinutes === null) return null
  return {
    enabled,
    thresholdC,
    minutes,
    cooldownMinutes,
  }
}
