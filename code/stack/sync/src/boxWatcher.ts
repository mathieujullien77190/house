// Le surveillant de la Freebox : toutes les 15 s House Sync lit les appareils de la box (par `GET /box` de House API, qui garde le jeton de la box) et range ce qu'il voit dans SQLite.
// La maison, ce sont les appareils de la table `box_known` : la photo des appareils actifs au tout premier tour, puis ceux que l'utilisateur y ajoute (House API). Tout autre appareil est un invité :
// dès qu'il est vu connecté il entre dans `box_guests` (il y reste, même hors ligne) et chaque connexion ou déconnexion d'un invité est une ligne de `box_connections`.
// L'état précédent est gardé en mémoire seulement : la première lecture après un démarrage ne note rien (mais les invités déjà connectés entrent dans la liste), un appareil déjà présent n'est
// pas noté deux fois. Une lecture qui échoue ne change rien (pas de fausse déconnexion).
import { existsSync, readFileSync } from 'node:fs'
import type { DatabaseSync } from 'node:sqlite'
import type { Context } from './context.ts'
import { fetchApi, type ApiTarget } from './power.ts'

export const BOX_KNOWN_TABLE = 'box_known'
export const BOX_GUESTS_TABLE = 'box_guests'
export const BOX_CONNECTIONS_TABLE = 'box_connections'
export const WATCH_INTERVAL_MS = 15_000

export interface BoxDevice {
  mac: string
  name: string
  ip: string | null
  active: boolean
  type: string | null
  vendor: string | null
}

/** Une MAC en majuscules séparées par « : » ; null si ce n'en est pas une. */
export const normalizeMac = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const hex = value.trim().replace(/[:-]/g, '').toUpperCase()
  return /^[0-9A-F]{12}$/.test(hex) ? (hex.match(/../g) as string[]).join(':') : null
}

const text = (value: unknown): string | null => (typeof value === 'string' ? value.slice(0, 200) : null)

/** Les appareils de `GET /box` ; null si la réponse n'en a pas (box non configurée ou muette). */
export const parseBoxDevices = (data: unknown): BoxDevice[] | null => {
  const devices = (data as { devices?: unknown } | null)?.devices
  if (!Array.isArray(devices)) return null
  return devices.flatMap((item: Record<string, unknown>) => {
    const mac = normalizeMac(item?.mac)
    return mac ? [{ mac, name: text(item.name) ?? mac, ip: text(item.ip), active: item.active === true, type: text(item.type), vendor: text(item.vendor) }] : []
  })
}

export const createBoxTables = (db: DatabaseSync): void => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ${BOX_CONNECTIONS_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      happened_at INTEGER NOT NULL,
      event TEXT NOT NULL,
      mac TEXT NOT NULL,
      name TEXT NOT NULL,
      ip TEXT,
      type TEXT,
      vendor TEXT,
      UNIQUE (happened_at, mac, event)
    );
    CREATE INDEX IF NOT EXISTS box_connections_happened ON ${BOX_CONNECTIONS_TABLE} (happened_at);
    CREATE TABLE IF NOT EXISTS ${BOX_KNOWN_TABLE} (
      mac TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      ip TEXT
    );
    CREATE TABLE IF NOT EXISTS ${BOX_GUESTS_TABLE} (
      mac TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      ip TEXT,
      type TEXT,
      vendor TEXT,
      first_seen INTEGER NOT NULL,
      last_seen INTEGER NOT NULL
    );
  `)
}

const readJsonList = (file: string): Record<string, unknown>[] => {
  if (!existsSync(file)) return []
  try {
    const parsed: unknown = JSON.parse(readFileSync(file, 'utf8'))
    return Array.isArray(parsed) ? (parsed as Record<string, unknown>[]) : []
  } catch {
    return []
  }
}

/**
 * Reprend une seule fois les anciens fichiers de House API (`box-known.json`, `box-guests.json`) quand la table correspondante est encore vide. Les fichiers ne sont plus lus ensuite
 * quand la table a des lignes, et House API ne les écrit plus. Rend le nombre de lignes reprises.
 */
export const migrateBoxFiles = (db: DatabaseSync, knownFile: string, guestsFile: string): number => {
  let imported = 0
  if ((db.prepare(`SELECT COUNT(*) AS n FROM ${BOX_KNOWN_TABLE}`).get() as { n: number }).n === 0) {
    const insert = db.prepare(`INSERT OR IGNORE INTO ${BOX_KNOWN_TABLE} (mac, name, ip) VALUES (?, ?, ?)`)
    for (const item of readJsonList(knownFile)) {
      const mac = normalizeMac(item.mac)
      if (mac) imported += Number(insert.run(mac, text(item.name) ?? mac, text(item.ip)).changes)
    }
  }
  if ((db.prepare(`SELECT COUNT(*) AS n FROM ${BOX_GUESTS_TABLE}`).get() as { n: number }).n === 0) {
    const insert = db.prepare(`INSERT OR IGNORE INTO ${BOX_GUESTS_TABLE} (mac, name, ip, type, vendor, first_seen, last_seen) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    for (const item of readJsonList(guestsFile)) {
      const mac = normalizeMac(item.mac)
      const first = typeof item.firstSeen === 'number' ? Math.floor(item.firstSeen) : null
      const last = typeof item.lastSeen === 'number' ? Math.floor(item.lastSeen) : first
      if (mac && first !== null && last !== null) imported += Number(insert.run(mac, text(item.name) ?? mac, text(item.ip), text(item.type), text(item.vendor), first, last).changes)
    }
  }
  return imported
}

