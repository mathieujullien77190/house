// La Freebox : son état (ligne, WiFi, appareils connectés) lu en parallèle, et l'interrupteur du WiFi. Chaque lecture qui échoue laisse son champ à null sans faire tomber les autres ;
// la box est dite injoignable (`reachable: false`) quand aucune des quatre ne répond.
import type { FreeboxClient } from '../lib/freebox.ts'

export interface BoxDevice {
  name: string
  ip: string | null
  mac: string
  active: boolean
  /** Vrai : l'appareil a un bail DHCP statique (IP réservée) ; faux : adresse dynamique ; null : la liste des baux n'a pas pu être lue. */
  staticLease: boolean | null
  type: string | null
  vendor: string | null
}

export interface BoxState {
  configured: boolean
  reachable: boolean
  model: string | null
  firmware: string | null
  /** Secondes depuis le dernier démarrage de la box. */
  uptime: number | null
  /** Débits en octets par seconde. */
  connection: { state: string | null; type: string | null; ipv4: string | null; rateDown: number | null; rateUp: number | null } | null
  wifi: { enabled: boolean } | null
  devices: BoxDevice[]
}

/** Le WiFi invité de la box (réseau « invité » : une clé personnalisée). Le mot de passe n'est rendu que par `GET /box/guest-wifi`, jamais par `GET /box`. */
export interface GuestWifi {
  ssid: string | null
  password: string
  description: string | null
  /** Le nombre d'appareils qui peuvent l'utiliser en même temps, et ceux qui l'utilisent. */
  maxUses: number | null
  users: number
}

/** Le filtrage par adresse MAC du WiFi de la box : son mode (`disabled`, `blacklist`, `whitelist`) et les adresses listées. */
export interface MacFilter {
  state: string | null
  entries: { id: string; mac: string; type: string }[]
}

/** Le mode du filtrage MAC est la liste blanche : exclure un appareil n'aurait aucun sens, la box n'est pas modifiée. */
export class WhitelistMode extends Error {
  constructor() {
    super('la box est en liste blanche')
    this.name = 'WhitelistMode'
  }
}

export const EXCLUDE_COMMENT = 'House : invité exclu'

export interface BoxService {
  state: () => Promise<BoxState>
  /** Tous les appareils que la box connaît, lus en GET seulement. Échoue (erreur) quand la box ne répond pas : le surveillant ne change alors rien. */
  lanDevices: () => Promise<BoxDevice[]>
  /** Null quand la box n'a aucune clé invité. */
  guestWifi: () => Promise<GuestWifi | null>
  setWifi: (enabled: boolean) => Promise<{ enabled: boolean }>
  /** Lecture (GET) du filtrage MAC du WiFi. */
  macFilter: () => Promise<MacFilter>
  /** Exclut (liste noire du WiFi) ou réadmet un appareil par sa MAC. Seule écriture de la box en dehors du WiFi ; lève `WhitelistMode` si la box est en liste blanche. */
  setExcluded: (mac: string, excluded: boolean) => Promise<{ excluded: boolean }>
}

interface RawSystem {
  uptime_val?: number
  firmware_version?: string
  board_name?: string
  model_info?: { pretty_name?: string }
}
interface RawConnection {
  state?: string
  type?: string
  ipv4?: string
  rate_down?: number
  rate_up?: number
}
interface RawHost {
  primary_name?: string
  names?: { name?: string }[]
  l2ident?: { id?: string }
  active?: boolean
  host_type?: string
  vendor_name?: string
  l3connectivities?: { af?: string; addr?: string; active?: boolean }[]
}

interface RawMacFilter {
  id?: string
  mac?: string
  type?: string
}

/** La box ne rend pas de `result` pour une liste vide (`{"success": true}`) : une liste absente vaut une liste vide. */
const toFilterEntries = (raw: RawMacFilter[] | undefined): MacFilter['entries'] =>
  (raw ?? []).flatMap((entry) => (entry.id && entry.mac ? [{ id: entry.id, mac: entry.mac.toUpperCase(), type: entry.type ?? '' }] : []))

interface RawCustomKey {
  users?: unknown[]
  params?: { key?: string; description?: string; max_use_count?: number }
}
interface RawBss {
  status?: { custom_key_ssid?: string }
}

export const NOT_CONFIGURED: BoxState = { configured: false, reachable: false, model: null, firmware: null, uptime: null, connection: null, wifi: null, devices: [] }

