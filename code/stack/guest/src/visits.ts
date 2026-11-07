// Le journal des visites de la page invité : une ligne JSON par ouverture de la page, par flux de caméra regardé (écrite à sa fermeture, avec sa durée) et par
// tentative refusée (pas de clé, mauvaise clé), dans un fichier que House Sync importe dans sa table `guest_visits`. La clé n'est jamais écrite.
import { appendFile, rename, stat } from 'node:fs/promises'

export type VisitKind = 'page' | 'stream' | 'refused'

export interface VisitEntry {
  /** L'instant, en secondes depuis 1970 (le début, pour un flux). */
  at: number
  kind: VisitKind
  ip: string
  /** D'où il vient : la maison, le VPN, le mini PC lui-même ou internet. */
  origin: string
  /** Le navigateur et le système, en clair (« Chrome 130 · Windows »). */
  device: string
  user_agent: string
  language: string
  host: string
  /** La clé de la demande : « avec clé », « sans clé » ou « clé fausse » (la clé elle-même n'est jamais écrite). */
  key: string
  /** L'adresse demandée, sans la clé. */
  path: string
  camera: string
  /** « léger » ou « 4K » pour un flux. */
  quality: string
  status: number
  /** Pour un flux : combien de temps on l'a regardé (secondes), et ce qu'il a envoyé (octets). */
  duration: number | null
  bytes: number | null
}

/** L'adresse sans le préfixe IPv4-dans-IPv6 que Node ajoute (::ffff:192.168.1.66). */
export const normalizeIp = (ip: string): string => ip.replace(/^::ffff:/i, '')

/** D'où vient l'adresse : le réseau de la maison, le VPN WireGuard de la Freebox, le mini PC (Docker, localhost) ou internet. */
export const originOf = (rawIp: string): string => {
  const ip = normalizeIp(rawIp).toLowerCase()
  if (ip === '::1' || ip.startsWith('127.')) return 'mini PC'
  const docker = /^172\.(\d+)\./.exec(ip)
  if (docker && Number(docker[1]) >= 16 && Number(docker[1]) <= 31) return 'mini PC'
  if (ip.startsWith('192.168.27.')) return 'VPN'
  if (ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('fe80:') || ip.startsWith('fc') || ip.startsWith('fd')) return 'maison'
  return 'internet'
}

/** Le navigateur et le système d'après l'en-tête User-Agent, en clair ; « inconnu » si on ne reconnaît rien. */
export const describeAgent = (userAgent: string): string => {
  const ua = userAgent
  const version = (pattern: RegExp): string => pattern.exec(ua)?.[1]?.split('.')[0] ?? ''
  let browser = ''
  if (/Edg\//.test(ua)) browser = `Edge ${version(/Edg\/([\d.]+)/)}`
  else if (/OPR\//.test(ua)) browser = `Opera ${version(/OPR\/([\d.]+)/)}`
  else if (/Firefox\//.test(ua)) browser = `Firefox ${version(/Firefox\/([\d.]+)/)}`
  else if (/(Chrome|CriOS)\//.test(ua)) browser = `Chrome ${version(/(?:Chrome|CriOS)\/([\d.]+)/)}`
  else if (/Safari\//.test(ua) && /Version\//.test(ua)) browser = `Safari ${version(/Version\/([\d.]+)/)}`
  else if (/^curl\//.test(ua)) browser = `curl ${version(/^curl\/([\d.]+)/)}`
  else if (ua) browser = ua.split(/[\s/]/)[0] ?? ''
  let system = ''
  if (/Windows/.test(ua)) system = 'Windows'
  else if (/Android/.test(ua)) system = 'Android'
  else if (/iPhone|iPad|iPod/.test(ua)) system = 'iOS'
  else if (/Mac OS X|Macintosh/.test(ua)) system = 'macOS'
  else if (/CrOS/.test(ua)) system = 'ChromeOS'
  else if (/Linux/.test(ua)) system = 'Linux'
  const parts = [browser.trim(), system].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : 'inconnu'
}

const MAX_BYTES = 5 * 1024 * 1024

/**
 * Le journal : `log` ajoute une ligne (sans jamais gêner la page : une erreur d'écriture est notée une fois dans les logs, rien d'autre). Au-delà de 5 Mo le fichier
 * passe en `.old` (House Sync l'a importé depuis longtemps). Sans fichier configuré, rien n'est écrit.
 */
export const createVisitLog = (file: string, maxBytes: number = MAX_BYTES) => {
  let queue: Promise<void> = Promise.resolve()
  let warned = false
  return {
    log: (entry: VisitEntry) => {
      if (!file) return
      queue = queue.then(async () => {
        try {
          const size = await stat(file).then(
            (info) => info.size,
            () => 0,
          )
          if (size > maxBytes) await rename(file, `${file}.old`)
          await appendFile(file, `${JSON.stringify(entry)}\n`)
        } catch (error) {
          if (!warned) console.error(`Journal des visites : ${error instanceof Error ? error.message : String(error)}`)
          warned = true
        }
      })
    },
    /** Attend que les lignes en attente soient écrites (pour les tests). */
    idle: () => queue,
  }
}
