// L'enregistreur de la maison. Pour chaque caméra, trois choses :
//   1. il enregistre le flux principal par segments (copie sans transcodage, gardés quelques heures) ;
//   2. il surveille le flux léger et ouvre un événement au début d'un mouvement, le ferme à sa fin ;
//   3. quand un événement est fini et que ses segments sont écrits, il en fait un clip MP4.
// Une petite API (server.ts) rend tout cela à House Sync, sous la forme que Frigate offrait.
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { audioClipPath, buildAudioClip, pruneAudio, recordAudio } from './audio.ts'
import { buildClip, buildWebClip, webClipPath } from './clips.ts'
import { loadConfig } from './config.ts'
import { createEventStore } from './events.ts'
import { findMergeGroups } from './merge.ts'
import { pruneSegments, recordSegments } from './segments.ts'
import { detectorForLevel, DEFAULT_SENSITIVITY, isSensitivity } from './sensitivity.ts'
import { clipToZone, parsePolygon, polygonMask, type Point } from './zone.ts'
import { isMotionSeconds, MAX_SHAPES } from './detector.ts'
import { appendShapes, buildShapesClip, pruneShapes, shapesClipPath } from './shapes.ts'
import { startServer } from './server.ts'
import { watchMotion } from './watcher.ts'
import { watchEyes, type EyePoint } from './eyes.ts'

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

// La recherche des yeux (eyes.ts) : allumée la nuit par House Sync ; le masque de la zone sur l'image 1280×720 analysée, et les derniers cadres vus.
const EYES_WIDTH = 1280
const EYES_HEIGHT = 720
// Des yeux vus comptent comme un mouvement, et leur cadre reste dessiné, pendant ce temps (les images clés arrivent toutes les 2 s).
const EYES_HOLD_SECONDS = 1.5
const eyesOn = new Map<string, boolean>()
// Le feuillage : un mouvement est étiqueté ainsi quand au moins `zones` zones sont vues sur au moins FOLIAGE_SHARE de ses images (0 : jamais). Compté dans la zone surveillée, sur les images de l'événement ouvert.
const FOLIAGE_SHARE = 0.3
const FOLIAGE_MIN_FRAMES = 5
const foliageZones = new Map<string, number>()
// Les images en mouvement depuis le début du mouvement (même avant l'ouverture de l'événement : il s'ouvre après la durée minimale) ; un calme de plus de FOLIAGE_GAP_SECONDS les remet à zéro.
const FOLIAGE_GAP_SECONDS = 2
const foliageStats = new Map<string, { frames: number; leafy: number; lastAt: number }>()
const eyesMasks = new Map<string, Uint8Array | null>()
const lastEyes = new Map<string, { at: number; boxes: EyePoint[][] }>()
const eyesSeen = (camera: string): EyePoint[][] => {
  const last = lastEyes.get(camera)
  return last && Date.now() / 1000 - last.at <= EYES_HOLD_SECONDS ? last.boxes : []
}