const toDevice = (host: RawHost, leases: Set<string> | null): BoxDevice => {
  const mac = host.l2ident?.id ?? ''
  const addresses = (host.l3connectivities ?? []).filter((entry) => entry.af === 'ipv4' && entry.addr)
  const ip = (addresses.find((entry) => entry.active) ?? addresses[0])?.addr ?? null
  return {
    name: host.primary_name || host.names?.find((entry) => entry.name)?.name || mac || 'Appareil sans nom',
    ip,
    mac,
    active: host.active === true,
    staticLease: leases === null ? null : leases.has(mac.toUpperCase()),
    type: host.host_type || null,
    vendor: host.vendor_name || null,
  }
}

/** Les appareils actifs d'abord, puis par nom. */
export const sortDevices = (devices: BoxDevice[]): BoxDevice[] =>
  [...devices].sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }))

export const createBoxService = (client: FreeboxClient): BoxService => ({
  state: async () => {
    const [system, connection, wifi, hosts, leases] = await Promise.allSettled([
      client.get<RawSystem>('/system/'),
      client.get<RawConnection>('/connection/'),
      client.get<{ enabled?: boolean }>('/wifi/config/'),
      client.get<RawHost[]>('/lan/browser/pub/'),
      client.get<{ mac?: string }[]>('/dhcp/static_lease/'),
    ])
    const staticMacs = leases.status === 'fulfilled' ? new Set(leases.value.flatMap((lease) => (lease.mac ? [lease.mac.toUpperCase()] : []))) : null
    const ok = (item: PromiseSettledResult<unknown>) => item.status === 'fulfilled'
    return {
      configured: true,
      reachable: [system, connection, wifi, hosts].some(ok),
      model: system.status === 'fulfilled' ? (system.value.model_info?.pretty_name ?? system.value.board_name ?? null) : null,
      firmware: system.status === 'fulfilled' ? (system.value.firmware_version ?? null) : null,
      uptime: system.status === 'fulfilled' ? (system.value.uptime_val ?? null) : null,
      connection:
        connection.status === 'fulfilled'
          ? {
              state: connection.value.state ?? null,
              type: connection.value.type ?? null,
              ipv4: connection.value.ipv4 ?? null,
              rateDown: connection.value.rate_down ?? null,
              rateUp: connection.value.rate_up ?? null,
            }
          : null,
      wifi: wifi.status === 'fulfilled' && typeof wifi.value.enabled === 'boolean' ? { enabled: wifi.value.enabled } : null,
      devices: hosts.status === 'fulfilled' ? sortDevices(hosts.value.map((host) => toDevice(host, staticMacs))) : [],
    }
  },
  lanDevices: async () => (await client.get<RawHost[]>('/lan/browser/pub/')).map((host) => toDevice(host, null)),
  guestWifi: async () => {
    const [keys, bss] = await Promise.all([client.get<RawCustomKey[]>('/wifi/custom_key/'), client.get<RawBss[]>('/wifi/bss/').catch(() => [] as RawBss[])])
    const key = keys.find((entry) => entry.params?.key)
    if (!key?.params?.key) return null
    return {
      ssid: bss.find((entry) => entry.status?.custom_key_ssid)?.status?.custom_key_ssid ?? null,
      password: key.params.key,
      description: key.params.description?.trim() || null,
      maxUses: key.params.max_use_count ?? null,
      users: key.users?.length ?? 0,
    }
  },
  macFilter: async () => {
    const [config, entries] = await Promise.all([client.get<{ mac_filter_state?: string }>('/wifi/config/'), client.get<RawMacFilter[]>('/wifi/mac_filter/')])
    return { state: config.mac_filter_state ?? null, entries: toFilterEntries(entries) }
  },
  setExcluded: async (mac, excluded) => {
    const [config, listed] = await Promise.all([client.get<{ mac_filter_state?: string }>('/wifi/config/'), client.get<RawMacFilter[]>('/wifi/mac_filter/')])
    const same = toFilterEntries(listed).filter((entry) => entry.mac === mac && entry.type === 'blacklist')
    if (!excluded) {
      for (const entry of same) await client.del(`/wifi/mac_filter/${encodeURIComponent(entry.id).replace(/%3A/gi, ':')}`)
      return { excluded: false }
    }
    if (config.mac_filter_state === 'whitelist') throw new WhitelistMode()
    // Le filtrage n'agit que s'il est en mode liste noire : on l'active seulement s'il était coupé.
    if (config.mac_filter_state === 'disabled') await client.put('/wifi/config/', { mac_filter_state: 'blacklist' })
    if (same.length === 0) await client.post('/wifi/mac_filter/', { mac, type: 'blacklist', comment: EXCLUDE_COMMENT })
    return { excluded: true }
  },
  setWifi: async (enabled) => {
    const config = await client.put<{ enabled: boolean }>('/wifi/config/', { enabled })
    return { enabled: config.enabled }
  },
})
