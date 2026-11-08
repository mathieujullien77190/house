import { formatTime } from '@/lib/format'
import type { HeatingLogEntry, HeatingSettingsBody, HeatingStatus } from '@/types'
import { NO_COST, ORIGIN_LABELS, STATUS_TEXTS } from './constants'
import type { HeatingForm } from './types'

/** Un nombre à la française : virgule, sans zéros inutiles (« 0,1589 », « 3 »). */
export const frNumber = (value: number, maxDigits = 4): string => value.toLocaleString('fr-FR', { maximumFractionDigits: maxDigits, useGrouping: false })

/** Un montant en euros : au moins deux décimales, jusqu'à quatre (« 0,0265 € », « 0,03 € »). */
export const euros = (value: number): string => `${value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} €`

/** Les réglages reçus en champs de formulaire. */
export const toForm = (status: HeatingStatus): HeatingForm => ({
  threshold: frNumber(status.thresholdC),
  minutes: String(status.minutes),
  cooldown: String(status.cooldownMinutes),
  price: frNumber(status.priceKwh),
  peakPrice: frNumber(status.peakPriceKwh),
  offPeakStart: status.offPeakStart ?? '',
  offPeakEnd: status.offPeakEnd ?? '',
  watts: status.heaterWatts === null ? '' : String(status.heaterWatts),
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
  const priceKwh = parseDecimal(form.price)
  const peakPriceKwh = parseDecimal(form.peakPrice)
  const heaterWatts = form.watts.trim() === '' ? null : parseInteger(form.watts)
  if (thresholdC === null || minutes === null || cooldownMinutes === null || priceKwh === null || peakPriceKwh === null) return null
  if (form.watts.trim() !== '' && heaterWatts === null) return null
  return {
    enabled,
    thresholdC,
    minutes,
    cooldownMinutes,
    priceKwh,
    peakPriceKwh,
    offPeakStart: form.offPeakStart === '' ? null : form.offPeakStart,
    offPeakEnd: form.offPeakEnd === '' ? null : form.offPeakEnd,
    heaterWatts,
  }
}

/** Ce que la règle ferait maintenant, en une phrase. */
export const statusText = (status: HeatingStatus): string => {
  if (!status.enabled) return STATUS_TEXTS.off
  if (status.temperature === null) return STATUS_TEXTS.unknown
  if (!status.night) return STATUS_TEXTS.day
  if (!status.cold) return STATUS_TEXTS.warm
  return STATUS_TEXTS.heat
}

export const rowOf = (entry: HeatingLogEntry) => ({
  id: `${entry.at}-${entry.origin}`,
  when: formatTime(entry.at),
  origin: ORIGIN_LABELS[entry.origin],
  duration: `${entry.minutes} min`,
  temperature: entry.temperature === null ? NO_COST : `${frNumber(entry.temperature, 1)} °C`,
  cost: entry.cost === null ? NO_COST : euros(entry.cost),
})

/** La somme des coûts connus, ou null s'il n'y en a aucun. */
export const totalCost = (entries: HeatingLogEntry[]): number | null => {
  const costs = entries.map((entry) => entry.cost).filter((cost): cost is number => cost !== null)
  return costs.length === 0 ? null : costs.reduce((sum, cost) => sum + cost, 0)
}
