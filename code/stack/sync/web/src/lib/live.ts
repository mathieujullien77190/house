import type { System } from '@/types'

export interface LiveHistory {
  cpu: number[]
  memory: number[]
  /** Une courbe par thread du processeur (cpu0, cpu1…). */
  threads: number[][]
}

export const EMPTY_HISTORY: LiveHistory = { cpu: [], memory: [], threads: [] }

/** Ajoute une mesure à la fin et ne garde que les `capacity` plus récentes. */
export const pushSample = (values: number[], value: number, capacity: number): number[] => [...values, value].slice(-capacity)

/** La part de mémoire utilisée, de 0 à 100 ; null si la mémoire ne se lit pas. */
export const memoryPercent = (system: System): number | null =>
  system.memory && system.memory.total > 0 ? ((system.memory.total - system.memory.available) / system.memory.total) * 100 : null

/** L'historique avec la mesure de ce tour ; une mesure manquante ne change pas la courbe. */
export const addSystemSample = (history: LiveHistory, system: System, capacity: number): LiveHistory => {
  const memory = memoryPercent(system)
  return {
    cpu: system.cpu ? pushSample(history.cpu, system.cpu.percent, capacity) : history.cpu,
    memory: memory === null ? history.memory : pushSample(history.memory, memory, capacity),
    threads: system.cpu ? system.cpu.perThread.map((value, index) => pushSample(history.threads[index] ?? [], value, capacity)) : history.threads,
  }
}
