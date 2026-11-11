// Les clips : copie du clip d'un événement (et de sa copie légère, de son son) depuis l'enregistreur vers le disque backup, reprise des
// copies manquées, et ménage quotidien de tout ce qui est plus vieux que la durée de garde (clips, images, journal Hue, événements, fusions).
import { createWriteStream, mkdirSync } from 'node:fs'
import { rename, unlink } from 'node:fs/promises'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { messageOf, seconds, type Context } from './context.ts'
import { CLIP_TIMEOUT_MS, type Recorder, type RecorderEvent } from './recorder.ts'
import { purgeHueLog } from './hueLog.ts'
import { readSavedIds } from './savedClips.ts'
import { purgeSnapshots } from './snapshots.ts'

export type CopiedClip = { path: string; start: number | null }

/** Ce que le ménage quotidien a retiré : vieux clips (fichiers), images, lignes du journal Hue, événements sans clip, lignes de fusions. */
export type Purged = { clips: number; snapshots: number; journal: number; events: number; merges: number }
export const NOTHING_PURGED: Purged = { clips: 0, snapshots: 0, journal: 0, events: 0, merges: 0 }

// Un clip peut ne pas être prêt au moment de la copie : on réessaie tant que l'enregistreur garde ses enregistrements.
export const CLIP_RETRY_SECONDS = 6 * 3600
// L'enregistreur écrit ses enregistrements par segments de 10 s : un clip demandé trop tôt après la fin de l'événement
// est tronqué. On attend ce délai après la fin avant de copier.
export const CLIP_SETTLE_SECONDS = 20
/** Le ménage des clips passe **une fois par jour, à heure fixe** (heure de Paris) : un clip peut donc vivre jusqu'à N jours et presque 24 h (15 j 23 h pour N = 15), c'est voulu. */
export const PURGE_AT = '04:00'
/** Le jour (Paris) du dernier ménage fait, dans app_settings : le ménage ne se refait pas le même jour, même après un redémarrage. */
export const PURGE_DONE_KEY = 'clips_purged_on'
/** Si la liste des clips sauvegardés est illisible, le ménage sauté n'est retenté qu'au bout de ce délai (pas à chaque tour). */
const PURGE_RETRY_SECONDS = 600

const parisFormat = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })

/** Le jour (AAAA-MM-JJ) et la minute de la journée (0 à 1439) à Paris pour un instant en millisecondes. */
export const parisNow = (ms: number): { day: string; minutes: number } => {
  const parts = Object.fromEntries(parisFormat.formatToParts(new Date(ms)).map((part) => [part.type, part.value]))
  return { day: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) }
}

const PURGE_MINUTES = Number(PURGE_AT.slice(0, 2)) * 60 + Number(PURGE_AT.slice(3, 5))

/** Écrit la réponse dans un fichier : en flux (un clip 4K ne tient pas tout entier en mémoire), dans un fichier temporaire renommé à la fin
 * (une coupure ne laisse jamais un clip tronqué sous son vrai nom). */
export const saveResponse = async (res: Response, path: string): Promise<void> => {
  if (!res.body) throw new Error('réponse sans corps')
  const partial = `${path}.part`
  try {
    await pipeline(Readable.fromWeb(res.body), createWriteStream(partial))
    await rename(partial, path)
  } catch (error) {
    await unlink(partial).catch(() => undefined)
    throw error
  }
}

