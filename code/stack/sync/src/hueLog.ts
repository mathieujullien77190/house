// Le journal des lampes Hue : House Sync écoute le flux d'événements du pont (hueStream.ts) et garde dans la table
// `hue_events` de SQLite chaque changement de lampe, chaque scène lancée, chaque appui sur un interrupteur, chaque mouvement
// et chaque lampe qui se reconnecte, avec une origine devinée (hueOrigin.ts : le pont ne dit pas qui a donné l'ordre).
// Ce que le pont envoie en continu (températures, luminosité, piles) n'est pas gardé. Les lignes de plus de HUE_LOG_DAYS
// jours (365 par défaut) sont supprimées chaque jour : c'est le journal, pas les clips.
import https from 'node:https'
import type { DatabaseSync } from 'node:sqlite'
import { classifyLight, classifyScene, deviceVerdict, ORIGINS, scheduleAt, type Origin, type Schedule, type Trigger, type Verdict } from './hueOrigin.ts'
import { openHueStream, type HueStream, type HueStreamItem, type HueStreamMessage } from './hueStream.ts'

export const HUE_LOG_TABLE = 'hue_events'

export interface HueLogEntry {
  id: number
  /** L'instant du changement, en ISO (UTC). */
  at: string
  /** light, scene, button, motion ou zigbee_connectivity. */
  resource: string
  name: string
  change: Record<string, unknown>
  origin: Origin
  detail: string
}

export interface HueLogStatus {
  /** HUE_BRIDGE_IP et HUE_APP_KEY sont réglées. */
  configured: boolean
  /** Le flux du pont est ouvert en ce moment. */
  listening: boolean
  /** Le dernier événement gardé, en ISO, ou null. */
  lastEventAt: string | null
}

export interface HueLogQuery {
  /** Début de la période, en secondes depuis 1970. */
  since: number
  limit: number
  origin: Origin | null
  /** Un morceau du nom (lampe, scène, interrupteur, détecteur), sans tenir compte des majuscules. */
  name: string | null
}

export interface HueLogOptions {
  address: string
  key: string
  days?: number
  log: (message: string) => void
  now?: () => number
  /** Pour les essais : les règles à heure fixe et le fuseau du pont, avant qu'on les lise dans le pont. */
  schedules?: Schedule[]
  timeZone?: string
}

const ADDRESS = /^[\w.-]+$/
const DEFAULT_LIMIT = 100
const MAX_LIMIT = 500
const DAY_SECONDS = 86_400
/** Les rapprochements ne regardent pas plus loin que 2 minutes en arrière : on oublie le reste. */
const TRIGGER_MEMORY_MS = 3 * 60_000
const NAMES_REFRESH_MS = 10 * 60_000
const NAMES_MIN_GAP_MS = 60_000
const TIMEOUT_MS = 5000

const pick = (value: unknown, ...path: string[]): unknown =>
  path.reduce<unknown>((current, key) => (typeof current === 'object' && current !== null ? (current as Record<string, unknown>)[key] : undefined), value)

/** Ce qui a changé dans un événement du pont, en clair ; null si ce n'est pas un changement qu'on garde. */
export const changeOf = (item: HueStreamItem): Record<string, unknown> | null => {
  switch (item.type) {
    case 'light': {
      const change: Record<string, unknown> = {}
      const on = pick(item, 'on', 'on')
      if (typeof on === 'boolean') change.on = on
      const brightness = pick(item, 'dimming', 'brightness')
      if (typeof brightness === 'number') change.brightness = Math.round(brightness * 10) / 10
      const mirek = pick(item, 'color_temperature', 'mirek')
      if (typeof mirek === 'number') change.mirek = mirek
      const xy = pick(item, 'color', 'xy')
      if (typeof xy === 'object' && xy !== null) change.color = xy
      return Object.keys(change).length > 0 ? change : null
    }
    case 'scene': {
      const active = pick(item, 'status', 'active')
      return typeof active === 'string' ? { active } : null
    }
    case 'button': {
      const event = pick(item, 'button', 'button_report', 'event') ?? pick(item, 'button', 'last_event')
      return event === 'initial_press' ? { event } : null
    }
    case 'motion': {
      const motion = pick(item, 'motion', 'motion_report', 'motion') ?? pick(item, 'motion', 'motion')
      return typeof motion === 'boolean' ? { motion } : null
    }
    case 'zigbee_connectivity':
      return typeof item.status === 'string' ? { status: item.status } : null
    default:
      return null
  }
}

