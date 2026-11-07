// Les événements de mouvement : un petit magasin en mémoire, écrit dans un fichier JSON à chaque changement
// (il survit à un redémarrage). Un événement s'ouvre au début du mouvement, se ferme à sa fin, reçoit son clip ensuite.
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

export interface MotionRecord {
  id: string
  camera: string
  label: 'motion'
  /** Secondes depuis 1970. */
  start_time: number
  end_time: number | null
  has_clip: boolean
  /** Le son du clip existe (fichier <id>.aac à côté du clip) : il est gardé seulement pour les clips de mouvement des caméras à son. */
  has_audio?: boolean
  /** Secondes depuis 1970 : le début réel du clip (le segment qui précède l'événement), connu une fois le clip fait. */
  clip_start?: number
  /** Fusion : l'identifiant de l'événement qui a absorbé celui-ci (il n'a plus de clip et n'est plus listé). */
  merged_into?: string
  /** Fusion : secondes depuis 1970 où l'événement a été fusionné (absorbé ou survivant), pour que House Sync le sache. */
  merged_at?: number
}

export interface EventQuery {
  after?: number
  before?: number
  hasClip?: boolean
  inProgress?: boolean
  limit?: number
  /** Seulement les événements fusionnés après cet instant (absorbés compris), au lieu de la liste normale. */
  mergedAfter?: number
}

/** Un identifiant sûr pour un nom de fichier : début et caméra. */
export const eventId = (camera: string, startTime: number): string => `${startTime.toFixed(3)}-${camera}`

export const createEventStore = (file: string) => {
  let events: MotionRecord[] = []
  if (existsSync(file)) {
    try {
      events = JSON.parse(readFileSync(file, 'utf8')) as MotionRecord[]
    } catch {
      // Fichier abîmé (coupure en pleine écriture) : on le met de côté au lieu de l'écraser par une liste vide.
      renameSync(file, `${file}.corrupt-${Date.now()}`)
      console.error(`${file} illisible : mis de côté`)
      events = []
    }
  }
  mkdirSync(dirname(file), { recursive: true })
  // Écrit dans un fichier temporaire puis le renomme (jamais un fichier tronqué), et une erreur (disque plein) ne fait pas tomber l'enregistreur : la prochaine écriture réessaie.
  const save = () => {
    try {
      const partial = `${file}.tmp`
      writeFileSync(partial, JSON.stringify(events))
      renameSync(partial, file)
    } catch (error) {
      console.error(`${file} non écrit : ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  return {
    open: (camera: string, startTime: number): MotionRecord => {
      const record: MotionRecord = { id: eventId(camera, startTime), camera, label: 'motion', start_time: startTime, end_time: null, has_clip: false }
      events.push(record)
      save()
      return record
    },
    close: (id: string, endTime: number) => {
      const record = events.find((e) => e.id === id)
      if (record) {
        record.end_time = endTime
        save()
      }
    },
    /**
     * Ferme les événements restés ouverts par une exécution précédente : le détecteur, lui, repart de zéro et ne les
     * fermerait jamais (un événement « en cours » pour toujours dans la frise). À appeler au démarrage, avant la
     * détection. Chacun se termine à son propre début ; son clip se fait ensuite comme les autres. Rend ceux qu'on a fermés.
     */
    closeOrphans: (): MotionRecord[] => {
      const orphans = events.filter((e) => e.end_time === null)
      for (const record of orphans) record.end_time = record.start_time
      if (orphans.length > 0) save()
      return orphans
    },
    markClip: (id: string, clipStart: number) => {
      const record = events.find((e) => e.id === id)
      if (record) {
        record.has_clip = true
        record.clip_start = clipStart
        save()
      }
    },
    /** Le son du clip est fait. */
    markAudio: (id: string) => {
      const record = events.find((e) => e.id === id)
      if (record) {
        record.has_audio = true
        save()
      }
    },
    /**
     * Fusionne des événements voisins (du plus ancien au plus récent) : le premier survit, finit à la fin du dernier et
     * perd son clip (il se refait avec la plage entière) ; les autres sont absorbés (gardés pour que House Sync les retire).
     */
    merge: (ids: string[], at: number) => {
      const group = ids.map((id) => events.find((e) => e.id === id)).filter((e): e is MotionRecord => e !== undefined)
      if (group.length < 2) return
      const [first, ...others] = group
      first.end_time = Math.max(...group.map((e) => e.end_time ?? e.start_time))
      first.has_clip = false
      delete first.clip_start
      delete first.has_audio
      first.merged_at = at
      for (const other of others) {
        other.merged_into = first.id
        other.merged_at = at
        other.has_clip = false
        delete other.clip_start
        delete other.has_audio
      }
      save()
    },
    get: (id: string): MotionRecord | undefined => events.find((e) => e.id === id),
    /** Les événements qui filtrent, du plus récent au plus ancien (comme l'API que House Sync lisait). */
    list: (query: EventQuery = {}): MotionRecord[] =>
      events
        .filter((e) => (query.mergedAfter === undefined ? e.merged_into === undefined : (e.merged_at ?? 0) > query.mergedAfter))
        .filter((e) => (query.after === undefined || e.start_time > query.after) && (query.before === undefined || e.start_time < query.before))
        .filter((e) => query.hasClip === undefined || e.has_clip === query.hasClip)
        .filter((e) => query.inProgress === undefined || (e.end_time === null) === query.inProgress)
        .sort((a, b) => b.start_time - a.start_time)
        .slice(0, query.limit ?? 100),
    /** Les événements terminés dont le clip n'est pas encore fait. */
    withoutClip: (): MotionRecord[] => events.filter((e) => e.end_time !== null && !e.has_clip && e.merged_into === undefined),
    /** Retire les événements plus anciens que `before` (secondes) ; rend ceux qu'on a retirés. */
    prune: (before: number): MotionRecord[] => {
      const removed = events.filter((e) => e.start_time < before)
      if (removed.length > 0) {
        events = events.filter((e) => e.start_time >= before)
        save()
      }
      return removed
    },
  }
}

export type EventStore = ReturnType<typeof createEventStore>