// Zone, sensibilité et durée minimale de chaque caméra, gardées dans un petit fichier à côté de `events.json` : House Sync les renvoie, mais au plus une minute après un redémarrage ;
// sans cela, la détection repartirait sur toute l'image (le feuillage hors zone déclenchait des mouvements).
const detectionStateFile = `${dirname(config.stateFile)}/detection.json`
const sensitivities = new Map<string, number>()
const saveDetectionState = () => {
  try {
    const state = {
      zones: Object.fromEntries([...zones].map(([camera, zone]) => [camera, zone.points])),
      sensitivity: Object.fromEntries(sensitivities),
      foliage: Object.fromEntries(foliageZones),
      minSeconds: Object.fromEntries([...detectors].map(([camera, seuils]) => [camera, seuils.minSeconds])),
    }
    writeFileSync(`${detectionStateFile}.tmp`, JSON.stringify(state))
    renameSync(`${detectionStateFile}.tmp`, detectionStateFile)
  } catch (error) {
    log(`réglages de détection non écrits : ${error instanceof Error ? error.message : String(error)}`)
  }
}
try {
  const saved = JSON.parse(readFileSync(detectionStateFile, 'utf-8')) as { zones?: Record<string, unknown>; sensitivity?: Record<string, number>; minSeconds?: Record<string, number>; foliage?: Record<string, number> }
  for (const camera of config.cameras) {
    const points = parsePolygon(saved.zones?.[camera])
    if (points) {
      zones.set(camera, { points, mask: polygonMask(points, config.width, config.height) })
      eyesMasks.set(camera, polygonMask(points, EYES_WIDTH, EYES_HEIGHT))
    }
    const seuils = detectors.get(camera)
    const level = saved.sensitivity?.[camera]
    if (seuils && level !== undefined && isSensitivity(level)) {
      sensitivities.set(camera, level)
      Object.assign(seuils, { pixelThreshold: detectorForLevel(config.detector, level).pixelThreshold, areaThreshold: detectorForLevel(config.detector, level).areaThreshold })
    }
    const leafy = saved.foliage?.[camera]
    if (leafy !== undefined && Number.isInteger(leafy) && leafy >= 0 && leafy <= 60) foliageZones.set(camera, leafy)
    const minSeconds = saved.minSeconds?.[camera]
    if (seuils && minSeconds !== undefined && isMotionSeconds(minSeconds)) seuils.minSeconds = minSeconds
  }
  log('réglages de détection repris du dernier arrêt (zone, sensibilité, durée minimale)')
} catch {
  // Pas de fichier (première fois) ou illisible : les défauts, House Sync renvoie tout.
}

// Les ouvertures d'événements, par caméra (un seul événement ouvert à la fois par caméra).
const open = new Map<string, string>()
// Les caméras liées (LINKS, des groupes) : l'événement d'une source ouvre un événement sur chaque autre caméra de son groupe, fermé quand la dernière source qui l'a demandé a fini.
// Il est à part de `open` (celui de la cible elle-même) : si la cible bouge aussi, les deux clips se recouvrent et la fusion les réunit. Les segments sont toujours enregistrés,
// le clip se fait donc comme pour un mouvement. Un événement lié n'en déclenche jamais un autre (il ne passe pas par le détecteur).
const linkedOpen = new Map<string, { id: string; sources: Set<string> }>()
// L'interrupteur de House Sync, par caméra source : éteint tant qu'il n'a rien dit (il répète son état chaque minute).
const linkOn = new Map<string, boolean>()
const openLinked = (source: string, at: number) => {
  if (linkOn.get(source) !== true) return
  for (const link of config.links.filter((candidate) => candidate.source === source)) {
    const current = linkedOpen.get(link.target)
    if (current) {
      current.sources.add(source)
      continue
    }
    const record = store.open(link.target, at, false)
    linkedOpen.set(link.target, { id: record.id, sources: new Set([source]) })
    log(`${link.target} : événement ${record.id} lié à ${source}`)
  }
}
const closeLinked = (source: string, at: number) => {
  for (const link of config.links.filter((candidate) => candidate.source === source)) {
    const current = linkedOpen.get(link.target)
    if (!current?.sources.delete(source) || current.sources.size > 0) continue
    store.close(current.id, at)
    linkedOpen.delete(link.target)
    log(`${link.target} : fin de l’événement lié ${current.id}`)
  }
}
// Les contours du mouvement de chaque caméra sont notés image par image dans un journal (shapes.ts), dont on tire le fichier des contours de chaque clip.
const shapesDirOf = (camera: string) => `${config.recordingsDir}/${camera}/shapes`

