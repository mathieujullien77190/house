// Client de la page web du switch TP-Link ES208GP (HTTP, aucune API officielle sans contrôleur Omada).
// On se connecte comme la page (POST logon.cgi, qui donne un cookie), on lit l'état des ports dans
// poe_port_config.cgi et on le change avec la même requête que le bouton Apply de la page. Chaque appel ouvre puis
// ferme sa session (le switch en limite le nombre) et les appels se font à la file. Les commandes viennent de la
// page du firmware 1.0.1 : un autre firmware peut les changer.
// node:http plutôt que fetch : le switch coupe la connexion d'un POST de fetch (undici), pas celle de node:http.
import http from 'node:http'

export interface SwitchConfig {
  url: string
  user: string
  password: string
}

export interface PortStatus {
  port: number
  /** Le PoE du port est activé dans la configuration du switch. */
  enabled: boolean
  /** Le switch alimente bien un appareil sur ce port. */
  powered: boolean
  watts: number
}

const PORT_COUNT = 8
/** Puissance maximale par défaut d'un port (classe 4) : l'option de la page qui la représente. */
const CLASS_4_WATTS = 30
const CLASS_4_OPTION = 4
const MANUAL_OPTION = 5
const TIMEOUT_MS = 8000

const arrayOf = (script: string, name: string): number[] => {
  const match = new RegExp(`${name}:\\s*\\[([^\\]]*)\\]`).exec(script)
  if (!match) throw new Error(`switch : champ ${name} introuvable`)
  return match[1]
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map(Number)
}

/** Lit l'état des ports dans la page poe_port_config.cgi (une variable JavaScript, portConfig). */
export const parsePorts = (html: string): { statuses: PortStatus[]; priority: number[]; limit: number[] } => {
  const start = html.indexOf('var portConfig')
  if (start < 0) throw new Error('switch : page PoE inattendue (session refusée ?)')
  const script = html.slice(start, html.indexOf('};', start))
  const state = arrayOf(script, 'state')
  const power = arrayOf(script, 'power')
  const powerStatus = arrayOf(script, 'powerstatus')
  const statuses = state.slice(0, PORT_COUNT).map((value, index) => ({
    port: index + 1,
    enabled: value === 1,
    powered: powerStatus[index] === 2,
    watts: power[index] / 10,
  }))
  return { statuses, priority: arrayOf(script, 'priority'), limit: arrayOf(script, 'powerlimit') }
}

interface Reply {
  status: number
  cookies: string[]
  text: string
}

export const createSwitchClient = (config: SwitchConfig) => {
  const target = new URL(config.url)
  let queue: Promise<unknown> = Promise.resolve()

  const send = (path: string, cookie: string, body = ''): Promise<Reply> =>
    new Promise((resolve, reject) => {
      const headers: Record<string, string | number> = { Connection: 'close' }
      if (cookie) headers.Cookie = cookie
      if (body) {
        headers['Content-Type'] = 'application/x-www-form-urlencoded'
        headers['Content-Length'] = Buffer.byteLength(body)
      }
      const request = http.request(
        { host: target.hostname, port: target.port || 80, path, method: body ? 'POST' : 'GET', agent: false, headers, timeout: TIMEOUT_MS },
        (res) => {
          let text = ''
          res.setEncoding('utf8')
          res.on('data', (chunk: string) => (text += chunk))
          res.on('end', () => resolve({ status: res.statusCode ?? 0, cookies: (res.headers['set-cookie'] ?? []).map((c) => c.split(';')[0]), text }))
        },
      )
      request.on('error', reject)
      request.on('timeout', () => request.destroy(new Error('switch : pas de réponse')))
      if (body) request.write(body)
      request.end()
    })

  const login = async (): Promise<string> => {
    const body = new URLSearchParams({ username: config.user, password: config.password, logon: 'Login' }).toString()
    const reply = await send('/logon.cgi', '', body)
    // La page de réponse porte « allow = 1 » quand la connexion est acceptée.
    if (!/allow\s*=\s*1/.test(reply.text)) throw new Error('switch : connexion refusée (compte ou mot de passe)')
    return reply.cookies.join('; ')
  }

  const session = async <T>(work: (cookie: string) => Promise<T>): Promise<T> => {
    const cookie = await login()
    try {
      return await work(cookie)
    } finally {
      await send('/logout.cgi', cookie).catch(() => undefined)
    }
  }

  const readPorts = async (cookie: string) => parsePorts((await send('/poe_port_config.cgi', cookie)).text)

  // Les opérations passent une par une : deux sessions en parallèle se gêneraient.
  const serial = <T>(work: () => Promise<T>): Promise<T> => {
    const next = queue.then(work, work)
    queue = next.catch(() => undefined)
    return next
  }

  return {
    ports: (): Promise<PortStatus[]> => serial(() => session(async (cookie) => (await readPorts(cookie)).statuses)),
    /** Active ou coupe le PoE d'un port ; rend son état relu après le changement. */
    setPoe: (port: number, on: boolean): Promise<PortStatus> =>
      serial(() =>
        session(async (cookie) => {
          const before = await readPorts(cookie)
          // La requête de la page change aussi la priorité et la puissance : on renvoie celles du port, inchangées.
          const watts = before.limit[port - 1] / 10
          const isClass4 = watts === CLASS_4_WATTS
          const query = new URLSearchParams({
            poe_status: on ? '1' : '0',
            poe_priority: String(before.priority[port - 1]),
            power_limit: String(isClass4 ? CLASS_4_OPTION : MANUAL_OPTION),
            power_limit_value: String(watts),
            selBit: String(1 << (port - 1)),
          })
          await send(`/poe_port_config.cgi?${query.toString()}`, cookie)
          const after = (await readPorts(cookie)).statuses[port - 1]
          if (after.enabled !== on) throw new Error(`switch : le port ${port} n'a pas changé d'état`)
          return after
        }),
      ),
  }
}

export type SwitchClient = ReturnType<typeof createSwitchClient>