export type BoxFetcher = (target: ApiTarget) => Promise<BoxDevice[]>

const fetchBoxDevices: BoxFetcher = (target) => fetchApi(target, '/box', parseBoxDevices)

export const createBoxWatcher = (ctx: Context, targetOf: () => ApiTarget | null, fetchDevices: BoxFetcher = fetchBoxDevices) => {
  const { db } = ctx
  let previous: Map<string, BoxDevice> | null = null
  let lastError = ''

  const addConnection = (event: 'connect' | 'disconnect', at: number, device: BoxDevice): void => {
    db.prepare(`INSERT OR IGNORE INTO ${BOX_CONNECTIONS_TABLE} (happened_at, event, mac, name, ip, type, vendor) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(at, event, device.mac, device.name, device.ip, device.type, device.vendor)
  }

  /** Une lecture de la box ; rend le nombre de lignes de `box_connections` écrites. */
  const poll = async (): Promise<number> => {
    const target = targetOf()
    if (!target) return 0
    let devices: BoxDevice[]
    try {
      devices = await fetchDevices(target)
      lastError = ''
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (message !== lastError) ctx.log(`Box : lecture sautée (${message})`)
      lastError = message
      return 0
    }
    let home = new Set((db.prepare(`SELECT mac FROM ${BOX_KNOWN_TABLE}`).all() as { mac: string }[]).map((row) => row.mac))
    if (home.size === 0) {
      // Tout premier démarrage : la photo des appareils actifs à cet instant devient la maison.
      const active = devices.filter((device) => device.active)
      if (active.length === 0) return 0
      const insert = db.prepare(`INSERT OR IGNORE INTO ${BOX_KNOWN_TABLE} (mac, name, ip) VALUES (?, ?, ?)`)
      for (const device of active) insert.run(device.mac, device.name, device.ip)
      home = new Set(active.map((device) => device.mac))
    }
    const others = devices.filter((device) => !home.has(device.mac))
    const current = new Map(others.filter((device) => device.active).map((device) => [device.mac, device]))
    const at = Math.floor(ctx.now() / 1000)
    const seen = db.prepare(
      `INSERT INTO ${BOX_GUESTS_TABLE} (mac, name, ip, type, vendor, first_seen, last_seen) VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (mac) DO UPDATE SET name = excluded.name, ip = excluded.ip, type = excluded.type, vendor = excluded.vendor, last_seen = excluded.last_seen`,
    )
    for (const device of current.values()) seen.run(device.mac, device.name, device.ip, device.type, device.vendor, at, at)
    let written = 0
    const before = previous
    if (before !== null) {
      for (const device of current.values()) {
        if (!before.has(device.mac)) {
          addConnection('connect', at, device)
          written++
        }
      }
      // Un appareil entré dans la maison entre-temps n'a pas « quitté » : on l'oublie sans rien écrire.
      for (const device of before.values()) {
        if (!current.has(device.mac) && !home.has(device.mac)) {
          addConnection('disconnect', at, others.find((item) => item.mac === device.mac) ?? device)
          written++
        }
      }
    }
    previous = current
    return written
  }

  return { poll }
}

export type BoxWatcher = ReturnType<typeof createBoxWatcher>
