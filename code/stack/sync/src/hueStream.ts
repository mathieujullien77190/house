// L'écoute du flux d'événements du pont Hue (API v2, « server-sent events » : une réponse HTTPS qui ne se termine jamais
// et où le pont écrit chaque changement : lampe, scène, interrupteur, détecteur, connexion radio...).
// Le certificat du pont n'est pas vérifié : c'est un équipement du réseau de la maison. Si le flux tombe, on se reconnecte
// de plus en plus lentement (2 s à 1 min) ; le pont ne rejoue pas ce qu'on a manqué.
import https, { type RequestOptions } from 'node:https'

/** Une ressource qui a changé : seuls les champs modifiés sont présents (par exemple `on`, `dimming`, `status`). */
export interface HueStreamItem {
  /** L'identifiant (v2) de la ressource. */
  id?: string
  /** Son identifiant dans l'ancienne API, par exemple « /lights/5 ». */
  id_v1?: string
  /** Le genre de ressource : light, scene, button, motion, zigbee_connectivity, behavior_instance, grouped_light... */
  type: string
  owner?: { rid: string; rtype: string }
  [field: string]: unknown
}

export interface HueStreamMessage {
  creationtime?: string
  /** update, add, delete ou error. */
  type: string
  data: HueStreamItem[]
}

const RETRY_MIN_MS = 2000
const RETRY_MAX_MS = 60_000
/** Sans un octet pendant ce temps (le pont envoie un signe de vie régulier), on considère le flux mort. */
const IDLE_MS = 5 * 60_000

/** Découpe un flux « text/event-stream » : appelle `onData` avec le texte de chaque message complet (lignes `data:`). */
export const createSseParser = (onData: (data: string) => void) => {
  let buffer = ''
  let lines: string[] = []
  return (chunk: string): void => {
    buffer += chunk
    let end = buffer.indexOf('\n')
    while (end !== -1) {
      const line = buffer.slice(0, end).replace(/\r$/, '')
      buffer = buffer.slice(end + 1)
      if (line === '') {
        if (lines.length > 0) onData(lines.join('\n'))
        lines = []
      } else if (line.startsWith('data:')) {
        lines.push(line.slice(5).trimStart())
      }
      // Les commentaires (« : hi ») et les autres champs (id, event) ne servent à rien ici.
      end = buffer.indexOf('\n')
    }
  }
}

/** Les messages d'un texte `data:` : un tableau JSON ; rien si le texte n'en est pas un. */
export const parseMessages = (text: string): HueStreamMessage[] => {
  try {
    const parsed: unknown = JSON.parse(text)
    return Array.isArray(parsed) ? (parsed as HueStreamMessage[]).filter((m) => m && Array.isArray(m.data)) : []
  } catch {
    return []
  }
}

export interface HueStream {
  stop: () => void
}

/** Ouvre le flux et le rouvre tout seul s'il tombe. `onState` dit chaque changement de connexion. */
export const openHueStream = (host: string, key: string, onMessage: (message: HueStreamMessage) => void, onState: (text: string) => void): HueStream => {
  let stopped = false
  let timer: NodeJS.Timeout | null = null
  let current: ReturnType<typeof https.get> | null = null
  let delay = RETRY_MIN_MS

  const retry = (reason: string): void => {
    if (stopped || timer) return
    current?.destroy()
    onState(`flux interrompu (${reason}), nouvel essai dans ${Math.round(delay / 1000)} s`)
    timer = setTimeout(() => {
      timer = null
      connect()
    }, delay)
    delay = Math.min(delay * 2, RETRY_MAX_MS)
  }

  const connect = (): void => {
    if (stopped) return
    const parse = createSseParser((text) => parseMessages(text).forEach(onMessage))
    const options: RequestOptions = {
      host,
      path: '/eventstream/clip/v2',
      headers: { 'hue-application-key': key, Accept: 'text/event-stream' },
      rejectUnauthorized: false,
    }
    current = https.get(options, (res) => {
      if (res.statusCode !== 200) {
        res.resume()
        retry(`HTTP ${res.statusCode}`)
        return
      }
      delay = RETRY_MIN_MS
      onState('flux ouvert')
      res.setEncoding('utf8')
      res.on('data', parse)
      res.on('end', () => retry('fermé par le pont'))
      res.on('error', (error) => retry(error.message))
    })
    current.setTimeout(IDLE_MS, () => retry('silence du pont'))
    current.on('error', (error) => retry(error.message))
  }

  connect()
  return {
    stop: () => {
      stopped = true
      if (timer) clearTimeout(timer)
      current?.destroy()
    },
  }
}