/** Les paramètres de GET /api/hue-log, bornés : since (secondes, millisecondes ou date ISO ; 24 h par défaut), limit, origin, name. */
export const parseLogQuery = (params: URLSearchParams, nowMs: number): HueLogQuery => {
  const raw = params.get('since') ?? ''
  const asNumber = Number(raw)
  const parsed = raw === '' ? NaN : Number.isFinite(asNumber) ? (asNumber > 1e12 ? asNumber / 1000 : asNumber) : Date.parse(raw) / 1000
  const origin = params.get('origin') ?? ''
  const name = (params.get('name') ?? '').trim().slice(0, 60)
  const limit = Math.floor(Number(params.get('limit') ?? DEFAULT_LIMIT))
  return {
    since: Number.isFinite(parsed) ? Math.floor(parsed) : Math.floor(nowMs / 1000) - DAY_SECONDS,
    limit: Number.isFinite(limit) && limit >= 1 ? Math.min(MAX_LIMIT, limit) : DEFAULT_LIMIT,
    origin: (ORIGINS as string[]).includes(origin) ? (origin as Origin) : null,
    name: name === '' ? null : name,
  }
}

/** « /lights/5 » devient « 5 » ; vide si ce n'est pas une lampe. */
export const lightIdOf = (idV1: string | undefined): string => /^\/lights\/(\d+)$/.exec(idV1 ?? '')?.[1] ?? ''

const bridgeGet = <T>(host: string, key: string, path: string): Promise<T[]> =>
  new Promise((resolve, reject) => {
    const request = https.get({ host, path: `/clip/v2/resource/${path}`, headers: { 'hue-application-key': key }, rejectUnauthorized: false, timeout: TIMEOUT_MS }, (res) => {
      let body = ''
      res.setEncoding('utf8')
      res.on('data', (chunk: string) => (body += chunk))
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`pont Hue v2 : HTTP ${res.statusCode}`))
        try {
          resolve((JSON.parse(body) as { data: T[] }).data)
        } catch (error) {
          reject(error)
        }
      })
    })
    request.on('timeout', () => request.destroy(new Error('pont Hue v2 : délai dépassé')))
    request.on('error', reject)
  })

interface Named {
  id: string
  metadata?: { name?: string }
}

/** Ce qu'on lit d'une règle du pont (API v2, behavior_instance) : son nom, ses jours et son heure de départ. */
interface Behavior {
  enabled?: boolean
  metadata?: { name?: string }
  configuration?: { when_extended?: { recurrence_days?: string[]; start_at?: { time_point?: { time?: { hour?: number; minute?: number } } } } }
}

const DAYS_FR: Record<string, string> = {
  monday: 'lundi',
  tuesday: 'mardi',
  wednesday: 'mercredi',
  thursday: 'jeudi',
  friday: 'vendredi',
  saturday: 'samedi',
  sunday: 'dimanche',
}

/** Les règles actives à heure fixe : un nom, des jours et une heure. Les règles à date unique, au lever du soleil ou des détecteurs sont ignorées. */
export const schedulesOf = (instances: Behavior[]): Schedule[] =>
  instances.flatMap((instance): Schedule[] => {
    const when = instance.configuration?.when_extended
    const time = when?.start_at?.time_point?.time
    const days = when?.recurrence_days ?? []
    if (instance.enabled === false || !when || days.length === 0 || typeof time?.hour !== 'number' || typeof time.minute !== 'number') return []
    const clock = `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`
    const dayText = days.length === 7 ? 'tous les jours' : days.map((day) => DAYS_FR[day] ?? day).join(', ')
    return [{ name: instance.metadata?.name ?? '?', days, secondOfDay: time.hour * 3600 + time.minute * 60, text: `${dayText} à ${clock}` }]
  })

