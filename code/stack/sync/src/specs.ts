// Les caractéristiques techniques de la machine que montre la page de House Sync, lues dans /proc et /sys de l'hôte
// (un conteneur Docker y voit ceux de la machine) et dans deux fichiers de l'hôte montés en lecture seule.
import { readdir, readFile } from 'node:fs/promises'
import { arch, release, uptime } from 'node:os'

export interface CpuSpecs {
  model: string
  cores: number
  threads: number
  /** Fréquence maximale en MHz, absente si le noyau ne la donne pas. */
  maxMhz: number | null
}

export interface DiskSpecs {
  model: string
  /** Capacité en octets. */
  size: number
  /** SSD (false) ou disque à plateaux (true). */
  rotational: boolean
}

export interface Specs {
  hostname: string
  os: string
  kernel: string
  architecture: string
  uptimeSeconds: number
  bios: string | null
  cpu: CpuSpecs | null
  /** La mémoire vue par le système, en octets. */
  memory: number | null
  disk: DiskSpecs | null
}

const HOSTNAME_FILE = process.env.HOST_HOSTNAME_FILE ?? '/host/hostname'
const OS_RELEASE_FILE = process.env.HOST_OS_RELEASE_FILE ?? '/host/os-release'

const text = (path: string): Promise<string> => readFile(path, 'utf8').catch(() => '')

export const parseOsRelease = (content: string): string => {
  const match = /^PRETTY_NAME="?([^"\n]*)"?/m.exec(content)
  return match?.[1]?.trim() ?? ''
}

export const parseCpuInfo = (content: string): Omit<CpuSpecs, 'maxMhz'> | null => {
  const model = /^model name\s*:\s*(.+)$/m.exec(content)?.[1]?.trim()
  if (!model) return null
  const threads = (content.match(/^processor\s*:/gm) ?? []).length
  const cores = Number(/^cpu cores\s*:\s*(\d+)/m.exec(content)?.[1] ?? 0) || threads
  return { model, cores, threads }
}

const readMaxMhz = async (root: string): Promise<number | null> => {
  const khz = Number((await text(`${root}/sys/devices/system/cpu/cpu0/cpufreq/cpuinfo_max_freq`)).trim())
  return khz > 0 ? Math.round(khz / 1000) : null
}

const readCpu = async (root: string): Promise<CpuSpecs | null> => {
  const info = parseCpuInfo(await text(`${root}/proc/cpuinfo`))
  return info ? { ...info, maxMhz: await readMaxMhz(root) } : null
}

const DISK_NAME = /^(sd[a-z]+|nvme\d+n\d+|vd[a-z]+)$/

/** Le premier disque physique : son modèle (à défaut son fabricant), sa capacité (secteurs de 512 octets) et son type. */
const readDisk = async (root: string): Promise<DiskSpecs | null> => {
  const names = (await readdir(`${root}/sys/block`).catch(() => [])).filter((name) => DISK_NAME.test(name)).sort()
  const name = names[0]
  if (!name) return null
  const base = `${root}/sys/block/${name}`
  const model = (await text(`${base}/device/model`)).trim() || (await text(`${base}/device/vendor`)).trim() || name
  const sectors = Number((await text(`${base}/size`)).trim())
  if (!(sectors > 0)) return null
  return { model, size: sectors * 512, rotational: (await text(`${base}/queue/rotational`)).trim() === '1' }
}

const memoryTotal = async (root: string): Promise<number | null> => {
  const kilobytes = /^MemTotal:\s+(\d+)\s+kB/m.exec(await text(`${root}/proc/meminfo`))?.[1]
  return kilobytes ? Number(kilobytes) * 1024 : null
}

/** Les caractéristiques de la machine. `root` : le préfixe de /proc et /sys (vide en vrai, un dossier temporaire dans les essais) ; `files` : les deux fichiers de l'hôte. */
export const readSpecs = async (root = '', files = { hostname: HOSTNAME_FILE, osRelease: OS_RELEASE_FILE }): Promise<Specs> => {
  const [hostname, osRelease, bios, cpu, memory, disk] = await Promise.all([
    text(files.hostname),
    text(files.osRelease),
    text(`${root}/sys/class/dmi/id/bios_version`),
    readCpu(root),
    memoryTotal(root),
    readDisk(root),
  ])
  return {
    hostname: hostname.trim(),
    os: parseOsRelease(osRelease),
    kernel: release(),
    architecture: arch(),
    uptimeSeconds: Math.round(uptime()),
    bios: bios.trim() || null,
    cpu,
    memory,
    disk,
  }
}
