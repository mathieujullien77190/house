// Limite les essais de clé ratés : au-delà de `max` échecs en `windowMs` depuis une même adresse, elle est mise de
// côté jusqu'à ce que les plus anciens échecs sortent de la fenêtre. Rien n'est écrit sur le disque : un redémarrage
// de l'API remet les compteurs à zéro.

export interface AttemptLimiter {
  /** Vrai si cette adresse a épuisé ses essais (il ne faut même plus comparer la clé). */
  isBlocked: (ip: string) => boolean
  /** Note un essai raté. */
  fail: (ip: string) => void
  /** Oublie les échecs de cette adresse (la bonne clé est venue). */
  clear: (ip: string) => void
}

const MAX_TRACKED = 1000

export const createAttemptLimiter = (max = 10, windowMs = 15 * 60_000, now: () => number = Date.now): AttemptLimiter => {
  const failures = new Map<string, number[]>()

  const recent = (ip: string): number[] => {
    const cutoff = now() - windowMs
    const list = (failures.get(ip) ?? []).filter((at) => at > cutoff)
    if (list.length > 0) failures.set(ip, list)
    else failures.delete(ip)
    return list
  }

  return {
    isBlocked: (ip) => recent(ip).length >= max,
    fail: (ip) => {
      // Table pleine : on oublie la plus ancienne adresse, jamais tout (sinon des adresses qui changent effaceraient les blocages en cours).
      if (failures.size >= MAX_TRACKED && !failures.has(ip)) failures.delete(failures.keys().next().value as string)
      const list = recent(ip)
      list.push(now())
      failures.set(ip, list)
    },
    clear: (ip) => {
      failures.delete(ip)
    },
  }
}
