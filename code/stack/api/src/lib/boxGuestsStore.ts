// La liste des invités de la box : `box-guests.json` dans STATE_DIR. Un invité est tout appareil qui n'est pas dans la liste de la maison (`box-known.json`) et qui a été vu connecté.
// Il y reste, même hors ligne, jusqu'à ce qu'on l'ajoute à la maison. `lastSeen` change à chaque lecture : il n'est écrit qu'une fois par minute au plus, sauf pour un nouvel invité
// ou un changement de nom, d'adresse, de type ou de fabricant. Ne touche jamais aux réglages de la box.
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

export interface Guest {
  mac: string
  name: string
  ip: string | null
  type: string | null
  vendor: string | null
  /** Secondes depuis 1970 : première et dernière fois vu connecté. */
  firstSeen: number
  lastSeen: number
}

/** Ce que la box dit d'un appareil, sans les dates. */
export type GuestSighting = Pick<Guest, 'mac' | 'name' | 'ip' | 'type' | 'vendor'>

/** Écriture de `lastSeen` seule : au plus une fois par minute. */
export const SAVE_EVERY_SECONDS = 60

const text = (value: unknown): string | null => (typeof value === 'string' ? value.slice(0, 200) : null)

export const createBoxGuestsStore = (file: string) => {
  let guests: Guest[] | undefined
  let savedAt = 0
  const load = (): Guest[] => {
    let parsed: unknown
    try {
      parsed = JSON.parse(readFileSync(file, 'utf8'))
    } catch {
      return []
    }
    if (!Array.isArray(parsed)) return []
    return parsed.flatMap((item: unknown) => {
      const raw = (item ?? {}) as Record<string, unknown>
      if (typeof raw.mac !== 'string' || typeof raw.firstSeen !== 'number' || typeof raw.lastSeen !== 'number') return []
      return [{ mac: raw.mac, name: text(raw.name) ?? raw.mac, ip: text(raw.ip), type: text(raw.type), vendor: text(raw.vendor), firstSeen: raw.firstSeen, lastSeen: raw.lastSeen }]
    })
  }
  const all = (): Guest[] => (guests ??= load())
  const save = (at: number): void => {
    mkdirSync(dirname(file), { recursive: true })
    const partial = `${file}.tmp`
    writeFileSync(partial, `${JSON.stringify(all(), null, 2)}\n`)
    renameSync(partial, file)
    savedAt = at
  }
  return {
    list: (): Guest[] => [...all()],
    /** Note des invités vus connectés à l'instant `at` (secondes) : les ajoute ou met à jour nom, adresse et `lastSeen`. */
    seen: (sightings: GuestSighting[], at: number): void => {
      if (sightings.length === 0) return
      const list = all()
      let structural = false
      for (const sighting of sightings) {
        const known = list.find((guest) => guest.mac === sighting.mac)
        if (!known) {
          list.push({ ...sighting, firstSeen: at, lastSeen: at })
          structural = true
          continue
        }
        if (known.name !== sighting.name || known.ip !== sighting.ip || known.type !== sighting.type || known.vendor !== sighting.vendor) structural = true
        Object.assign(known, sighting, { lastSeen: at })
      }
      if (structural || at - savedAt >= SAVE_EVERY_SECONDS) {
        try {
          save(at)
        } catch {
          // la liste reste en mémoire, la prochaine écriture réessaie
        }
      }
    },
    /** Retire un invité (ajouté à la maison). Rend vrai s'il y était. */
    remove: (mac: string): boolean => {
      const list = all()
      const index = list.findIndex((guest) => guest.mac === mac)
      if (index < 0) return false
      list.splice(index, 1)
      try {
        save(savedAt)
      } catch {
        // idem
      }
      return true
    },
  }
}

export type BoxGuestsStore = ReturnType<typeof createBoxGuestsStore>
