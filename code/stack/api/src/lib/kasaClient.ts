// Client d'une prise TP-Link Kasa (HS100) sur le réseau de la maison, en local, sans le cloud TP-Link.
// Le protocole : du JSON sur TCP (port 9999), chiffré par un XOR en chaîne (clé de départ 171), précédé de sa longueur
// sur 4 octets. Chaque appel ouvre puis ferme sa connexion.
import net from 'node:net'

export interface KasaConfig {
  host: string
  port: number
  /** L'adresse MAC de la prise : si son adresse IP change (la box la redistribue), on la retrouve par un scan du réseau. Vide : pas de recherche. */
  mac: string
}

/** Ce que la prise dit d'elle (get_sysinfo), réduit à ce qu'on affiche. */
export interface PlugInfo {
  alias: string
  model: string
  /** Le relais est fermé : la prise alimente ce qui y est branché. */
  on: boolean
  /** Le signal WiFi, en dBm (-50 très bon, -75 faible). */
  rssi: number
  /** Secondes depuis l'allumage ; 0 quand elle est éteinte. */
  onTime: number
}

const INITIAL_KEY = 171
const TIMEOUT_MS = 5000
/** Par adresse, pendant la recherche de la prise : la plupart ne répondent pas. */
const SCAN_TIMEOUT_MS = 1500
/** Au plus une recherche par minute : un scan du réseau n'est pas gratuit. */
const SEARCH_EVERY_MS = 60_000

/** Chiffre une commande : la longueur sur 4 octets, puis chaque octet XOR l'octet chiffré précédent. */
export const encrypt = (text: string): Buffer => {
  const body = Buffer.from(text)
  const out = Buffer.alloc(4 + body.length)
  out.writeUInt32BE(body.length, 0)
  let key = INITIAL_KEY
  for (let index = 0; index < body.length; index += 1) {
    key ^= body[index]
    out[4 + index] = key
  }
  return out
}

/** Déchiffre une réponse (sans les 4 octets de longueur). */
export const decrypt = (data: Buffer): string => {
  const out = Buffer.alloc(data.length)
  let key = INITIAL_KEY
  for (let index = 0; index < data.length; index += 1) {
    out[index] = data[index] ^ key
    key = data[index]
  }
  return out.toString()
}

export type KasaClient = ReturnType<typeof createKasaClient>

export const createKasaClient = (config: KasaConfig) => {
  // L'adresse courante : celle de la configuration, puis celle qu'on a retrouvée par la MAC si elle a changé.
  let host = config.host
  const send = (command: unknown, to = host, timeoutMs = TIMEOUT_MS): Promise<Record<string, unknown>> =>
    new Promise((resolve, reject) => {
      const socket = net.createConnection({ host: to, port: config.port })
      const chunks: Buffer[] = []
      let received = 0
      const fail = (error: Error) => {
        socket.destroy()
        reject(error)
      }
      socket.setTimeout(timeoutMs, () => fail(new Error('la prise ne répond pas')))
      socket.on('error', fail)
      socket.on('connect', () => socket.write(encrypt(JSON.stringify(command))))
      socket.on('data', (chunk: Buffer) => {
        chunks.push(chunk)
        received += chunk.length
        const all = Buffer.concat(chunks)
        if (received < 4 || received < 4 + all.readUInt32BE(0)) return
        socket.end()
        try {
          resolve(JSON.parse(decrypt(all.subarray(4, 4 + all.readUInt32BE(0)))) as Record<string, unknown>)
        } catch (error) {
          reject(error)
        }
      })
    })

  const sysinfo = async (to = host, timeoutMs = TIMEOUT_MS): Promise<Record<string, unknown>> => {
    const reply = (await send({ system: { get_sysinfo: {} } }, to, timeoutMs)) as { system?: { get_sysinfo?: Record<string, unknown> } }
    const info = reply.system?.get_sysinfo
    if (!info) throw new Error('réponse inattendue de la prise')
    return info
  }

  // Retrouve la prise par sa MAC : on essaie le port 9999 de chaque adresse du réseau de l'adresse configurée.
  let searchedAt = 0
  const search = async (): Promise<boolean> => {
    const prefix = config.host.split('.').slice(0, 3).join('.')
    if (!config.mac || !/^\d+\.\d+\.\d+$/.test(prefix) || Date.now() - searchedAt < SEARCH_EVERY_MS) return false
    searchedAt = Date.now()
    const wanted = config.mac.replace(/[^0-9a-f]/gi, '').toLowerCase()
    const found = await Promise.all(
      Array.from({ length: 254 }, (_, index) => `${prefix}.${index + 1}`).map(async (candidate) => {
        try {
          const info = await sysinfo(candidate, SCAN_TIMEOUT_MS)
          return String(info.mac ?? '').replace(/[^0-9a-f]/gi, '').toLowerCase() === wanted ? candidate : null
        } catch {
          return null
        }
      }),
    )
    const match = found.find((candidate) => candidate !== null)
    if (!match) return false
    host = match
    return true
  }

  // Une commande ; si la prise ne répond pas, on la cherche sur le réseau puis on réessaie une fois.
  const withSearch = async <T>(action: () => Promise<T>): Promise<T> => {
    try {
      return await action()
    } catch (error) {
      if (!(await search())) throw error
      return action()
    }
  }

  return {
    info: async (): Promise<PlugInfo> => {
      const info = await withSearch(() => sysinfo())
      return {
        alias: String(info.alias ?? ''),
        model: String(info.model ?? ''),
        on: info.relay_state === 1,
        rssi: Number(info.rssi ?? 0),
        onTime: Number(info.on_time ?? 0),
      }
    },
    set: async (on: boolean): Promise<void> => {
      await withSearch(() => send({ system: { set_relay_state: { state: on ? 1 : 0 } } }))
    },
  }
}
