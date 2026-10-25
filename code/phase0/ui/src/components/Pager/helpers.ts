import { EMPTY_TEXT } from './constants'

export const pageCount = (total: number, size: number): number => Math.max(1, Math.ceil(total / size))

/** « 1 à 20 sur 143 » ; « vide » s'il n'y a rien. */
export const pageText = (page: number, size: number, total: number): string => {
  if (total === 0) return EMPTY_TEXT
  const first = page * size + 1
  const last = Math.min(total, (page + 1) * size)
  return `${first} à ${last} sur ${total}`
}
