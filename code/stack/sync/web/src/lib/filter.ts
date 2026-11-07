import type { Filter } from '@/types'

export const NO_FILTER: Filter = { match: '', day: '' }

/** La période [from, to[ (secondes depuis 1970) d'un jour « AAAA-MM-JJ » à l'heure locale ; null si le jour est vide ou invalide. */
export const dayRange = (day: string): { from: number; to: number } | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day)
  if (!match) return null
  const start = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  const end = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + 1)
  return { from: start.getTime() / 1000, to: end.getTime() / 1000 }
}

/** Les paramètres d'adresse d'un filtre (`match`, `from`, `to`), à ajouter à une requête ; vides si rien n'est choisi. */
export const filterQuery = (filter: Filter, matchName = 'match'): string => {
  const range = dayRange(filter.day)
  const parts: string[] = []
  if (filter.match !== '') parts.push(`${matchName}=${encodeURIComponent(filter.match)}`)
  if (range) parts.push(`from=${range.from}`, `to=${range.to}`)
  return parts.length > 0 ? `&${parts.join('&')}` : ''
}