// Les enregistrements lancés à la main (bouton « Enregistrer »), par caméra : un mouvement fictif de l'appui à l'arrêt. Au plus MAX_MANUAL_SECONDS (on oublie vite un enregistrement).
const MAX_MANUAL_SECONDS = 180
const manual = new Map<string, { id: string; startedAt: number }>()
const stopManual = (camera: string) => {
  const current = manual.get(camera)
  if (!current) return null
  const endedAt = Date.now() / 1000
  store.close(current.id, endedAt)
  manual.delete(camera)
  log(`${camera} : enregistrement manuel ${current.id} arrêté (${Math.round(endedAt - current.startedAt)} s)`)
  return { id: current.id, started_at: current.startedAt, ended_at: endedAt }
}
setInterval(() => {
  for (const [camera, current] of manual) if (Date.now() / 1000 - current.startedAt > MAX_MANUAL_SECONDS) stopManual(camera)
}, 5_000)

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
        // Le flux léger arrive `shapesDelaySeconds` après la vidéo : l'événement (la barre bleue de la frise) commence à l'instant où le mouvement apparaît dans la vidéo, comme le premier contour.
        const record = store.open(camera, event.at - config.shapesDelaySeconds, false, eyesSeen(camera).length > 0 ? 'eyes' : 'motion')
        open.set(camera, record.id)
        log(`${camera} : mouvement ${record.id}`)
        openLinked(camera, event.at - config.shapesDelaySeconds)
      } else {
        const id = open.get(camera)
        if (id) {
          store.close(id, event.startedAt - config.shapesDelaySeconds + event.durationSeconds)
          open.delete(camera)
          foliageStats.delete(camera)
          log(`${camera} : fin de mouvement ${id} (${event.durationSeconds.toFixed(1)} s)`)
          closeLinked(camera, event.startedAt - config.shapesDelaySeconds + event.durationSeconds)
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
        closeLinked(camera, Date.now() / 1000)
      }
    },
    () => zones.get(camera)?.mask ?? null,
    (hulls) => {
      // Chaque contour est découpé par la zone : rien n'est montré hors de ce qui est surveillé.
      const zone = zones.get(camera)?.points ?? null
      const clipped = hulls.map((hull) => clipToZone(hull, zone)).filter((shape): shape is Point[] => shape !== null)
      // Les cadres des yeux vus à l'instant s'ajoutent aux contours : la vidéo les montre comme le mouvement.
      appendShapes(shapesDirOf(camera), Date.now() / 1000, [...clipped.slice(0, MAX_SHAPES), ...eyesSeen(camera)])
      // Le feuillage : on compte les zones de chaque image en mouvement de l'événement ouvert.
      const id = open.get(camera)
      const threshold = foliageZones.get(camera) ?? 0
      if (threshold > 0 && clipped.length > 0) {
        const now = Date.now() / 1000
        let stats = foliageStats.get(camera)
        if (!stats || now - stats.lastAt > FOLIAGE_GAP_SECONDS) {
          stats = { frames: 0, leafy: 0, lastAt: now }
          foliageStats.set(camera, stats)
        }
        stats.lastAt = now
        stats.frames += 1
        if (clipped.length >= threshold) stats.leafy += 1
        // Les yeux l'emportent : un événement `eyes` reste violet (setLabel ne change que `motion`).
        if (id && stats.frames >= FOLIAGE_MIN_FRAMES && stats.leafy / stats.frames >= FOLIAGE_SHARE) store.setLabel(id, 'foliage', 'motion')
      }
    },
    () => eyesSeen(camera).length > 0,
  )
  void watchEyes(
    `${config.go2rtcRtsp}/${camera}_main`,
    { width: EYES_WIDTH, height: EYES_HEIGHT },
    // Pas de recherche tant que la zone n'est pas connue (reprise du fichier ou envoi de House Sync) : sinon des reflets hors zone seraient pris pour des yeux.
    () => eyesOn.get(camera) === true && zones.has(camera),
    () => eyesMasks.get(camera) ?? null,
    (boxes) => {
      if (boxes.length === 0) return
      lastEyes.set(camera, { at: Date.now() / 1000, boxes })
      // Un événement où des yeux sont vus prend l'étiquette `eyes` : la frise le montre en violet.
      const id = open.get(camera)
      if (id) store.setLabel(id, 'eyes')
      log(`${camera} : ${boxes.length} reflet(s) d’yeux`)
    },
    (m) => log(`${camera} : ${m}`),
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
      if (current && JSON.stringify(current.points) === JSON.stringify(points)) return
      zones.set(camera, { points, mask: points ? polygonMask(points, config.width, config.height) : null })
      eyesMasks.set(camera, points ? polygonMask(points, EYES_WIDTH, EYES_HEIGHT) : null)
      log(`${camera} : zone surveillée ${points ? `${points.length} sommets` : 'toute l’image'}`)
      saveDetectionState()
    },
    setFoliage: (camera, zones) => {
      if ((foliageZones.get(camera) ?? 0) === zones) return
      log(`${camera} : feuillage à partir de ${zones} zones${zones === 0 ? ' (coupé)' : ''}`)
      foliageZones.set(camera, zones)
      saveDetectionState()
    },
    setLink: (camera, enabled) => {
      if (linkOn.get(camera) !== enabled) log(`${camera} : clip sur la caméra liée ${enabled ? 'allumé' : 'éteint'}`)
      linkOn.set(camera, enabled)
    },
    setEyes: (camera, enabled) => {
      if (eyesOn.get(camera) !== enabled) log(`${camera} : recherche des yeux ${enabled ? 'allumée' : 'éteinte'}`)
      eyesOn.set(camera, enabled)
      if (!enabled) lastEyes.delete(camera)
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
      // Seuls l'écart de gris et la surface changent : la durée minimale du mouvement est réglée à part.
      seuils.pixelThreshold = next.pixelThreshold
      seuils.areaThreshold = next.areaThreshold
      if (sensitivities.get(camera) !== level) {
        sensitivities.set(camera, level)
        saveDetectionState()
      }
    },
    setMinSeconds: (camera, seconds) => {
      const seuils = detectors.get(camera)
      if (!seuils || seuils.minSeconds === seconds) return
      log(`${camera} : un mouvement doit durer ${seconds} s pour compter`)
      seuils.minSeconds = seconds
      saveDetectionState()
    },
  },
  {
    status: (camera) => {
      const current = manual.get(camera)
      return { recording: current !== undefined, id: current?.id ?? null, started_at: current?.startedAt ?? null }
    },
    start: (camera) => {
      const current = manual.get(camera)
      if (current) return { id: current.id, started_at: current.startedAt }
      const startedAt = Date.now() / 1000
      const record = store.open(camera, startedAt, true)
      manual.set(camera, { id: record.id, startedAt })
      log(`${camera} : enregistrement manuel ${record.id}`)
      return { id: record.id, started_at: startedAt }
    },
    stop: stopManual,
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
        // Les contours du mouvement du clip, calés sur son début ; absents si le journal n'en a pas (clip manuel, clip d'avant).
        try {
          const done = buildShapesClip({
            dir: shapesDirOf(record.camera),
            output: shapesClipPath(`${config.clipsDir}/${record.id}.mp4`),
            from: built.start,
            to: record.end_time + config.postSeconds,
            delay: config.shapesDelaySeconds,
          })
          if (done) store.markShapes(record.id)
        } catch (error) {
          log(`${record.camera} : contours du clip ${record.id} impossibles : ${error instanceof Error ? error.message : String(error)}`)
        }
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
      rmSync(shapesClipPath(`${config.clipsDir}/${id}.mp4`), { force: true })
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
  for (const camera of config.cameras) pruneShapes(shapesDirOf(camera), before)
  for (const record of store.prune(before)) {
    try {
      unlinkSync(`${config.clipsDir}/${record.id}.mp4`)
    } catch {
      // pas de clip : rien à effacer
    }
    rmSync(webClipPath(`${config.clipsDir}/${record.id}.mp4`), { force: true })
    rmSync(audioClipPath(`${config.clipsDir}/${record.id}.mp4`), { force: true })
    rmSync(shapesClipPath(`${config.clipsDir}/${record.id}.mp4`), { force: true })
  }
}, PRUNE_MS)

log(`Enregistreur : ${config.cameras.join(', ')} (segments de ${config.segmentSeconds} s, ${config.retentionSeconds / 3600} h gardées)`)
if (config.audioCameras.length > 0)
  log(
    `Son des clips : ${config.audioCameras.join(', ')} (petits fichiers de ${config.audioSegmentSeconds} s gardés comme les segments, un son par clip de mouvement)`,
  )
