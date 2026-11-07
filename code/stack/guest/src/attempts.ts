// Limite les essais de clé ratés : au-delà de `max` échecs en `windowMs` depuis une même adresse, elle est mise de côté
// jusqu'à ce que les plus anciens échecs sortent de la fenêtre. Rien n'est écrit sur le disque.
export interface AttemptLimiter {
  isBlocked: (ip: string) => boolean
  fail: (ip: string) => void
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
