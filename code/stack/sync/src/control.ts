// Ce que House Sync commande : la détection de mouvement, sa sensibilité, sa durée minimale et sa zone chez l'enregistreur, et la cadence des directs chez go2rtc.
import { seconds, type Context } from './context.ts'
import { REQUEST_TIMEOUT_MS } from './recorder.ts'
import { MAX_LIVE_FPS } from './settings.ts'
import { readZones } from './zones.ts'

// La détection de mouvement suit les clips : quand ceux d'une caméra ne sont pas gardés (jamais, ou hors de la nuit), l'enregistreur
// ne la surveille plus (un mouvement sans clip n'a pas d'intérêt, et le décodage du flux coûte du processeur). On le lui dit quand
// l'état change, et toutes les minutes au cas où il aurait redémarré (il allume la détection par défaut).
const DETECTION_REFRESH_SECONDS = 60
const LIVE_FPS_CHECK_SECONDS = 60

export const createControl = (ctx: Context) => {
  const { config, settings, db } = ctx
  const detectionSent = new Map<string, { enabled: boolean; at: number }>()
  // La sensibilité de la détection : envoyée de la même façon (quand elle change, et chaque minute au cas où l'enregistreur aurait redémarré).
  const sensitivitySent = new Map<string, { level: number; at: number }>()
  // La zone surveillée de chaque caméra (un polygone dessiné dans la WebApp, lu dans le fichier de l'API) : envoyée aussi quand elle change et chaque minute.
  // La durée minimale d'un mouvement : envoyée de la même façon.
  const minSecondsSent = new Map<string, { seconds: number; at: number }>()
  const zoneSent = new Map<string, { zone: string; at: number }>()
  // La recherche des yeux (la nuit, si le réglage est allumé et que la détection de la caméra tourne) : envoyée de la même façon.
  const eyesSent = new Map<string, { enabled: boolean; at: number }>()
  // Le seuil de zones du feuillage : envoyé de la même façon.
  const foliageSent = new Map<string, { zones: number; at: number }>()
  // Le clip lié (une caméra qui en déclenche une autre, LINKS de l'enregistreur) : envoyé de la même façon.
  const linkSent = new Map<string, { enabled: boolean; at: number }>()

  const syncDetection = async (base: string, cameras: string[]): Promise<void> => {
    const now = seconds(ctx)
    // null (fichier illisible) : on ne change rien, l'enregistreur garde sa zone.
    const zones = readZones(db)
    for (const camera of cameras) {
      const enabled = settings.keepsClip(camera, now)
      const sent = detectionSent.get(camera)
      if (!sent || sent.enabled !== enabled || now - sent.at >= DETECTION_REFRESH_SECONDS) {
        const res = await ctx.fetch(`${base}/api/cameras/${camera}/detection?enabled=${enabled ? 1 : 0}`, { method: 'PUT', signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) }).catch(() => null)
        if (res?.ok) detectionSent.set(camera, { enabled, at: now })
      }
      const eyes = enabled && settings.eyesDetectionEnabled(camera) && settings.eyesNight(now)
      const eyesAt = eyesSent.get(camera)
      if (!eyesAt || eyesAt.enabled !== eyes || now - eyesAt.at >= DETECTION_REFRESH_SECONDS) {
        const res = await ctx.fetch(`${base}/api/cameras/${camera}/eyes?enabled=${eyes ? 1 : 0}`, { method: 'PUT', signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) }).catch(() => null)
        if (res?.ok) {
          eyesSent.set(camera, { enabled: eyes, at: now })
          settings.saveEyesNow(camera, eyes)
        }
      }
      const link = settings.cameraSettings(camera).link_mode === 'on'
      const linkAt = linkSent.get(camera)
      if (!linkAt || linkAt.enabled !== link || now - linkAt.at >= DETECTION_REFRESH_SECONDS) {
        const res = await ctx.fetch(`${base}/api/cameras/${camera}/link?enabled=${link ? 1 : 0}`, { method: 'PUT', signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) }).catch(() => null)
        if (res?.ok) linkSent.set(camera, { enabled: link, at: now })
      }
      const foliageZones = settings.cameraSettings(camera).foliage_zones
      const foliageAt = foliageSent.get(camera)
      if (!foliageAt || foliageAt.zones !== foliageZones || now - foliageAt.at >= DETECTION_REFRESH_SECONDS) {
        const res = await ctx.fetch(`${base}/api/cameras/${camera}/foliage?zones=${foliageZones}`, { method: 'PUT', signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) }).catch(() => null)
        if (res?.ok) foliageSent.set(camera, { zones: foliageZones, at: now })
      }
      const level = settings.cameraSettings(camera).motion_sensitivity
      const levelSent = sensitivitySent.get(camera)
      if (!levelSent || levelSent.level !== level || now - levelSent.at >= DETECTION_REFRESH_SECONDS) {
        const res = await ctx.fetch(`${base}/api/cameras/${camera}/sensitivity?level=${level}`, { method: 'PUT', signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) }).catch(() => null)
        if (res?.ok) sensitivitySent.set(camera, { level, at: now })
      }
      const minSeconds = settings.cameraSettings(camera).motion_min_seconds
      const minSent = minSecondsSent.get(camera)
      if (!minSent || minSent.seconds !== minSeconds || now - minSent.at >= DETECTION_REFRESH_SECONDS) {
        const res = await ctx.fetch(`${base}/api/cameras/${camera}/min-seconds?seconds=${minSeconds}`, { method: 'PUT', signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) }).catch(() => null)
        if (res?.ok) minSecondsSent.set(camera, { seconds: minSeconds, at: now })
      }
      if (zones) {
        const points = zones[camera] ?? null
        const zone = JSON.stringify(points)
        const zoneAt = zoneSent.get(camera)
        if (!zoneAt || zoneAt.zone !== zone || now - zoneAt.at >= DETECTION_REFRESH_SECONDS) {
          const res = await ctx.fetch(`${base}/api/cameras/${camera}/zone`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ points }),
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          }).catch(() => null)
          if (res?.ok) zoneSent.set(camera, { zone, at: now })
        }
      }
    }
  }

  // La cadence du direct 4K de chaque caméra : go2rtc fabrique <nom>_main_mjpeg avec ffmpeg:<nom>_main#video=mjpegN (modèles de
  // go2rtc.yaml). On lui change la source à chaud (PATCH, en mémoire) quand le curseur bouge, et on vérifie chaque minute qu'elle est
  // bonne (go2rtc qui redémarre revient à 25 images par seconde). Changer la source coupe le direct 4K en cours : il reprend seul.
  const liveFpsCheckedAt = new Map<string, number>()
  const syncLiveFps = async (cameras: string[]): Promise<void> => {
    const now = seconds(ctx)
    const group = cameras.join(',')
    if (now - (liveFpsCheckedAt.get(group) ?? 0) < LIVE_FPS_CHECK_SECONDS) return
    liveFpsCheckedAt.set(group, now)
    for (const camera of cameras) {
      const camSettings = settings.cameraSettings(camera)
      for (const { name, source, fps: wanted, label } of [
        { name: `${camera}_main_mjpeg`, source: `${camera}_main`, fps: camSettings.live_fps, label: 'Direct 4K' },
        { name: `${camera}_sub_mjpeg`, source: `${camera}_sub`, fps: camSettings.light_fps, label: 'Direct léger' },
        // Les flux des écrans de moins de 1024 px : « _m » (voir go2rtc.yaml).
        { name: `${camera}_main_mjpeg_m`, source: `${camera}_main`, fps: camSettings.live_fps_mobile, label: 'Direct 4K (téléphone)' },
        { name: `${camera}_sub_mjpeg_m`, source: `${camera}_sub`, fps: camSettings.light_fps_mobile, label: 'Direct léger (téléphone)' },
        // Les flux de la page invité : une seule cadence pour tous (PC et téléphone), voir plus bas.
        { name: `${camera}_guest_main_mjpeg`, source: `${camera}_main`, fps: camSettings.guest_fps, label: 'Page invité 4K' },
        { name: `${camera}_guest_sub_mjpeg`, source: `${camera}_sub`, fps: camSettings.guest_fps, label: 'Page invité léger' },
      ]) {
        try {
          const info = await ctx.fetch(`${config.go2rtcUrl}/api/streams?src=${name}`, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
          if (!info.ok) continue
          const current = /video(?:=|%3D)mjpeg(\d+)/.exec(await info.text())
          if (Number(current?.[1] ?? MAX_LIVE_FPS) === wanted) continue
          const video = wanted >= MAX_LIVE_FPS ? 'mjpeg' : `mjpeg${wanted}`
          const res = await ctx.fetch(`${config.go2rtcUrl}/api/streams?name=${name}&src=${encodeURIComponent(`ffmpeg:${source}#video=${video}`)}`, { method: 'PATCH', signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
          ctx.log(`${label} de ${camera} : ${wanted} images/s (go2rtc : HTTP ${res.status})`)
          if (!res.ok) liveFpsCheckedAt.delete(group)
        } catch {
          // go2rtc ne répond pas : on réessaie au prochain tour.
        }
      }
    }
  }

  return { syncDetection, syncLiveFps, resetLiveFpsCheck: (): void => liveFpsCheckedAt.clear() }
}

export type Control = ReturnType<typeof createControl>
