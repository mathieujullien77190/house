// Les requêtes vers les enregistreurs (conteneurs motion) : réseau Docker interne, sans mot de passe, jamais publié, et la liste des caméras
// de chacun (adresse de la dernière image, du direct).
import { messageOf, type Context } from './context.ts'

export type RecorderConfig = { cameras: Record<string, { live?: { go2rtc?: string; streams?: Record<string, string> } }> }
export type RecorderEvent = {
  id: string
  merged_into?: string
  merged_at?: number
  camera: string
  label: string
  start_time: number
  end_time: number | null
  has_clip: boolean
  /** Lancé à la main (bouton « Enregistrer » de la WebApp) : son clip est toujours copié, quel que soit le réglage de la caméra. */
  manual?: boolean
}

// Une requête qui ne finit pas (une caméra éteinte laisse l'image en attente) est coupée : sans ça, elle figerait le tour entier.
export const REQUEST_TIMEOUT_MS = 15_000
export const CLIP_TIMEOUT_MS = 120_000

export const createRecorder = (ctx: Context) => {
  const { db, config } = ctx
  const upsertImage = db.prepare('INSERT INTO last_images (camera, url) VALUES (?, ?) ON CONFLICT(camera) DO UPDATE SET url = excluded.url')
  const upsertLive = db.prepare('INSERT INTO live_streams (camera, url) VALUES (?, ?) ON CONFLICT(camera) DO UPDATE SET url = excluded.url')

  const recorderAt = (base: string, path: string, timeoutMs = REQUEST_TIMEOUT_MS): Promise<Response> =>
    ctx.fetch(`${base}${path}`, { signal: AbortSignal.timeout(timeoutMs) })

  // Quel enregistreur gère quelle caméra : rempli à chaque tour par syncCameras, lu pour copier un clip ou une image.
  const recorderOf = new Map<string, string>()
  const recorder = (camera: string, path: string, timeoutMs = REQUEST_TIMEOUT_MS): Promise<Response> => {
    const base = recorderOf.get(camera)
    if (!base) return Promise.resolve(new Response(null, { status: 503 }))
    return recorderAt(base, path, timeoutMs)
  }

  // Pour chaque caméra de chaque enregistreur : l'adresse de sa dernière image et celle de la page du direct (le go2rtc
  // de son enregistreur), avec le premier flux « live » déclaré dans la configuration, ou le nom de la caméra à défaut.
  // Un enregistreur qui ne répond pas est signalé, sans empêcher les autres.
  const syncCameras = async (): Promise<Map<string, string[]>> => {
    const byRecorder = new Map<string, string[]>()
    for (const base of config.recorders) {
      try {
        const res = await recorderAt(base, '/api/config')
        if (!res.ok) throw new Error(`config : HTTP ${res.status}`)
        const recorderConfig = (await res.json()) as RecorderConfig
        const cameras: string[] = []
        for (const [camera, cam] of Object.entries(recorderConfig.cameras)) {
          if (!/^[\w-]+$/.test(camera)) continue
          const stream = Object.values(cam.live?.streams ?? {})[0] ?? camera
          const go2rtc = (cam.live?.go2rtc ?? base).replace(/\/$/, '')
          recorderOf.set(camera, base)
          upsertImage.run(camera, `${base}/api/${camera}/latest.jpg`)
          upsertLive.run(camera, `${go2rtc}/live?src=${stream}`)
          cameras.push(camera)
        }
        byRecorder.set(base, cameras)
      } catch (error) {
        ctx.log(`Enregistreur ${base} : ${messageOf(error)}`)
      }
    }
    return byRecorder
  }

  return { recorderAt, recorder, recorderOf, syncCameras }
}

export type Recorder = ReturnType<typeof createRecorder>