export const createClips = (ctx: Context, rec: Recorder) => {
  const { db, config, settings } = ctx
  const dataDir = config.dataDir
  const eventsWithoutClip = db.prepare(
    'SELECT id, camera, label, started_at, ended_at FROM events WHERE clip_path IS NULL AND ended_at IS NOT NULL AND ended_at <= ? AND started_at > ?',
  )
  const updateClip = db.prepare('UPDATE events SET clip_path = ?, clip_started_at = ? WHERE id = ?')
  const clipsWithoutWeb = db.prepare('SELECT id, camera, clip_path FROM events WHERE clip_path IS NOT NULL AND clip_web_path IS NULL AND started_at > ?')
  const updateWebClip = db.prepare('UPDATE events SET clip_web_path = ? WHERE id = ?')
  // Le son se demande quand la copie légère est là : l'enregistreur a alors tout fait (clip, son, copie légère).
  const clipsWithoutAudio = db.prepare('SELECT id, camera, clip_path FROM events WHERE clip_path IS NOT NULL AND clip_web_path IS NOT NULL AND clip_audio_path IS NULL AND started_at > ?')
  const updateAudioClip = db.prepare('UPDATE events SET clip_audio_path = ? WHERE id = ?')
  const expiredClips = db.prepare('SELECT id, clip_path, clip_web_path, clip_audio_path FROM events WHERE clip_path IS NOT NULL AND ended_at IS NOT NULL AND ended_at < ?')
  const clearClipPaths = db.prepare('UPDATE events SET clip_path = NULL, clip_web_path = NULL, clip_audio_path = NULL WHERE id = ?')

  // Un événement lancé à la main ? Dit par l'enregistreur (le champ manual) ; l'événement relu dans la base n'a pas ce champ, on le demande une fois et on s'en souvient.
  const manualKnown = new Map<string, boolean>()
  const isManual = async (event: RecorderEvent): Promise<boolean> => {
    if (event.manual !== undefined) return event.manual
    const known = manualKnown.get(event.id)
    if (known !== undefined) return known
    try {
      const res = await rec.recorder(event.camera, `/api/events/${event.id}`, 5000)
      if (!res.ok) return false
      const manual = ((await res.json()) as { manual?: boolean }).manual === true
      manualKnown.set(event.id, manual)
      return manual
    } catch {
      return false
    }
  }

  // Copie le clip d'un événement dans DATA_DIR/clips/<caméra>/<id>.mp4 et renvoie ce chemin relatif et le début réel du clip.
  // Trop tôt après la fin de l'événement (segments pas tous écrits), on ne copie pas : la reprise le fera.
  const copyClip = async (event: RecorderEvent): Promise<CopiedClip | null> => {
    // L'identifiant sert de nom de fichier : rien d'autre que des caractères sûrs.
    if (!/^[\w.-]+$/.test(event.id) || !/^[\w-]+$/.test(event.camera)) return null
    // Clips désactivés pour cette caméra (réglage de la page) : l'événement est gardé, sans vidéo. Sauf un clip enregistré à la main : on l'a voulu.
    if (!settings.keepsClip(event.camera, event.start_time) && !(await isManual(event))) return null
    if (event.end_time !== null && ctx.now() / 1000 - event.end_time < CLIP_SETTLE_SECONDS) return null
    // Un clip qui n'arrive pas (délai, coupure, disque) est sauté et sera retenté : il ne doit pas bloquer le tour des autres.
    try {
      const res = await rec.recorder(event.camera, `/api/events/${event.id}/clip.mp4`, CLIP_TIMEOUT_MS)
      if (!res.ok) {
        ctx.log(`Clip ${event.id} indisponible (HTTP ${res.status})`)
        return null
      }
      mkdirSync(`${dataDir}/clips/${event.camera}`, { recursive: true })
      const path = `clips/${event.camera}/${event.id}.mp4`
      await saveResponse(res, `${dataDir}/${path}`)
      const start = Number(res.headers.get('X-Clip-Start'))
      return { path, start: Number.isFinite(start) && start > 0 ? start : null }
    } catch (error) {
      ctx.log(`Clip ${event.id} non copié : ${messageOf(error)}`)
      return null
    }
  }

  // Les événements enregistrés sans clip (l'enregistreur ne l'avait pas encore fini) : on retente la copie.
  const retryMissingClips = async (): Promise<number> => {
    const now = seconds(ctx)
    let repaired = 0
    const rows = eventsWithoutClip.all(now - CLIP_SETTLE_SECONDS, now - CLIP_RETRY_SECONDS) as (Omit<RecorderEvent, 'has_clip' | 'start_time' | 'end_time' | 'manual'> & { started_at: number; ended_at: number })[]
    for (const row of rows) {
      const clip = await copyClip({ ...row, has_clip: true, start_time: row.started_at, end_time: row.ended_at })
      if (!clip) continue
      updateClip.run(clip.path, clip.start, row.id)
      repaired += 1
    }
    return repaired
  }

  // La copie légère (H.264 720p) des clips copiés : l'enregistreur la fabrique après le clip, on la récupère dès qu'elle existe
  // (et tant qu'il garde le clip). Les clips plus anciens n'en ont pas (voir sync/CLAUDE.md).
  const syncWebClips = async (): Promise<number> => {
    const now = seconds(ctx)
    let copied = 0
    for (const row of clipsWithoutWeb.all(now - CLIP_RETRY_SECONDS) as { id: string; camera: string; clip_path: string }[]) {
      if (!/^[\w.-]+$/.test(row.id) || !/^[\w-]+$/.test(row.camera)) continue
      try {
        const res = await rec.recorder(row.camera, `/api/events/${row.id}/clip.h264.mp4`, CLIP_TIMEOUT_MS)
        if (!res.ok) continue
        const path = row.clip_path.replace(/\.mp4$/, '.h264.mp4')
        await saveResponse(res, `${dataDir}/${path}`)
        updateWebClip.run(path, row.id)
        copied += 1
      } catch (error) {
        ctx.log(`Copie légère ${row.id} non copiée : ${messageOf(error)}`)
      }
    }
    return copied
  }

  // Le son des clips (<id>.aac, à part de la vidéo) : l'enregistreur le fabrique avec le clip pour ses caméras à son (AUDIO_CAMERAS). On le récupère
  // une fois la copie légère faite. Un clip sans son (caméra sans micro, clip d'avant) répond 404 : on ne le redemande plus jusqu'au prochain démarrage.
  const noAudio = new Set<string>()
  const syncAudioClips = async (): Promise<number> => {
    const now = seconds(ctx)
    let copied = 0
    for (const row of clipsWithoutAudio.all(now - CLIP_RETRY_SECONDS) as { id: string; camera: string; clip_path: string }[]) {
      if (noAudio.has(row.id) || !/^[\w.-]+$/.test(row.id) || !/^[\w-]+$/.test(row.camera)) continue
      try {
        const res = await rec.recorder(row.camera, `/api/events/${row.id}/clip.aac`, CLIP_TIMEOUT_MS)
        if (res.status === 404) {
          noAudio.add(row.id)
          void res.body?.cancel().catch(() => undefined)
          continue
        }
        if (!res.ok) continue
        const path = row.clip_path.replace(/\.mp4$/, '.aac')
        await saveResponse(res, `${dataDir}/${path}`)
        updateAudioClip.run(path, row.id)
        copied += 1
      } catch (error) {
        ctx.log(`Son ${row.id} non copié : ${messageOf(error)}`)
      }
    }
    return copied
  }

  // ---- La durée de garde ----
  // Une seule durée (réglable depuis la page : table app_settings, pour toutes les caméras), un seul ménage par jour. Il efface, au-delà de la durée :
  // les clips non sauvegardés (ceux que la WebApp a marqués « sauvegardé », liste écrite par l'API, ne le sont jamais) ; les images ; les lignes du journal Hue ;
  // les événements dont le clip n'est pas gardé (un événement au clip sauvegardé garde son clip_path et reste) ; les lignes de fusions.
  // Rien n'est effacé, de rien, si la liste des clips sauvegardés n'est pas lisible.
  let lastPurgeAt = 0
  const purgedOn = db.prepare('SELECT value FROM app_settings WHERE key = ?')
  const markPurged = db.prepare('INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
  const oldEvents = db.prepare('DELETE FROM events WHERE started_at < ? AND clip_path IS NULL')
  const oldMerges = db.prepare('DELETE FROM merges WHERE merged_at < ?')
  const purgeOldClips = async (): Promise<Purged> => {
    const now = seconds(ctx)
    // Une fois par jour, à `PURGE_AT` (heure de Paris) ou dès que possible après : pas avant l'heure, pas deux fois le même jour.
    const { day, minutes } = parisNow(ctx.now())
    if (minutes < PURGE_MINUTES) return NOTHING_PURGED
    if ((purgedOn.get(PURGE_DONE_KEY) as { value: string } | undefined)?.value === day) return NOTHING_PURGED
    if (now - lastPurgeAt < PURGE_RETRY_SECONDS) return NOTHING_PURGED
    lastPurgeAt = now
    const saved = await readSavedIds(config.savedClipsFile)
    if (!saved) {
      ctx.log('Ménage des clips sauté : la liste des clips sauvegardés est illisible')
      return NOTHING_PURGED
    }
    let purged = 0
    const limit = now - settings.clipRetentionDays() * 86400
    for (const row of expiredClips.all(limit) as { id: string; clip_path: string; clip_web_path: string | null; clip_audio_path: string | null }[]) {
      if (saved.has(row.id)) continue
      let failed = false
      for (const path of [row.clip_path, row.clip_web_path, row.clip_audio_path]) {
        if (!path || !/^clips\/[\w-]+\/[\w.-]+\.(mp4|aac)$/.test(path)) continue
        await unlink(`${dataDir}/${path}`).catch((error: NodeJS.ErrnoException) => {
          if (error.code !== 'ENOENT') failed = true
        })
      }
      // Un fichier qui ne s'efface pas garde sa ligne : le prochain ménage réessaiera.
      if (failed) continue
      clearClipPaths.run(row.id)
      purged += 1
    }
    // Après les clips : un événement dont le clip vient d'être effacé (clip_path NULL) part avec eux, un clip sauvegardé garde le sien.
    const result: Purged = {
      clips: purged,
      snapshots: await purgeSnapshots(ctx, limit),
      journal: purgeHueLog(db, limit),
      events: Number(oldEvents.run(limit).changes),
      merges: Number(oldMerges.run(limit).changes),
    }
    markPurged.run(PURGE_DONE_KEY, day)
    return result
  }

  return { copyClip, retryMissingClips, syncWebClips, syncAudioClips, purgeOldClips }
}

export type Clips = ReturnType<typeof createClips>
