// Les appareils CONNUS de la Freebox : `box-known.json` dans STATE_DIR, une liste de {mac, name, ip}.
// Écrite une seule fois par le surveillant (la photo des appareils actifs à son premier démarrage), puis seulement quand l'utilisateur marque un appareil comme connu.
// Ne touche jamais aux réglages de la box.
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

export interface KnownDevice {
  mac: string
  name: string
  ip: string | null
}

/** Une MAC en majuscules séparées par « : » ; null si ce n'en est pas une. */
export const normalizeMac = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const hex = value.trim().replace(/[:-]/g, '').toUpperCase()
  return /^[0-9A-F]{12}$/.test(hex) ? (hex.match(/../g) as string[]).join(':') : null
}

export const createBoxKnownStore = (file: string) => {
  let cache: KnownDevice[] | null | undefined
  const load = (): KnownDevice[] | null => {
    let parsed: unknown
    try {
      parsed = JSON.parse(readFileSync(file, 'utf8'))
    } catch {
      return null
    }
    if (!Array.isArray(parsed)) return null
    return parsed.flatMap((item: unknown) => {
      const raw = (item ?? {}) as Record<string, unknown>
      const mac = normalizeMac(raw.mac)
      return mac ? [{ mac, name: typeof raw.name === 'string' ? raw.name.slice(0, 200) : mac, ip: typeof raw.ip === 'string' ? raw.ip : null }] : []
    })
  }
  const save = (list: KnownDevice[]): void => {
    mkdirSync(dirname(file), { recursive: true })
    const partial = `${file}.tmp`
    writeFileSync(partial, `${JSON.stringify(list, null, 2)}\n`)
    renameSync(partial, file)
    cache = list
  }
  return {
    /** La liste ; null tant que le fichier n'existe pas (le surveillant n'a pas encore pris la photo de départ). */
    list: (): KnownDevice[] | null => {
      if (cache === undefined) cache = load()
      return cache
    },
    /** Écrit la liste de départ ; refuse d'écraser un fichier existant. Rend vrai si elle a été écrite. */
    init: (devices: KnownDevice[]): boolean => {
      if (cache === undefined) cache = load()
      if (cache !== null) return false
      save(devices)
      return true
    },
    /** Ajoute un appareil (sans doublon de MAC). Rend la liste ; null tant que la liste de départ n'existe pas. */
    add: (device: KnownDevice): KnownDevice[] | null => {
      if (cache === undefined) cache = load()
      const list = cache
      if (list === null) return null
      if (list.some((known) => known.mac === device.mac)) return list
      save([...list, device])
      return [...list, device]
    },
    /** Retire un appareil de la maison (il redevient un invité à la lecture suivante). Rend la liste ; null tant que la liste de départ n'existe pas ; la même liste si la MAC n'y était pas. */
    remove: (mac: string): KnownDevice[] | null => {
      if (cache === undefined) cache = load()
      const list = cache
      if (list === null) return null
      if (!list.some((known) => known.mac === mac)) return list
      const next = list.filter((known) => known.mac !== mac)
      save(next)
      return next
    },
  }
}

export type BoxKnownStore = ReturnType<typeof createBoxKnownStore>
