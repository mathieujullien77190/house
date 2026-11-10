// Le client du module Wi-Fi des climatisations Mitsubishi Electric (MAC-577IF-E, intégré aux MSZ-AY) : son API locale, sans cloud ni compte.
// Un seul point d'entrée, POST http://<ip>/smart : un XML chiffré en AES-128-CBC (la clé par défaut d'un module non enregistré sur MELCloud, « unregistered »),
// l'IV de 16 octets devant le chiffré, le tout en base64 dans <ESV>…</ESV>. Le module répond de la même façon, avec l'état de l'unité en trames hexadécimales
// (le protocole série CN105 de la carte). Un module ne traite qu'une requête à la fois : les appels d'une même adresse passent à la file.
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import http from 'node:http'

export type AcMode = 'heat' | 'cool' | 'dry' | 'fan' | 'auto'

/** L'état d'une unité intérieure, tel que le module le donne. */
export interface AcReading {
  power: boolean
  mode: AcMode | null
  /** La consigne en °C (pas de 0,5). */
  targetTemp: number | null
  /** La température de la pièce en °C, lue par l'unité. */
  roomTemp: number | null
  /** La vitesse du ventilateur : 'auto', 'quiet' ou 1 à 4. */
  fan: string | null
  /** L'ailette haut / bas : 'auto', '1' (en haut) à '5' (en bas) ou 'swing' (balayage). */
  vane: string | null
  /** L'ailette gauche / droite : 'left', 'left-center', 'center', 'right-center', 'right' ou 'swing' (va-et-vient) ; null si l'unité ne la donne pas. */
  wideVane: string | null
  /** Le signal Wi-Fi du module en dBm. */
  rssi: number | null
}

/** Ce qu'on change d'un coup : seuls les champs donnés bougent, les autres réglages de l'unité restent. */
export interface AcPatch {
  power?: boolean
  mode?: AcMode
  /** La consigne en °C, par pas de 0,5. */
  temperature?: number
  /** 'auto', 'quiet' ou '1' à '4'. */
  fan?: string
  /** L'ailette haut / bas : 'auto', '1' à '5' ou 'swing'. */
  vane?: string
  /** L'ailette gauche / droite : 'left', 'left-center', 'center', 'right-center', 'right' ou 'swing'. */
  wideVane?: string
}

export interface MitsubishiClient {
  read: (host: string) => Promise<AcReading>
  /** Envoie un changement à l'unité (une trame, les champs absents ne bougent pas). */
  apply: (host: string, patch: AcPatch) => Promise<void>
}

const KEY = Buffer.alloc(16)
KEY.write('unregistered')

const MODES: Record<number, AcMode> = { 1: 'heat', 2: 'dry', 3: 'cool', 7: 'fan', 8: 'auto' }
const FANS: Record<number, string> = { 0: 'auto', 1: 'quiet', 2: '1', 3: '2', 5: '3', 6: '4' }
const VANES: Record<number, string> = { 0: 'auto', 1: '1', 2: '2', 3: '3', 4: '4', 5: '5', 7: 'swing' }
const VANE_CODES: Record<string, number> = { auto: 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, swing: 7 }
const WIDE_VANES: Record<number, string> = { 1: 'left', 2: 'left-center', 3: 'center', 4: 'right-center', 5: 'right', 12: 'swing' }
const WIDE_VANE_CODES: Record<string, number> = { left: 1, 'left-center': 2, center: 3, 'right-center': 4, right: 5, swing: 12 }
const MODE_CODES: Record<AcMode, number> = { heat: 1, dry: 2, cool: 3, fan: 7, auto: 8 }
const FAN_CODES: Record<string, number> = { auto: 0, quiet: 1, '1': 2, '2': 3, '3': 5, '4': 6 }

/** Les vitesses de ventilateur acceptées. */
export const FAN_SPEEDS = Object.keys(FAN_CODES)
/** Les positions des ailettes acceptées. */
export const VANE_POSITIONS = Object.keys(VANE_CODES)
/** Les positions de l'ailette gauche / droite acceptées. */
export const WIDE_VANE_POSITIONS = Object.keys(WIDE_VANE_CODES)
export const AC_MODES = Object.keys(MODE_CODES) as AcMode[]
/** La plage de la consigne, en °C. */
export const MIN_TEMPERATURE = 16
export const MAX_TEMPERATURE = 31

/** Le XML en clair → le corps de la requête. */
export const encrypt = (xml: string): string => {
  const iv = randomBytes(16)
  const cipher = createCipheriv('aes-128-cbc', KEY, iv)
  const encrypted = Buffer.concat([cipher.update(xml, 'utf8'), cipher.final()])
  return `<?xml version="1.0" encoding="UTF-8"?><ESV>${Buffer.concat([iv, encrypted]).toString('base64')}</ESV>`
}

/** La réponse du module → son XML en clair (le remplissage de fin est coupé). */
export const decrypt = (body: string): string => {
  const match = /<ESV>([^<]*)<\/ESV>/.exec(body)
  if (!match) throw new Error('réponse du module illisible')
  const raw = Buffer.from(match[1], 'base64')
  if (raw.length < 32 || (raw.length - 16) % 16 !== 0) throw new Error('réponse du module illisible')
  const decipher = createDecipheriv('aes-128-cbc', KEY, raw.subarray(0, 16))
  decipher.setAutoPadding(false)
  const text = Buffer.concat([decipher.update(raw.subarray(16)), decipher.final()]).toString('utf8')
  return text.slice(0, text.lastIndexOf('>') + 1)
}

/** L'octet de contrôle d'une trame CN105 : 0xFC moins la somme des octets, sur un octet. */
export const checksum = (bytes: number[]): number => (0xfc - bytes.reduce((sum, byte) => sum + byte, 0)) & 0xff

