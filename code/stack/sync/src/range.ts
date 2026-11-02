// Les demandes de morceaux d'un fichier (en-tête Range) : un téléphone lit une vidéo par morceaux, sans tout télécharger
// avant de commencer, et s'y déplace. Un seul intervalle est géré ; une demande qu'on ne comprend pas est ignorée
// (le fichier entier est servi, ce que la norme permet).

export interface ByteRange {
  /** Premier et dernier octets demandés, inclus. */
  start: number
  end: number
}

/**
 * `bytes=a-b`, `bytes=a-` (jusqu'à la fin) ou `bytes=-n` (les n derniers octets).
 * Rend null sans Range (ou s'il n'est pas lisible), 'invalid' si l'intervalle sort du fichier (réponse 416).
 */
export const parseRange = (header: string | undefined, size: number): ByteRange | 'invalid' | null => {
  const match = /^bytes=(\d*)-(\d*)$/.exec((header ?? '').trim())
  if (!match) return null
  const [, first = '', last = ''] = match
  if (first === '' && last === '') return null
  if (first === '') {
    const count = Number(last)
    if (count === 0 || size === 0) return 'invalid'
    return { start: Math.max(0, size - count), end: size - 1 }
  }
  const start = Number(first)
  const end = last === '' ? size - 1 : Math.min(Number(last), size - 1)
  if (start >= size || end < start) return 'invalid'
  return { start, end }
}
