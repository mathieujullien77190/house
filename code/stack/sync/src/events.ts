// Les événements de l'enregistreur : les terminés qui ont un clip, ceux en cours, et les fusions de clips.
import { unlink } from 'node:fs/promises'
import { seconds, type Context } from './context.ts'
import type { Clips } from './clips.ts'
import type { Recorder, RecorderEvent } from './recorder.ts'

const EVENTS_PER_POLL = 50
// Un événement long peut se terminer après des événements plus récents : on relit une heure en arrière.
const LOOK_BACK_SECONDS = 3600
// Les événements terminés qui ont un clip depuis un instant, par pages du plus récent au plus ancien :
// après une coupure, il peut y en avoir plus qu'une page, et aucun ne doit sauter.
const MAX_PAGES = 20
const MERGE_LOOK_BACK_SECONDS = 6 * 3600

export const createEvents = (ctx: Context, rec: Recorder, clips: Clips) => {
  const { db, config } = ctx
  const findEvent = db.prepare('SELECT ended_at FROM events WHERE id = ?')
  // Le journal des fusions : un événement absorbé par un autre (ses clips se recouvraient) est noté ici avant d'être retiré de events.
  const insertMerge = db.prepare('INSERT OR IGNORE INTO merges (absorbed_id, kept_id, camera, absorbed_started_at, absorbed_ended_at, merged_at) VALUES (?, ?, ?, ?, ?, ?)')
  const clearWebClip = db.prepare('UPDATE events SET clip_web_path = NULL WHERE id = ?')
  const clearAudioClip = db.prepare('UPDATE events SET clip_audio_path = NULL WHERE id = ?')
  // Un événement en cours est inséré sans fin ni clip ; une fois terminé, la même ligne reçoit sa fin et son clip.
  const upsertEvent = db.prepare(
    'INSERT INTO events (id, camera, label, started_at, ended_at, clip_path, clip_started_at) VALUES (?, ?, ?, ?, ?, ?, ?) ' +
      'ON CONFLICT(id) DO UPDATE SET label = excluded.label, ended_at = excluded.ended_at, clip_path = excluded.clip_path, clip_started_at = excluded.clip_started_at',
  )
  const openEvents = db.prepare('SELECT id, camera FROM events WHERE ended_at IS NULL')
  const deleteEvent = db.prepare('DELETE FROM events WHERE id = ?')
  const lastStarts = db.prepare('SELECT camera, MAX(started_at) AS t FROM events GROUP BY camera')

  const fetchEventsSince = async (base: string, after: number): Promise<RecorderEvent[]> => {
    const all: RecorderEvent[] = []
    let before = ''
    for (let page = 0; page < MAX_PAGES; page += 1) {
      const res = await rec.recorderAt(base, `/api/events?after=${after}${before}&has_clip=1&in_progress=0&limit=${EVENTS_PER_POLL}`)
      if (!res.ok) throw new Error(`events : HTTP ${res.status}`)
      const events = (await res.json()) as RecorderEvent[]
      all.push(...events)
      if (events.length < EVENTS_PER_POLL) break
      before = `&before=${events[events.length - 1].start_time}`
      if (page === MAX_PAGES - 1) ctx.log(`Plus de ${MAX_PAGES * EVENTS_PER_POLL} événements à rattraper : les plus anciens attendront`)
    }
    return all
  }

  // Les événements terminés qui ont un clip, du plus ancien au plus récent, en ignorant ceux déjà complets ;
  // un événement connu « en cours » est complété (fin et clip) quand l'enregistreur le donne terminé.
  const syncEvents = async (base: string, cameras: string[]): Promise<number> => {
    // Le dernier événement connu de CET enregistreur : un enregistreur arrêté un moment rattrape ses événements.
    const starts = lastStarts.all() as { camera: string; t: number }[]
    const latest = Math.max(0, ...starts.filter((row) => cameras.includes(row.camera)).map((row) => row.t))
    const after = Math.max(0, latest - LOOK_BACK_SECONDS)
    const events = (await fetchEventsSince(base, after)).reverse()
    let copied = 0
    for (const event of events) {
      const known = findEvent.get(event.id) as { ended_at: number | null } | undefined
      if (known && known.ended_at !== null) continue
      const clip = await clips.copyClip(event)
      upsertEvent.run(
        event.id,
        event.camera,
        event.label,
        Math.floor(event.start_time),
        event.end_time === null ? null : Math.floor(event.end_time),
        clip?.path ?? null,
        clip?.start ?? null,
      )
      copied += 1
    }
    return copied
  }

  // Les événements en cours chez l'enregistreur (quelqu'un est encore dans le champ) : une ligne sans fin ni clip, pour que
  // la frise les montre tout de suite. Une ligne en cours que l'enregistreur ne connaît plus est terminée ou effacée.
  const syncOngoingEvents = async (base: string, cameras: string[]): Promise<number> => {
    const res = await rec.recorderAt(base, `/api/events?in_progress=1&limit=${EVENTS_PER_POLL}`)
    if (!res.ok) throw new Error(`events in progress : HTTP ${res.status}`)
    const ongoing = (await res.json()) as RecorderEvent[]
    const ongoingIds = new Set(ongoing.map((event) => event.id))
    for (const event of ongoing) {
      if (findEvent.get(event.id)) continue
      upsertEvent.run(event.id, event.camera, event.label, Math.floor(event.start_time), null, null, null)
    }
    for (const row of openEvents.all() as { id: string; camera: string }[]) {
      if (!cameras.includes(row.camera) || ongoingIds.has(row.id)) continue
      const detail = await rec.recorderAt(base, `/api/events/${row.id}`)
      if (detail.status === 404) {
        deleteEvent.run(row.id)
        continue
      }
      if (!detail.ok) continue
      const event = (await detail.json()) as RecorderEvent
      if (event.end_time === null) continue
      const clip = event.has_clip ? await clips.copyClip(event) : null
      upsertEvent.run(event.id, event.camera, event.label, Math.floor(event.start_time), Math.floor(event.end_time), clip?.path ?? null, clip?.start ?? null)
    }
    return ongoing.length
  }

  // Les événements fusionnés par l'enregistreur (des clips qui se recouvraient, réunis en un seul 30 min après) : l'absorbé
  // disparaît de la base et du disque, le survivant reçoit sa nouvelle fin, son nouveau clip et sa nouvelle copie légère.
  const syncMerges = async (base: string, cameras: string[]): Promise<number> => {
    const res = await rec.recorderAt(base, `/api/events?merged_after=${seconds(ctx) - MERGE_LOOK_BACK_SECONDS}&limit=10000`)
    if (!res.ok) throw new Error(`events fusionnés : HTTP ${res.status}`)
    let changed = 0
    for (const event of (await res.json()) as RecorderEvent[]) {
      if (!cameras.includes(event.camera) || !/^[\w.-]+$/.test(event.id)) continue
      const known = findEvent.get(event.id) as { ended_at: number | null } | undefined
      if (event.merged_into !== undefined) {
        if (!known) continue
        insertMerge.run(event.id, event.merged_into, event.camera, Math.floor(event.start_time), event.end_time === null ? null : Math.floor(event.end_time), Math.floor(event.merged_at ?? ctx.now() / 1000))
        deleteEvent.run(event.id)
        for (const suffix of ['.mp4', '.h264.mp4', '.aac']) await unlink(`${config.dataDir}/clips/${event.camera}/${event.id}${suffix}`).catch(() => undefined)
        changed += 1
        continue
      }
      if (!known || !event.has_clip || event.end_time === null || (known.ended_at !== null && known.ended_at >= Math.floor(event.end_time))) continue
      const clip = await clips.copyClip(event)
      if (!clip) continue
      upsertEvent.run(event.id, event.camera, event.label, Math.floor(event.start_time), Math.floor(event.end_time), clip.path, clip.start)
      clearWebClip.run(event.id)
      clearAudioClip.run(event.id)
      changed += 1
    }
    return changed
  }

  return { syncEvents, syncOngoingEvents, syncMerges }
}