/** Le jour de la semaine (en anglais, minuscules) et l'heure en secondes depuis minuit, à l'heure locale d'un fuseau. */
export const localClock = (ms: number, timeZone: string): { weekday: string; secondOfDay: number } => {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'long', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(ms))
  const part = (type: string): string => parts.find((p) => p.type === type)?.value ?? ''
  return { weekday: part('weekday').toLowerCase(), secondOfDay: Number(part('hour')) * 3600 + Number(part('minute')) * 60 + Number(part('second')) }
}

export const createHueLog = (db: DatabaseSync, options: HueLogOptions) => {
  const { address, key, log } = options
  const now = options.now ?? Date.now
  const days = Math.max(1, Math.floor(options.days ?? 365) || 365)
  const configured = ADDRESS.test(address) && key !== ''

  db.exec(`
    CREATE TABLE IF NOT EXISTS ${HUE_LOG_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      happened_at INTEGER NOT NULL,
      happened_ms INTEGER NOT NULL,
      resource TEXT NOT NULL,
      resource_id TEXT NOT NULL,
      name TEXT NOT NULL,
      change TEXT NOT NULL,
      origin TEXT NOT NULL,
      detail TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS hue_events_time ON ${HUE_LOG_TABLE} (happened_ms);
  `)
  const insert = db.prepare(
    `INSERT INTO ${HUE_LOG_TABLE} (happened_at, happened_ms, resource, resource_id, name, change, origin, detail) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
  const purge = db.prepare(`DELETE FROM ${HUE_LOG_TABLE} WHERE happened_at < ?`)

  // Les noms lisibles : lampes, scènes, appareils (interrupteurs, détecteurs). Rechargés de temps en temps et quand un nom manque.
  let lights = new Map<string, string>()
  let scenes = new Map<string, string>()
  let devices = new Map<string, string>()
  let namesAt = 0
  const nameMap = (list: Named[]) => new Map(list.map((entry) => [entry.id, entry.metadata?.name ?? entry.id]))
  const refreshNames = async (): Promise<void> => {
    namesAt = now()
    try {
      const [l, s, d] = await Promise.all([bridgeGet<Named>(address, key, 'light'), bridgeGet<Named>(address, key, 'scene'), bridgeGet<Named>(address, key, 'device')])
      lights = nameMap(l)
      scenes = nameMap(s)
      devices = nameMap(d)
    } catch (error) {
      log(`Hue : noms non rechargés (${error instanceof Error ? error.message : String(error)})`)
    }
  }
  const nameOf = (item: HueStreamItem): string => {
    const id = item.id ?? ''
    const name = item.type === 'light' ? lights.get(id) : item.type === 'scene' ? scenes.get(id) : devices.get(item.owner?.rid ?? '')
    if (name) return name
    // Un nom inconnu : une lampe ou un appareil ajouté depuis le dernier chargement ; on recharge, au plus une fois par minute.
    if (now() - namesAt > NAMES_MIN_GAP_MS) void refreshNames()
    return item.id_v1 ?? id
  }

  // Les règles à heure fixe du pont et son fuseau : pour dire « c'est la règle Eteind tout » quand une lampe bouge à l'heure pile.
  let schedules = options.schedules ?? []
  let timeZone = options.timeZone ?? 'UTC'
  const refreshRules = async (): Promise<void> => {
    try {
      schedules = schedulesOf(await bridgeGet<Behavior>(address, key, 'behavior_instance'))
      const config = (await (await fetch(`http://${address}/api/${key}/config`, { signal: AbortSignal.timeout(TIMEOUT_MS) })).json()) as { timezone?: string }
      if (typeof config.timezone === 'string' && config.timezone !== '') timeZone = config.timezone
      localClock(now(), timeZone)
    } catch (error) {
      timeZone = 'UTC'
      log(`Hue : règles à heure fixe non rechargées (${error instanceof Error ? error.message : String(error)})`)
    }
  }
  const scheduleNow = (ms: number): Schedule | null => {
    if (schedules.length === 0) return null
    const local = localClock(ms, timeZone)
    return scheduleAt(schedules, local.weekday, local.secondOfDay)
  }

  let triggers: Trigger[] = []
  let listening = false
  let lastEventMs: number | null = null

  const record = (item: HueStreamItem): void => {
    const change = changeOf(item)
    if (!change) return
    const at = now()
    triggers = triggers.filter((t) => at - t.at <= TRIGGER_MEMORY_MS)
    const name = nameOf(item)
    const owner = item.owner?.rid ?? ''
    let verdict: Verdict
    if (item.type === 'light') {
      verdict = classifyLight({ at, owner }, triggers, scheduleNow(at))
    } else if (item.type === 'scene') {
      // Une scène qui redevient inactive n'est pas un ordre.
      if (change.active === 'inactive') return
      verdict = classifyScene(at, name, triggers, scheduleNow(at))
      triggers.push({ at, kind: 'scene', name, id: item.id ?? '' })
    } else if (item.type === 'button') {
      triggers.push({ at, kind: 'button', name, id: owner })
      verdict = deviceVerdict(`appui sur « ${name} »`)
    } else if (item.type === 'motion') {
      if (change.motion === true) triggers.push({ at, kind: 'motion', name, id: owner })
      verdict = deviceVerdict(change.motion === true ? `mouvement détecté par « ${name} »` : `fin du mouvement vu par « ${name} »`)
    } else {
      if (change.status === 'connected') triggers.push({ at, kind: 'connectivity', name, id: owner })
      verdict = deviceVerdict(`liaison radio de « ${name} » : ${String(change.status)}`)
    }
    insert.run(Math.floor(at / 1000), at, item.type, item.id ?? '', name, JSON.stringify(change), verdict.origin, verdict.detail)
    lastEventMs = at
  }

  const handle = (message: HueStreamMessage): void => {
    if (message.type !== 'update') return
    for (const item of message.data) {
      try {
        record(item)
      } catch (error) {
        log(`Hue : événement ignoré (${error instanceof Error ? error.message : String(error)})`)
      }
    }
  }

  const status = (): HueLogStatus => ({ configured, listening, lastEventAt: lastEventMs === null ? null : new Date(lastEventMs).toISOString() })

  let stream: HueStream | null = null
  const timers: NodeJS.Timeout[] = []
  const prune = (): void => void purge.run(Math.floor(now() / 1000) - days * DAY_SECONDS)

  return {
    status,
    /** Les changements gardés, du plus récent au plus ancien. */
    list: (params: URLSearchParams): { status: HueLogStatus; entries: HueLogEntry[] } => {
      const query = parseLogQuery(params, now())
      const where = ['happened_at >= ?']
      const args: (string | number)[] = [query.since]
      if (query.origin) {
        where.push('origin = ?')
        args.push(query.origin)
      }
      if (query.name) {
        where.push('instr(lower(name), lower(?)) > 0')
        args.push(query.name)
      }
      const rows = db
        .prepare(`SELECT id, happened_ms, resource, name, change, origin, detail FROM ${HUE_LOG_TABLE} WHERE ${where.join(' AND ')} ORDER BY happened_ms DESC, id DESC LIMIT ?`)
        .all(...args, query.limit) as { id: number; happened_ms: number; resource: string; name: string; change: string; origin: Origin; detail: string }[]
      const entries = rows.map((row) => ({
        id: row.id,
        at: new Date(row.happened_ms).toISOString(),
        resource: row.resource,
        name: row.name,
        change: JSON.parse(row.change) as Record<string, unknown>,
        origin: row.origin,
        detail: row.detail,
      }))
      return { status: status(), entries }
    },
    /** Ouvre le flux du pont : sans adresse ou sans clé, rien ne se passe. */
    start: (): void => {
      if (!configured) return void log('Hue : journal inactif (HUE_BRIDGE_IP ou HUE_APP_KEY absente)')
      prune()
      void refreshNames()
      void refreshRules().then(() => log(`Hue : ${schedules.length} règle(s) à heure fixe, fuseau ${timeZone}`))
      stream = openHueStream(address, key, handle, (state) => {
        listening = state === 'flux ouvert'
        log(`Hue : ${state}`)
      })
      timers.push(setInterval(() => void refreshNames(), NAMES_REFRESH_MS), setInterval(() => void refreshRules(), NAMES_REFRESH_MS), setInterval(prune, DAY_SECONDS * 1000))
      timers.forEach((timer) => timer.unref())
    },
    stop: (): void => {
      stream?.stop()
      timers.forEach((timer) => clearInterval(timer))
    },
    /** Pour les essais : traite un message du flux comme s'il venait du pont. */
    handle,
  }
}

export type HueLog = ReturnType<typeof createHueLog>
