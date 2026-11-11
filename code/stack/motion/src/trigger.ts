// Le déclenchement d'un événement de mouvement de l'extérieur du détecteur : House Sync l'appelle quand il a vu des yeux qui brillent (`eyes.ts`).
// Un événement normal (clip, frise), avec une étiquette qui dit pourquoi ; un nouvel appel tant qu'il est ouvert le prolonge au lieu d'en empiler un autre.
import type { EventStore, MotionLabel } from './events.ts'

/** Les raisons acceptées et l'étiquette de l'événement qu'elles ouvrent. */
export const TRIGGER_REASONS: Record<string, MotionLabel> = { eyes: 'eyes' }
/** Sans nouvel appel pendant ce temps (secondes), l'événement est fermé à l'instant du dernier appel. */
export const TRIGGER_HOLD_SECONDS = 10

export interface TriggerResult {
  id: string
  started_at: number
  /** Vrai : un événement déjà ouvert a été prolongé. */
  extended: boolean
}

export const createTrigger = (store: EventStore, now: () => number = () => Date.now() / 1000) => {
  // Un événement déclenché ouvert au plus par caméra.
  const open = new Map<string, { id: string; startedAt: number; lastAt: number }>()
  return {
    fire: (camera: string, label: MotionLabel): TriggerResult => {
      const at = now()
      const current = open.get(camera)
      if (current) {
        current.lastAt = at
        return { id: current.id, started_at: current.startedAt, extended: true }
      }
      const record = store.open(camera, at, false, label)
      open.set(camera, { id: record.id, startedAt: at, lastAt: at })
      return { id: record.id, started_at: at, extended: false }
    },
    /** À appeler régulièrement : ferme les événements sans appel depuis `TRIGGER_HOLD_SECONDS` ; rend leurs identifiants. */
    tick: (): string[] => {
      const at = now()
      const closed: string[] = []
      for (const [camera, current] of open) {
        if (at - current.lastAt <= TRIGGER_HOLD_SECONDS) continue
        store.close(current.id, current.lastAt)
        open.delete(camera)
        closed.push(current.id)
      }
      return closed
    },
  }
}

export type Trigger = ReturnType<typeof createTrigger>
