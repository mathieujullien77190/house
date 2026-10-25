// L'enregistreur de la maison : à la place de Frigate. Pour chaque caméra, trois choses :
//   1. il enregistre le flux principal par segments (copie sans transcodage, gardés quelques heures) ;
//   2. il surveille le flux léger et ouvre un événement au début d'un mouvement, le ferme à sa fin ;
//   3. quand un événement est fini et que ses segments sont écrits, il en fait un clip MP4.
// Une petite API (server.ts) rend tout cela à House Sync, sous la forme que Frigate offrait.
import { mkdirSync, unlinkSync } from 'node:fs'
import { buildClip } from './clips.ts'
import { loadConfig } from './config.ts'
import { createEventStore } from './events.ts'
import { pruneSegments, recordSegments } from './segments.ts'
import { startServer } from './server.ts'
import { watchMotion } from './watcher.ts'

const config = loadConfig()
const store = createEventStore(config.stateFile)
const log = (message: string) => console.log(`${new Date().toISOString()} ${message}`)

const TICK_MS = 5_000
const PRUNE_MS = 60_000
// Un segment dure `segmentSeconds` et n'est complet que quand le suivant commence : on attend un peu de plus.
const SETTLE_SECONDS = config.segmentSeconds + 3

// Les ouvertures d'événements, par caméra (un seul événement ouvert à la fois par caméra).
const open = new Map<string, string>()

for (const camera of config.cameras) {
  mkdirSync(`${config.recordingsDir}/${camera}`, { recursive: true })
  void recordSegments(`${config.go2rtcRtsp}/${camera}_main`, `${config.recordingsDir}/${camera}`, config.segmentSeconds, (m) => log(`${camera} : ${m}`))
  void watchMotion(
    `${config.go2rtcRtsp}/${camera}_sub`,
    config,
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
  )
}

startServer(config, store, log)

// Toutes les 5 s : les événements finis dont tous les segments sont écrits reçoivent leur clip.
setInterval(async () => {
  const now = Date.now() / 1000
  for (const record of store.withoutClip()) {
    if (record.end_time === null || now < record.end_time + config.postSeconds + SETTLE_SECONDS) continue
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
      }
    } catch (error) {
      log(`${record.camera} : clip ${record.id} impossible : ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}, TICK_MS)

// Chaque minute : on jette les segments, les événements et les clips plus vieux que la rétention.
setInterval(() => {
  const before = Date.now() / 1000 - config.retentionSeconds
  for (const camera of config.cameras) pruneSegments(`${config.recordingsDir}/${camera}`, before)
  for (const record of store.prune(before)) {
    try {
      unlinkSync(`${config.clipsDir}/${record.id}.mp4`)
    } catch {
      // pas de clip : rien à effacer
    }
  }
}, PRUNE_MS)

log(`Enregistreur : ${config.cameras.join(', ')} (segments de ${config.segmentSeconds} s, ${config.retentionSeconds / 3600} h gardées)`)
