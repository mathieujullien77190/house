// Le surveillant de la Freebox : toutes les 15 s il lit les appareils de la box (lecture seule, GET). La maison, ce sont les appareils de `box-known.json` : la photo des appareils
// actifs au tout premier démarrage, puis ceux qu'on y ajoute. Tout autre appareil est un invité : dès qu'il est vu connecté il entre dans `box-guests.json` (il y reste, même hors ligne),
// et chaque connexion ou déconnexion d'un invité est écrite dans le journal.
// L'état précédent est gardé en mémoire seulement : la première lecture après un démarrage ne logge rien (mais les invités déjà connectés entrent dans la liste), un appareil déjà présent
// n'est pas re-loggé. Une lecture qui échoue ne change rien (pas de fausse déconnexion).
import { normalizeMac, type BoxKnownStore, type KnownDevice } from '../lib/boxKnownStore.ts'
import type { BoxConnectionEntry, BoxConnectionLog } from '../lib/boxConnectionLog.ts'
import type { BoxGuestsStore, Guest } from '../lib/boxGuestsStore.ts'
import type { BoxDevice, BoxService } from './boxService.ts'

/** Un invité de la liste, avec son état à la dernière lecture. */
export interface GuestInfo extends Guest {
  active: boolean
}

export interface BoxWatcherOptions {
  box: BoxService
  log: BoxConnectionLog
  /** La maison. */
  known: BoxKnownStore
  guests: BoxGuestsStore
  /** Millisecondes depuis 1970. */
  now?: () => number
  intervalMs?: number
  setTimer?: (work: () => void, ms: number) => unknown
  clearTimer?: (timer: unknown) => void
}

export const WATCH_INTERVAL_MS = 15_000

export const createBoxWatcher = (options: BoxWatcherOptions) => {
  const { box, log, known, guests } = options
  const now = options.now ?? Date.now
  const setTimer = options.setTimer ?? ((work: () => void, ms: number) => setInterval(work, ms).unref())
  const clearTimer = options.clearTimer ?? ((timer: unknown) => clearInterval(timer as NodeJS.Timeout))
  let previous: Map<string, BoxDevice> | null = null
  let last: BoxDevice[] = []
  let activeMacs = new Set<string>()
  let timer: unknown = null

  const entryOf = (event: BoxConnectionEntry['event'], at: number, device: BoxDevice): BoxConnectionEntry => ({
    at,
    event,
    mac: device.mac,
    name: device.name,
    ip: device.ip,
    type: device.type,
    vendor: device.vendor,
  })

  const poll = async (): Promise<void> => {
    let devices: BoxDevice[]
    try {
      devices = await box.lanDevices()
    } catch {
      return
    }
    last = devices.flatMap((device) => {
      const mac = normalizeMac(device.mac)
      return mac ? [{ ...device, mac }] : []
    })
    let home = known.list()
    if (home === null) {
      const active = last.filter((device) => device.active)
      if (active.length === 0) return
      home = active.map(({ mac, name, ip }) => ({ mac, name, ip }))
      known.init(home)
    }
    const homeMacs = new Set(home.map((device) => device.mac))
    const others = last.filter((device) => !homeMacs.has(device.mac))
    const current = new Map(others.filter((device) => device.active).map((device) => [device.mac, device]))
    activeMacs = new Set(current.keys())
    const at = Math.floor(now() / 1000)
    guests.seen(
      [...current.values()].map(({ mac, name, ip, type, vendor }) => ({ mac, name, ip, type, vendor })),
      at,
    )
    const before = previous
    if (before !== null) {
      const entries = [
        ...[...current.values()].filter((device) => !before.has(device.mac)).map((device) => entryOf('connect', at, device)),
        // un appareil entré dans la maison entre-temps n'a pas "quitté" : on l'oublie sans rien écrire
        ...[...before.values()]
          .filter((device) => !current.has(device.mac) && !homeMacs.has(device.mac))
          .map((device) => entryOf('disconnect', at, others.find((item) => item.mac === device.mac) ?? device)),
      ]
      if (entries.length > 0) log.append(entries)
    }
    previous = current
  }

  return {
    poll,
    /** Lance la surveillance : une lecture tout de suite, puis une toutes les 15 s. */
    start: (): void => {
      if (timer !== null) return
      void poll()
      timer = setTimer(() => void poll(), options.intervalMs ?? WATCH_INTERVAL_MS)
    },
    stop: (): void => {
      if (timer !== null) clearTimer(timer)
      timer = null
    },
    recent: (count: number): BoxConnectionEntry[] => log.recent(count),
    /** Les appareils de la maison. */
    homeList: (): KnownDevice[] => known.list() ?? [],
    /** Les invités, les plus récemment vus d'abord. */
    guestList: (): GuestInfo[] =>
      guests
        .list()
        .map((guest) => ({ ...guest, active: activeMacs.has(guest.mac) }))
        .sort((a, b) => b.lastSeen - a.lastSeen),
    /** Retire un appareil de la maison (sans toucher à la box) : s'il est connecté, il entre dans les invités à la lecture suivante. 'invalid' : MAC fausse ; 'not-ready' : la liste de départ n'existe pas encore ; 'absent' : il n'y était pas. */
    removeFromHome: (rawMac: unknown): 'removed' | 'invalid' | 'not-ready' | 'absent' => {
      const mac = normalizeMac(rawMac)
      if (!mac) return 'invalid'
      const before = known.list()
      if (before === null) return 'not-ready'
      if (!before.some((device) => device.mac === mac)) return 'absent'
      known.remove(mac)
      // Il n'était pas dans `previous` (réservé aux invités) : s'il est connecté, la lecture suivante le logge comme une connexion.
      return 'removed'
    },
    /** Ajoute un appareil à la maison (sans toucher à la box) : il quitte la liste des invités. 'invalid' : MAC fausse ; 'not-ready' : la liste de départ n'existe pas encore. */
    addToHome: (rawMac: unknown): KnownDevice | 'invalid' | 'not-ready' => {
      const mac = normalizeMac(rawMac)
      if (!mac) return 'invalid'
      const seen = last.find((device) => device.mac === mac)
      const guest = seen ? null : guests.list().find((item) => item.mac === mac)
      const logged = seen || guest ? null : log.recent(5000).find((entry) => entry.mac === mac)
      const device: KnownDevice = { mac, name: seen?.name ?? guest?.name ?? logged?.name ?? mac, ip: seen?.ip ?? guest?.ip ?? logged?.ip ?? null }
      if (known.add(device) === null) return 'not-ready'
      guests.remove(mac)
      previous?.delete(mac)
      activeMacs.delete(mac)
      return device
    },
  }
}

export type BoxWatcher = ReturnType<typeof createBoxWatcher>
