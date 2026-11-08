// L'état de la machine que montre la page de House Sync : la mémoire et le processeur, lus dans /proc de l'hôte
// (un conteneur Docker y voit ceux de la machine, pas les siens).
import { readFile } from 'node:fs/promises'

export interface MemoryUsage {
  /** Mémoire vue par le système, en octets. */
  total: number
  /** Mémoire utilisable sans toucher au disque (libre et cache récupérable), en octets. */
  available: number
}

export interface CpuUsage {
  /** Part du temps où le processeur travaille, de 0 à 100, mesurée sur un court intervalle. */
  percent: number
  /** Nombre de threads (cœurs logiques). */
  threads: number
  /** Charge moyenne sur une minute. */
  load1: number
  /** La part de temps de chaque thread (cpu0, cpu1…), de 0 à 100, dans l'ordre de /proc/stat. */
  perThread: number[]
}

export interface SystemReport {
  memory: MemoryUsage | null
  cpu: CpuUsage | null
}

const SAMPLE_MS = 400

export const parseMemory = (meminfo: string): MemoryUsage | null => {
  const kilobytes = (name: string): number | null => {
    const match = new RegExp(`^${name}:\\s+(\\d+)\\s+kB`, 'm').exec(meminfo)
    return match ? Number(match[1]) : null
  }
  const total = kilobytes('MemTotal')
  const available = kilobytes('MemAvailable')
  return total === null || available === null ? null : { total: total * 1024, available: available * 1024 }
}

export interface CpuTimes {
  busy: number
  total: number
}

/** Les temps cumulés de la ligne « cpu » de /proc/stat : user nice system idle iowait irq softirq steal. */
export const parseCpuTimes = (stat: string): CpuTimes | null => {
  const line = stat.split('\n').find((l) => l.startsWith('cpu '))
  if (!line) return null
  const values = line.trim().split(/\s+/).slice(1, 9).map(Number)
  if (values.length < 4 || values.some(Number.isNaN)) return null
  const total = values.reduce((sum, value) => sum + value, 0)
  const idle = values[3] + (values[4] ?? 0)
  return { busy: total - idle, total }
}

/** Les temps cumulés de chaque ligne « cpuN » de /proc/stat, dans l'ordre (un thread par ligne). */
export const parseThreadTimes = (stat: string): CpuTimes[] =>
  stat
    .split('\n')
    .filter((l) => /^cpu\d+ /.test(l))
    .map((l) => parseCpuTimes(l.replace(/^cpu\d+ /, 'cpu ')))
    .map((times) => times ?? { busy: 0, total: 0 })

export const cpuPercent = (before: CpuTimes, after: CpuTimes): number => {
  const total = after.total - before.total
  return total <= 0 ? 0 : Math.min(100, Math.max(0, ((after.busy - before.busy) / total) * 100))
}

export const countThreads = (stat: string): number => stat.split('\n').filter((l) => /^cpu\d+ /.test(l)).length

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const readCpu = async (root: string, sampleMs: number): Promise<CpuUsage | null> => {
  try {
    const first = await readFile(`${root}/proc/stat`, 'utf8')
    await wait(sampleMs)
    const second = await readFile(`${root}/proc/stat`, 'utf8')
    const before = parseCpuTimes(first)
    const after = parseCpuTimes(second)
    if (!before || !after) return null
    const load1 = Number((await readFile(`${root}/proc/loadavg`, 'utf8')).split(' ')[0])
    const threadsBefore = parseThreadTimes(first)
    const perThread = parseThreadTimes(second).map((times, index) => cpuPercent(threadsBefore[index] ?? times, times))
    return { percent: cpuPercent(before, after), threads: countThreads(second), load1: Number.isNaN(load1) ? 0 : load1, perThread }
  } catch {
    return null
  }
}

/** L'état de la machine. `root` : le préfixe de /proc (vide en vrai, un dossier temporaire dans les essais) ; `sampleMs` : le temps entre les deux lectures du processeur. */
export const readSystem = async (root = '', sampleMs = SAMPLE_MS): Promise<SystemReport> => ({
  memory: parseMemory(await readFile(`${root}/proc/meminfo`, 'utf8').catch(() => '')),
  cpu: await readCpu(root, sampleMs),
})
