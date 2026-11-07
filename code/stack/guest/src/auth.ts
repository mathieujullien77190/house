// L'accès : la clé est dans l'adresse de chaque demande (`/?k=…`, et dans celle de chaque flux que la page ouvre) : rien n'est gardé, ni cookie ni session.
import { createHmac, timingSafeEqual } from 'node:crypto'

/** Compare deux textes sans révéler où ils diffèrent (ni leur longueur : on compare des empreintes). */
export const sameSecret = (given: string, expected: string): boolean =>
  timingSafeEqual(createHmac('sha256', 'cmp').update(given).digest(), createHmac('sha256', 'cmp').update(expected).digest())
