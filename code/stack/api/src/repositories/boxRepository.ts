// Les appareils de la Freebox, lus et rangés dans les tables de House Sync : `box_known` (la maison), `box_guests` (les invités vus connectés) et `box_connections` (leurs connexions).
// House Sync les remplit en surveillant la box ; House API les lit, et n'y écrit que pour une action de l'utilisateur (ajouter un appareil à la maison, ou l'en retirer).
import type { Database } from '../db/database.ts'

export interface KnownDevice {
  mac: string
  name: string
  ip: string | null
}

export interface Guest extends KnownDevice {
  type: string | null
  vendor: string | null
  /** Secondes depuis 1970 : première et dernière fois vu connecté. */
  firstSeen: number
  lastSeen: number
}

/** Un invité de la liste ; `active` : House Sync l'a vu connecté à sa dernière lecture. */
export interface GuestInfo extends Guest {
  active: boolean
}

export interface BoxConnectionEntry {
  at: number
  event: 'connect' | 'disconnect'
  mac: string
  name: string
  ip: string | null
  type: string | null
  vendor: string | null
}

/** Un invité est « connecté » si House Sync l'a vu il y a moins que cela (il lit la box toutes les 15 s). */
export const ACTIVE_WITHIN_SECONDS = 45

/** Une MAC en majuscules séparées par « : » ; null si ce n'en est pas une. */
export const normalizeMac = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const hex = value.trim().replace(/[:-]/g, '').toUpperCase()
  return /^[0-9A-F]{12}$/.test(hex) ? (hex.match(/../g) as string[]).join(':') : null
}

export const createBoxRepository = (db: Database, now: () => number = Date.now) => {
  const homeList = (): KnownDevice[] => db.all<KnownDevice>('SELECT mac, name, ip FROM box_known ORDER BY rowid')

  return {
    /** Les appareils de la maison. */
    homeList,
    /** Les invités, les plus récemment vus d'abord. */
    guestList: (): GuestInfo[] => {
      const limit = Math.floor(now() / 1000) - ACTIVE_WITHIN_SECONDS
      return db
        .all<Guest>('SELECT mac, name, ip, type, vendor, first_seen AS firstSeen, last_seen AS lastSeen FROM box_guests ORDER BY last_seen DESC')
        .map((guest) => ({ ...guest, active: guest.lastSeen >= limit }))
    },
    /** Les dernières connexions et déconnexions, la plus récente d'abord. */
    recent: (count: number): BoxConnectionEntry[] =>
      db.all<BoxConnectionEntry>('SELECT happened_at AS at, event, mac, name, ip, type, vendor FROM box_connections ORDER BY happened_at DESC, id DESC LIMIT ?', count),
    /**
     * Action de l'utilisateur : ajoute un appareil à la maison (sans toucher à la box). Il quitte les invités et son historique de connexions est effacé (ce n'est plus un invité).
     * `seen` : le nom et l'adresse que la box lui donne à cet instant, s'ils sont connus. 'invalid' : MAC fausse ; 'not-ready' : la maison est vide (House Sync n'a pas encore pris la photo de départ).
     */
    addToHome: (rawMac: unknown, seen?: { name: string; ip: string | null } | null): KnownDevice | 'invalid' | 'not-ready' => {
      const mac = normalizeMac(rawMac)
      if (!mac) return 'invalid'
      if (homeList().length === 0) return 'not-ready'
      const guest = db.get<KnownDevice>('SELECT mac, name, ip FROM box_guests WHERE mac = ?', mac)
      const logged = seen || guest ? undefined : db.get<KnownDevice>('SELECT mac, name, ip FROM box_connections WHERE mac = ? ORDER BY happened_at DESC LIMIT 1', mac)
      const device: KnownDevice = { mac, name: seen?.name ?? guest?.name ?? logged?.name ?? mac, ip: seen?.ip ?? guest?.ip ?? logged?.ip ?? null }
      db.run('INSERT OR IGNORE INTO box_known (mac, name, ip) VALUES (?, ?, ?)', device.mac, device.name, device.ip)
      db.run('DELETE FROM box_guests WHERE mac = ?', mac)
      db.run('DELETE FROM box_connections WHERE mac = ?', mac)
      return device
    },
    /** Action de l'utilisateur : retire un appareil de la maison (il redevient un invité à la lecture suivante de House Sync). 'invalid' : MAC fausse ; 'absent' : il n'y était pas. */
    removeFromHome: (rawMac: unknown): 'removed' | 'invalid' | 'absent' => {
      const mac = normalizeMac(rawMac)
      if (!mac) return 'invalid'
      return db.run('DELETE FROM box_known WHERE mac = ?', mac) > 0 ? 'removed' : 'absent'
    },
  }
}

export type BoxRepository = ReturnType<typeof createBoxRepository>
