// Les yeux qui brillent : la nuit, les caméras infrarouges voient l'œil d'un animal comme un tout petit point blanc saturé.
// Pour chaque caméra dont `eyes_mode` est « on », tant que `settings.eyesActive` est vrai (de 30 min après le coucher à 30 min avant le lever),
// chaque image prise (`snapshots.ts`) part vers l'enregistreur (`POST /api/eyes`, le détecteur est dans `motion/src/eyes.ts`). S'il y trouve un œil :
// une ligne va dans la table `eye_detections` (le journal de l'onglet Base), au plus une par caméra et par minute, et la caméra déclenche un événement de mouvement
// (`POST /api/cameras/<caméra>/trigger?reason=eyes` : clip et frise comme les autres, prolongé par les appels suivants), au plus un appel par caméra toutes les 30 s.
// Une panne de l'enregistreur n'arrête jamais la prise d'image : elle est écrite une fois au journal.
import type { DatabaseSync } from 'node:sqlite'
import { messageOf, type Context } from './context.ts'
import type { Recorder } from './recorder.ts'

export const EYES_TABLE = 'eye_detections'
/** Une détection par caméra et par minute au plus. */
export const EYES_MIN_GAP_SECONDS = 60
/** Au plus un déclenchement d'événement par caméra dans cet intervalle (secondes) : les suivants prolongeraient l'événement, inutile de les empiler. */
export const EYES_TRIGGER_GAP_SECONDS = 30
/** L'enregistreur décode l'image et la regarde en moins d'une seconde ; au-delà, on laisse tomber cette image. */
export const EYES_TIMEOUT_MS = 8_000

export const createEyesTable = (db: DatabaseSync): void => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ${EYES_TABLE} (
      camera TEXT NOT NULL,
      taken_at INTEGER NOT NULL,
      path TEXT NOT NULL,
      x INTEGER NOT NULL,
      y INTEGER NOT NULL,
      size INTEGER NOT NULL,
      peak INTEGER NOT NULL,
      contrast INTEGER NOT NULL,
      pair INTEGER NOT NULL DEFAULT 0,
      distance REAL NOT NULL DEFAULT 0,
      PRIMARY KEY (camera, taken_at)
    );
  `)
}

interface EyesAnswer {
  found?: boolean
  pair?: boolean
  distance?: number
  eyes?: { x: number; y: number; size: number; peak: number; contrast: number }[]
}

export const createEyes = (ctx: Context, rec: Recorder) => {
  const { db, settings } = ctx
  const lastOne = db.prepare(`SELECT MAX(taken_at) AS at FROM ${EYES_TABLE} WHERE camera = ?`)
  const insert = db.prepare(`INSERT OR IGNORE INTO ${EYES_TABLE} (camera, taken_at, path, x, y, size, peak, contrast, pair, distance) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
  // Une panne n'est écrite qu'une fois de suite, pour ne pas remplir le journal (une image toutes les 5 à 15 s).
  let failing = false
  let triggerFailing = false
  const lastTrigger = new Map<string, number>()

  /** Ouvre (ou prolonge) l'événement de mouvement de la caméra ; un échec est toléré et écrit une fois. */
  const trigger = async (camera: string, base: string, takenAt: number): Promise<void> => {
    const last = lastTrigger.get(camera)
    if (last !== undefined && takenAt - last < EYES_TRIGGER_GAP_SECONDS) return
    lastTrigger.set(camera, takenAt)
    try {
      const res = await ctx.fetch(`${base}/api/cameras/${camera}/trigger?reason=eyes`, { method: 'POST', signal: AbortSignal.timeout(EYES_TIMEOUT_MS) })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      triggerFailing = false
    } catch (error) {
      if (!triggerFailing) ctx.log(`Yeux qui brillent sur ${camera} : événement non déclenché (${messageOf(error)})`)
      triggerFailing = true
    }
  }

  return {
    /** Regarde l'image qui vient d'être prise (déjà rangée dans `path`) ; ne lève jamais. */
    look: async (camera: string, takenAt: number, path: string, image: Buffer): Promise<void> => {
      if (!settings.eyesActive(camera, takenAt)) return
      try {
        const base = rec.recorderOf.get(camera)
        if (!base) throw new Error('enregistreur inconnu')
        const res = await ctx.fetch(`${base}/api/eyes`, { method: 'POST', body: new Uint8Array(image), signal: AbortSignal.timeout(EYES_TIMEOUT_MS) })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        failing = false
        const answer = (await res.json()) as EyesAnswer
        const eye = answer.found ? answer.eyes?.[0] : undefined
        if (!eye) return
        await trigger(camera, base, takenAt)
        const previous = (lastOne.get(camera) as { at: number | null }).at
        if (previous !== null && takenAt - previous < EYES_MIN_GAP_SECONDS) return
        insert.run(camera, takenAt, path, eye.x, eye.y, eye.size, eye.peak, eye.contrast, answer.pair ? 1 : 0, answer.distance ?? 0)
        ctx.log(`Yeux qui brillent sur ${camera} en (${eye.x}, ${eye.y})${answer.pair ? ', une paire' : ''} : ${path}`)
      } catch (error) {
        if (!failing) ctx.log(`Yeux qui brillent sur ${camera} : recherche impossible (${messageOf(error)})`)
        failing = true
      }
    },
  }
}

export type Eyes = ReturnType<typeof createEyes>
