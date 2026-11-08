// L'enregistreur de la maison. Pour chaque caméra, trois choses :
//   1. il enregistre le flux principal par segments (copie sans transcodage, gardés quelques heures) ;
//   2. il surveille le flux léger et ouvre un événement au début d'un mouvement, le ferme à sa fin ;
//   3. quand un événement est fini et que ses segments sont écrits, il en fait un clip MP4.
// Une petite API (server.ts) rend tout cela à House Sync, sous la forme que Frigate offrait.
import { existsSync, mkdirSync, rmSync, unlinkSync } from 'node:fs'
import { audioClipPath, buildAudioClip, pruneAudio, recordAudio } from './audio.ts'
import { buildClip, buildWebClip, webClipPath } from './clips.ts'
import { loadConfig } from './config.ts'
import { createEventStore } from './events.ts'
import { findMergeGroups } from './merge.ts'
import { pruneSegments, recordSegments } from './segments.ts'
import { detectorForLevel, DEFAULT_SENSITIVITY } from './sensitivity.ts'
import { polygonMask, type Point } from './zone.ts'
import { startServer } from './server.ts'
import { watchMotion } from './watcher.ts'

const config = loadConfig()
const store = createEventStore(config.stateFile)
const log = (message: string) => console.log(`${new Date().toISOString()} ${message}`)

// Un événement resté ouvert d'une exécution précédente (redémarrage en plein mouvement) ne serait jamais fermé.
for (const record of store.closeOrphans()) log(`${record.camera} : événement ${record.id} laissé ouvert par l’exécution précédente, fermé`)

const TICK_MS = 5_000
const PRUNE_MS = 60_000
// Un segment dure `segmentSeconds` et n'est complet que quand le suivant commence : on attend un peu de plus.
const SETTLE_SECONDS = config.segmentSeconds + 3

// La détection de chaque caméra : allumée par défaut, éteinte par House Sync quand les clips de la caméra ne sont pas gardés.
const detecting = new Map<string, boolean>()

// Les seuils de détection de chaque caméra : un objet à elle, que la sensibilité (House Sync) modifie sur place, et que le détecteur relit à chaque image.
const detectors = new Map<string, typeof config.detector>(config.cameras.map((camera) => [camera, { ...config.detector }]))

// La zone surveillée de chaque caméra : son polygone (pour comparer) et son masque sur l'image analysée (absent = toute l'image).
// House Sync l'envoie à chaque minute ; en mémoire, comme la sensibilité.
const zones = new Map<string, { points: Point[] | null; mask: Uint8Array | null }>()

// Les ouvertures d'événements, par caméra (un seul événement ouvert à la fois par caméra).
const open = new Map<string, string>()

for (const camera of config.cameras) {
  mkdirSync(`${config.recordingsDir}/${camera}`, { recursive: true })
  void recordSegments(`${config.go2rtcRtsp}/${camera}_main`, `${config.recordingsDir}/${camera}`, config.segmentSeconds, (m) =>
    log(`${camera} : ${m}`),
  )
  void watchMotion(
    `${config.go2rtcRtsp}/${camera}_sub`,
    { ...config, detector: detectors.get(camera) ?? config.detector },
    (event) => {
      if (event.type === 'start') {
        const record = store.open(camera, event.at)
        open.set(camera, record.id)
        log(`${camera} : mouvement ${record.id}`)
      } else {
        const id = open.get(camera)
        if (id) {
          store.close(id, event.startedAt + event.durationSeconds)
          open.delete(camera)
          log(`${camera} : fin de mouvement ${id} (${event.durationSeconds.toFixed(1)} s)`)
        }
      }
    },
    (m) => log(`${camera} : ${m}`),
    () => detecting.get(camera) !== false,
    () => {
      // Un mouvement ouvert quand la détection s'arrête ne serait jamais fermé : on le ferme là.
      const id = open.get(camera)
      if (id) {
        store.close(id, Date.now() / 1000)
        open.delete(camera)
      }
    },
    () => zones.get(camera)?.mask ?? null,
  )
}

// Le son des caméras de AUDIO_CAMERAS : de petits fichiers (comme les segments vidéo, gardés autant d'heures), jamais dans les segments ni les clips vidéo.
// Il n'est conservé que pour les clips de mouvement : voir makeClips.
const audioDirOf = (camera: string) => `${config.recordingsDir}/${camera}/audio`
for (const camera of config.audioCameras) {
  void recordAudio(`${config.go2rtcRtsp}/${camera}_sub`, audioDirOf(camera), config.audioSegmentSeconds, (m) =>
    log(`${camera} (son) : ${m}`),
  )
}

startServer(
  config,
  store,
  {
    set: (camera, enabled) => {
      if (detecting.get(camera) !== enabled) log(`${camera} : détection ${enabled ? 'allumée' : 'éteinte'}`)
      detecting.set(camera, enabled)
    },
    setZone: (camera, points) => {
      const current = zones.get(camera)
      if (JSON.stringify(current?.points ?? null) === JSON.stringify(points)) return
      zones.set(camera, { points, mask: points ? polygonMask(points, config.width, config.height) : null })
      log(`${camera} : zone surveillée ${points ? `${points.length} sommets` : 'toute l’image'}`)
    },
    setSensitivity: (camera, level) => {
      const seuils = detectors.get(camera)
      if (!seuils) return
      const next = detectorForLevel(config.detector, level)
      if (seuils.pixelThreshold !== next.pixelThreshold || seuils.areaThreshold !== next.areaThreshold) {
        log(
          `${camera} : sensibilité ${level}${level === DEFAULT_SENSITIVITY ? ' (réglage de base)' : ''} : écart ${next.pixelThreshold}, surface ${(next.areaThreshold * 100).toFixed(2)} %`,
        )
      }
      Object.assign(seuils, next)
    },
  },
  log,
)

