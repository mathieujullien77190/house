// Le journal des lampes Hue gardé par House Sync (table hue_events) : les allumages et extinctions d'une lampe.
import type { Database } from '../db/database.ts'

interface LampRow {
  happened_at: number
  change: string
}

/** Vrai ou faux si le changement allume ou éteint la lampe (`{"on":true}`), null pour une autre variation (luminosité, couleur). */
const onOf = (change: string): boolean | null => {
  try {
    const parsed = JSON.parse(change) as { on?: unknown }
    return typeof parsed.on === 'boolean' ? parsed.on : null
  } catch {
    return null
  }
}

export const createLampRepository = (db: Database) => ({
  /** Les allumages et extinctions de la lampe de ce nom entre from et to (secondes), du plus ancien au plus récent. */
  switches: (name: string, from: number, to: number): { at: number; on: boolean }[] =>
    db
      .all<LampRow>("SELECT happened_at, change FROM hue_events WHERE resource = 'light' AND name = ? AND happened_at BETWEEN ? AND ? ORDER BY happened_at, id", name, from, to)
      .flatMap((row) => {
        const on = onOf(row.change)
        return on === null ? [] : [{ at: row.happened_at, on }]
      }),
  /** Son état juste avant `at` : le dernier allumage ou la dernière extinction connus, ou null si le journal n'en a pas. */
  stateBefore: (name: string, at: number): boolean | null => {
    const rows = db.all<LampRow>("SELECT happened_at, change FROM hue_events WHERE resource = 'light' AND name = ? AND happened_at < ? ORDER BY happened_at DESC, id DESC LIMIT 20", name, at)
    for (const row of rows) {
      const on = onOf(row.change)
      if (on !== null) return on
    }
    return null
  },
})

export type LampRepository = ReturnType<typeof createLampRepository>
