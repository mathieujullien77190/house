// Les événements de mouvement : un petit magasin en mémoire, écrit dans un fichier JSON à chaque changement
// (il survit à un redémarrage). Un événement s'ouvre au début du mouvement, se ferme à sa fin, reçoit son clip ensuite.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

export interface MotionRecord {
  id: string
  camera: string
  label: 'motion'
  /** Secondes depuis 1970. */
  start_time: number
  end_time: number | null
  has_clip: boolean
  /** Secondes depuis 1970 : le début réel du clip (le segment qui précède l'événement), connu une fois le clip fait. */
  clip_start?: number
}

export interface EventQuery {
  after?: number
  before?: number
  hasClip?: boolean
  inProgress?: boolean
  limit?: number
}

/** Un identifiant sûr pour un nom de fichier : début et caméra. */
export const eventId = (camera: string, startTime: number): string => `${startTime.toFixed(3)}-${camera}`

export const createEventStore = (file: string) => {
  let events: MotionRecord[] = []
  if (existsSync(file)) {
    try {
      events = JSON.parse(readFileSync(file, 'utf8')) as MotionRecord[]
    } catch {
      events = []
    }
  }
  mkdirSync(dirname(file), { recursive: true })
  const save = () => writeFileSync(file, JSON.stringify(events))

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
    markClip: (id: string, clipStart: number) => {
      const record = events.find((e) => e.id === id)
      if (record) {
        record.has_clip = true
        record.clip_start = clipStart
        save()
      }
    },
    get: (id: string): MotionRecord | undefined => events.find((e) => e.id === id),
    /** Les événements qui filtrent, du plus récent au plus ancien (comme l'API que House Sync lisait). */
    list: (query: EventQuery = {}): MotionRecord[] =>
      events
        .filter((e) => (query.after === undefined || e.start_time > query.after) && (query.before === undefined || e.start_time < query.before))
        .filter((e) => query.hasClip === undefined || e.has_clip === query.hasClip)
        .filter((e) => query.inProgress === undefined || (e.end_time === null) === query.inProgress)
        .sort((a, b) => b.start_time - a.start_time)
        .slice(0, query.limit ?? 100),
    /** Les événements terminés dont le clip n'est pas encore fait. */
    withoutClip: (): MotionRecord[] => events.filter((e) => e.end_time !== null && !e.has_clip),
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