// La copie H.264 720p de chaque clip qui n'en a pas (un navigateur sans décodeur H.265 ne lit que celle-là). Une à la fois :
// l'encodage est fait par le processeur. Rattrape aussi les clips faits avant cette copie.
let encoding = false
const failedWebClips = new Set<string>()
const makeWebClips = async () => {
  if (encoding) return
  encoding = true
  try {
    for (const record of store.list({ hasClip: true, limit: 1000 })) {
      const clip = `${config.clipsDir}/${record.id}.mp4`
      const web = webClipPath(clip)
      if (!existsSync(clip) || existsSync(web) || failedWebClips.has(record.id)) continue
      try {
        await buildWebClip(clip, web)
        log(`${record.camera} : copie H.264 ${record.id}`)
      } catch (error) {
        // Un clip illisible (fait de segments vides) échouerait à chaque tour : on ne réessaie qu'au prochain démarrage.
        failedWebClips.add(record.id)
        log(`${record.camera} : copie H.264 ${record.id} impossible : ${error instanceof Error ? error.message : String(error)}`)
      }
    }
  } finally {
    encoding = false
  }
}

// Toutes les 5 s : les événements finis dont tous les segments sont écrits reçoivent leur clip. Un seul tour à la fois (un clip long
// ou une copie H.264 peut dépasser 5 s), et un clip qui échoue attend une minute avant un nouvel essai.
const CLIP_RETRY_MS = 60_000
const failedClips = new Map<string, number>()
let building = false
setInterval(async () => {
  if (building) return
  building = true
  try {
    await makeClips()
  } finally {
    building = false
  }
}, TICK_MS)

const makeClips = async () => {
  const now = Date.now() / 1000
  for (const record of store.withoutClip()) {
    if (record.end_time === null || now < record.end_time + config.postSeconds + SETTLE_SECONDS) continue
    if (Date.now() - (failedClips.get(record.id) ?? 0) < CLIP_RETRY_MS) continue
    try {
      const built = await buildClip({
        cameraDir: `${config.recordingsDir}/${record.camera}`,
        output: `${config.clipsDir}/${record.id}.mp4`,
        from: record.start_time - config.preSeconds,
        to: record.end_time + config.postSeconds,
        segmentSeconds: config.segmentSeconds,
        videoTag: config.videoTag,
      })
      if (built.segments > 0) {
        store.markClip(record.id, built.start)
        log(`${record.camera} : clip ${record.id} (${built.segments} segments)`)
        // Le son du clip (caméras à son seulement), à part de la vidéo et calé sur son début ; un échec n'empêche pas le clip.
        if (config.audioCameras.includes(record.camera)) {
          try {
            const sound = await buildAudioClip({
              dir: audioDirOf(record.camera),
              output: audioClipPath(`${config.clipsDir}/${record.id}.mp4`),
              from: built.start,
              to: record.end_time + config.postSeconds,
              segmentSeconds: config.audioSegmentSeconds,
              gainDb: config.audioGainDb,
            })
            if (sound) store.markAudio(record.id)
          } catch (error) {
            log(`${record.camera} : son du clip ${record.id} impossible : ${error instanceof Error ? error.message : String(error)}`)
          }
        }
      }
    } catch (error) {
      failedClips.set(record.id, Date.now())
      log(`${record.camera} : clip ${record.id} impossible : ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  await makeWebClips()
}

// Les événements dont les clips se recouvrent (un mouvement qui reprend à quelques secondes d'écart) et dont le dernier a
// `mergeDelaySeconds` sont fusionnés en un seul : les anciens clips sont effacés, celui du survivant se refait au prochain tour.
const mergeOverlaps = () => {
  const now = Date.now() / 1000
  for (const group of findMergeGroups(store.list({ limit: 100_000 }), now, config, config.mergeDelaySeconds)) {
    for (const id of group) {
      rmSync(`${config.clipsDir}/${id}.mp4`, { force: true })
      rmSync(webClipPath(`${config.clipsDir}/${id}.mp4`), { force: true })
      rmSync(audioClipPath(`${config.clipsDir}/${id}.mp4`), { force: true })
    }
    store.merge(group, now)
    log(`${group.length} événements fusionnés en ${group[0]}`)
  }
}

// Chaque minute : on fusionne, puis on jette les segments, les événements et les clips plus vieux que la rétention.
setInterval(() => {
  mergeOverlaps()
  const before = Date.now() / 1000 - config.retentionSeconds
  for (const camera of config.cameras) pruneSegments(`${config.recordingsDir}/${camera}`, before)
  for (const camera of config.audioCameras) pruneAudio(audioDirOf(camera), before)
  for (const record of store.prune(before)) {
    try {
      unlinkSync(`${config.clipsDir}/${record.id}.mp4`)
    } catch {
      // pas de clip : rien à effacer
    }
    rmSync(webClipPath(`${config.clipsDir}/${record.id}.mp4`), { force: true })
    rmSync(audioClipPath(`${config.clipsDir}/${record.id}.mp4`), { force: true })
  }
}, PRUNE_MS)

log(`Enregistreur : ${config.cameras.join(', ')} (segments de ${config.segmentSeconds} s, ${config.retentionSeconds / 3600} h gardées)`)
if (config.audioCameras.length > 0)
  log(
    `Son des clips : ${config.audioCameras.join(', ')} (petits fichiers de ${config.audioSegmentSeconds} s gardés comme les segments, un son par clip de mouvement)`,
  )
