import { ApiError } from '@/lib/api'
import {
  BAD_CODE_TEXT,
  CODE_LENGTH,
  EXPIRED_TEXT,
  NOT_PAIRED_KEY_TEXT,
  PAIR_FAILED_TEXT,
  SEND_ERROR_TEXT,
  SEND_FAILED_TEXT,
  SLOW_TEXT,
  START_OFF_TEXT,
} from './constants'

/** Le texte d'une touche qui n'est pas partie : 409 = Player plus associé, 502 = éteint ou injoignable. */
export const sendErrorText = (error: unknown): string => {
  if (error instanceof ApiError && error.status === 409) return NOT_PAIRED_KEY_TEXT
  return error instanceof ApiError && error.status === 502 ? SEND_ERROR_TEXT : SEND_FAILED_TEXT
}

/** L'état du Player dit par la box : en ligne, éteint ou en veille, ou inconnu (null). */
/** Le texte d'un échec d'association : 502 Player éteint, 504 délai, 422 code faux, 409 association expirée. */
export const pairErrorText = (error: unknown): string => {
  const status = error instanceof ApiError ? error.status : 0
  if (status === 502) return START_OFF_TEXT
  if (status === 504) return SLOW_TEXT
  if (status === 422) return BAD_CODE_TEXT
  return status === 409 ? EXPIRED_TEXT : PAIR_FAILED_TEXT
}

/** Ce qui est saisi, gardé aux 6 caractères hexadécimaux en majuscules. */
export const cleanCode = (value: string): string => value.toUpperCase().replace(/[^0-9A-F]/g, '').slice(0, CODE_LENGTH)

export const isCodeComplete = (code: string): boolean => code.length === CODE_LENGTH

/** Le Player a refusé le code (422) : on peut le ressaisir sans recommencer l'association. */
export const isWrongCode = (error: unknown): boolean => error instanceof ApiError && error.status === 422
