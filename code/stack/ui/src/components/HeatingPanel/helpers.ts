import { STEPS } from './constants'

/**
 * La valeur d'un champ numérique après un clic sur « − » ou « + » : un pas de 1 (entier, jamais sous 0) ou de 0,5 (décimal,
 * qui peut être négatif et garde la virgule si la personne en tapait une). Un champ vide ou illisible repart de 0.
 */
export const stepValue = (value: string, kind: keyof typeof STEPS, direction: -1 | 1): string => {
  const current = Number(value.replace(',', '.'))
  const base = value.trim() === '' || Number.isNaN(current) ? 0 : current
  const next = Math.round((base + direction * STEPS[kind]) * 10000) / 10000
  const bounded = kind === 'number' ? Math.max(0, next) : next
  const text = String(bounded)
  return value.includes(',') ? text.replace('.', ',') : text
}