/** La trame d'un changement (type 0x41) : les drapeaux de l'octet 1 disent quels champs comptent (0x01 alimentation, 0x02 mode, 0x04 consigne, 0x08 ventilateur, 0x10 ailette haut / bas ; l'ailette gauche / droite est annoncée par le second octet de drapeaux), en hexadécimal. */
export const commandFrame = (patch: AcPatch): string => {
  const data = new Array<number>(16).fill(0)
  data[0] = 0x01
  if (patch.power !== undefined) {
    data[1] |= 0x01
    data[3] = patch.power ? 1 : 0
  }
  if (patch.mode !== undefined) {
    data[1] |= 0x02
    data[4] = MODE_CODES[patch.mode]
  }
  if (patch.temperature !== undefined) {
    data[1] |= 0x04
    data[14] = 0x80 + Math.round(patch.temperature * 2)
  }
  if (patch.fan !== undefined) {
    data[1] |= 0x08
    data[6] = FAN_CODES[patch.fan]
  }
  if (patch.vane !== undefined) {
    data[1] |= 0x10
    data[7] = VANE_CODES[patch.vane]
  }
  if (patch.wideVane !== undefined) {
    // L'ailette gauche / droite est annoncée par le second octet de drapeaux (0x01) ; sa valeur est au 14e octet de données.
    data[2] |= 0x01
    data[13] = WIDE_VANE_CODES[patch.wideVane]
  }
  const frame = [0xfc, 0x41, 0x01, 0x30, 0x10, ...data]
  return Buffer.from([...frame, checksum(frame)]).toString('hex')
}

/** Les trames de l'état (<CODE><VALUE>) → la lecture : le type 0x02 donne l'alimentation, le mode, la consigne et le ventilateur ; le type 0x03, la température de la pièce. */
export const parseReading = (values: string[], rssi: number | null): AcReading => {
  const reading: AcReading = { power: false, mode: null, targetTemp: null, roomTemp: null, fan: null, vane: null, wideVane: null, rssi }
  for (const hex of values) {
    const bytes = [...Buffer.from(hex, 'hex')]
    if (bytes.length < 22 || bytes[0] !== 0xfc || bytes[1] !== 0x62) continue
    const data = bytes.slice(5, 21)
    if (data[0] === 0x02) {
      reading.power = data[3] === 1
      reading.mode = MODES[data[4]] ?? null
      reading.targetTemp = data[11] ? (data[11] - 128) / 2 : 31 - data[5]
      reading.fan = FANS[data[6]] ?? null
      reading.vane = VANES[data[7]] ?? null
      // Le 11e octet : l'ailette gauche / droite dans les 4 bits du bas (le bit du haut dit seulement qu'elle est réglable).
      reading.wideVane = WIDE_VANES[data[10] & 0x0f] ?? null
    } else if (data[0] === 0x03) {
      reading.roomTemp = data[6] ? (data[6] - 128) / 2 : 10 + data[3]
    }
  }
  return reading
}

const xmlValues = (xml: string): string[] => [...xml.matchAll(/<VALUE>([0-9a-f]+)<\/VALUE>/g)].map((match) => match[1])

const TIMEOUT_MS = 5000

/** Un POST vers le module : rend le code HTTP et le corps. `node:http` plutôt que `fetch` : le module refuse (403) les requêtes de `fetch` (ses en-têtes), pas celles de curl ni de `node:http`. */
export type Post = (host: string, body: string) => Promise<{ status: number; text: string }>

/** `host` est l'adresse du module, avec un port s'il n'est pas le 80 (« 192.168.1.130:8080 », pour les essais). */
export const createHttpPost = (timeoutMs = TIMEOUT_MS): Post => (host, body) =>
  new Promise((resolve, reject) => {
    const [hostname, port] = host.split(':')
    const request = http.request(
      { hostname, port, path: '/smart', method: 'POST', headers: { 'Content-Type': 'text/plain;chrset=UTF-8', 'Content-Length': Buffer.byteLength(body) }, timeout: timeoutMs },
      (response) => {
        let text = ''
        response.setEncoding('utf8')
        response.on('data', (chunk: string) => (text += chunk))
        response.on('end', () => resolve({ status: Number(response.statusCode), text }))
      },
    )
    request.on('timeout', () => request.destroy(new Error(`module ${host} : pas de réponse`)))
    request.on('error', reject)
    request.end(body)
  })

export const createMitsubishiClient = (post: Post = createHttpPost()): MitsubishiClient => {
  // Une file par module : une requête à la fois.
  const queues = new Map<string, Promise<unknown>>()
  const exchange = async (host: string, xml: string): Promise<string> => {
    const response = await post(host, encrypt(xml))
    if (response.status !== 200) throw new Error(`module ${host} : HTTP ${response.status}`)
    return decrypt(response.text)
  }
  const queued = <T>(host: string, task: () => Promise<T>): Promise<T> => {
    const run = (queues.get(host) ?? Promise.resolve()).then(task, task)
    queues.set(host, run.catch(() => undefined))
    return run
  }
  return {
    read: (host) =>
      queued(host, async () => {
        const xml = await exchange(host, '<CSV><CONNECT>ON</CONNECT></CSV>')
        const rssi = /<RSSI>(-?\d+)<\/RSSI>/.exec(xml)
        return parseReading(xmlValues(xml), rssi ? Number(rssi[1]) : null)
      }),
    apply: (host, patch) =>
      queued(host, async () => {
        await exchange(host, `<CSV><CONNECT>ON</CONNECT><CODE><VALUE>${commandFrame(patch)}</VALUE></CODE></CSV>`)
      }),
  }
}
