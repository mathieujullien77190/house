// lan : la page invité du réseau (`/chezmatou` de la WebApp) : les deux caméras de la volière, les volets, les lampes et les climatisations, pour qui est sur le réseau de la maison ET connaît la clé de la page (LAN_KEY).
// Chaque route passe par la garde (`middleware/lanGuard.ts` : réseau local puis clé `X-Lan-Key`, ou jeton court `?t=` pour les images) puis par l'interrupteur de ce qu'elle touche (le document `lan-access`, relu à chaque demande) :
// coupé, 403 {"error":"désactivé"}. Ces routes n'écrivent jamais dans la base.
//  - GET /lan/state : {access: {cameras, shutters, lights, ac}, cameras (id, name, orientation), shutters, lights, ac} (une partie coupée : null).
//  - GET /lan/token : {token, expiresIn} : le jeton de 60 s des images ; GET /lan/stream/:camera (MJPEG léger) et GET /lan/frame/:camera (image) avec `?t=<jeton>`, seulement voliere-interieur et voliere-exterieur ; `/lan/stream/:camera?quality=hd` : le direct 4K (la vue agrandie), un seul à la fois (le nouveau coupe l'ancien).
//  - POST /lan/shutters/:id {command: up|down|stop} ; PUT /lan/lights/:id {on: true|false} (allumer = puissance max) ; POST /lan/ac/:id {on, mode, temperature, fan} (pas d'ailettes).
import express, { Router, type RequestHandler, type Response } from 'express'
import type { DocStore } from '../lib/docStore.ts'
import { readLanAccess, type LanAccess, type LanCapability } from '../lib/lanAccess.ts'
import { createLanTokens, TOKEN_SECONDS } from '../lib/lanToken.ts'
import { SHUTTER_COMMANDS, type ShutterCommand } from '../lib/shutterDriver.ts'
import { createLanGuard } from '../middleware/lanGuard.ts'
import type { AcService } from '../services/acService.ts'
import type { CamerasService } from '../services/camerasService.ts'
import { UnknownAcUnit } from '../services/acService.ts'
import type { HueService } from '../services/hueService.ts'
import { UnknownHueId } from '../services/hueService.ts'
import type { LiveService } from '../services/liveService.ts'
import type { ShuttersService } from '../services/shuttersService.ts'
import { UnknownShutter } from '../services/shuttersService.ts'
import { relay } from './live.ts'
import { toPatch } from './ac.ts'

/** Les deux seules caméras de la page du réseau (les perruches). */
export const LAN_CAMERAS: readonly { id: string; name: string }[] = [
  { id: 'voliere-interieur', name: 'Volière, intérieur' },
  { id: 'voliere-exterieur', name: 'Volière, extérieur' },
]

/** Les deux caméras avec leur orientation (paysage ou portrait, réglée dans House Sync) : en portrait, la page tourne l'image d'un quart de tour comme la WebApp. Lecture seule. */
const lanCameras = (cameras: CamerasService | undefined) => {
  let rows: { camera: string; orientation?: string }[] = []
  try {
    rows = cameras?.liveStreams() ?? []
  } catch {
    rows = []
  }
  return LAN_CAMERAS.map(({ id, name }) => ({ id, name, orientation: rows.find((row) => row.camera === id)?.orientation === 'portrait' ? 'portrait' : 'landscape' }))
}

/** Les lampes que la page du réseau ne montre pas (identifiants du pont) : la lampe des perruches (« Perruche », 26, la zone « Volière »). Absentes de `/lan/state` ; la route de commande ne les refuse PAS (blocage côté page seulement). */
export const LAN_EXCLUDED_LIGHTS: readonly string[] = ['26']

/** Les pièces du pont sans les lampes exclues. */
const withoutExcluded = <T extends { lights: { id: string }[] }>(rooms: T[]): T[] => rooms.map((room) => ({ ...room, lights: room.lights.filter((light) => !LAN_EXCLUDED_LIGHTS.includes(light.id)) }))

/** Le seul réglage d'une lampe : allumer à pleine puissance ou éteindre (la même puissance max que la WebApp). */
const MAX_BRI = 254

/** Les seuls modes qu'on peut choisir sur la page : chaud et froid (pas sec, ventilation ni auto). */

/** Les réglages d'une clim que la page permet : pas les ailettes. */
const AC_KEYS = ['on', 'mode', 'temperature', 'fan']

export interface LanDeps {
  /** La clé de la page (LAN_KEY) ; absente ou trop courte : toutes les routes répondent 503. */
  key: string
  /** Les préfixes IPv6 (/64) du réseau de la maison, en plus des adresses privées et de lien local. */
  prefixes: string[]
  /** Le nom d'hôte (LAN_HOST) et le port de l'adresse de la page, que `/guest-lan/link` donne à l'onglet « Page invité » de la WebApp. */
  host: string
  port: number
  /** Le document `lan-access` de `house_state`. */
  doc: DocStore
}

export interface LanServices {
  hue: HueService | null
  shutters: ShuttersService | null
  ac: AcService | null
  live: LiveService
  /** Les orientations des caméras (réglées dans House Sync, lues comme `/direct`) ; sans lui, tout est en paysage. */
  cameras?: CamerasService
}

export const lanRouter = (services: LanServices, deps: LanDeps): Router => {
  const router = Router()
  const tokens = createLanTokens(deps.key)
  const guard = createLanGuard({ key: deps.key, prefixes: deps.prefixes, tokens })
  const access = (): LanAccess => readLanAccess(deps.doc)
  /** L'interrupteur général puis celui de la fonction : relus à chaque demande, jamais gardés. */
  const allow =
    (capability: LanCapability | null): RequestHandler =>
    (_req, res, next) => {
      const current = access()
      if (!current.enabled || (capability !== null && !current[capability])) return void res.status(403).json({ error: 'désactivé' })
      next()
    }

  router.get('/lan/state', guard(), allow(null), async (_req, res) => {
    const current = access()
    const part = async <S, T>(source: S | null, read: (source: S) => Promise<T> | T): Promise<T | null> => {
      if (source === null) return null
      try {
        return await read(source)
      } catch {
        return null
      }
    }
    res.json({
      access: { cameras: current.cameras, shutters: current.shutters, lights: current.lights, ac: current.ac },
      cameras: current.cameras ? lanCameras(services.cameras) : null,
      shutters: await part(current.shutters ? services.shutters : null, (shutters) => shutters.state().shutters.map(({ id, name, lastCommand }) => ({ id, name, lastCommand }))),
      lights: await part(current.lights ? services.hue : null, async (hue) => withoutExcluded((await hue.list()) ?? [])),
      ac: await part(current.ac ? services.ac : null, async (ac) =>
        ((await ac.state()) ?? []).map(({ id, name, reachable, power, mode, targetTemp, roomTemp, fan }) => ({ id, name, reachable, power, mode, targetTemp, roomTemp, fan })),
      ),
    })
  })

  router.get('/lan/token', guard(), allow('cameras'), (_req, res) => {
    res.setHeader('Cache-Control', 'no-store')
    res.json({ token: tokens.issue(), expiresIn: TOKEN_SECONDS })
  })

  // Un seul direct 4K à la fois sur cette page (pour ne pas saturer le mini PC) : un nouveau flux 4K coupe l'ancien.
  let hdOpen: Response | null = null
  const camera = (open: 'stream' | 'frame'): RequestHandler[] => [
    guard(true),
    allow('cameras'),
    (req, res) => {
      const id = String(req.params.camera)
      if (!LAN_CAMERAS.some((found) => found.id === id)) return void res.status(404).json({ error: 'caméra inconnue' })
      // `quality=hd` : seulement le flux (pas l'image fixe), et seulement pour ces deux caméras (déjà filtrées ci-dessus) ; toute autre valeur vaut `light`.
      const hd = open === 'stream' && req.query.quality === 'hd'
      if (hd) {
        hdOpen?.destroy()
        hdOpen = res
        res.on('close', () => {
          if (hdOpen === res) hdOpen = null
        })
      }
      // Le direct est celui de la page invité (même cadence réglée dans House Sync) ; l'image fixe reste celle du flux léger.
      const opener = open === 'stream' ? (name: string, signal: AbortSignal, quality: boolean) => services.live.stream(name, signal, quality, false, true) : services.live.frame
      return void relay(req, res, opener, { camera: id, hd })
    },
  ]
  router.get('/lan/stream/:camera', ...camera('stream'))
  router.get('/lan/frame/:camera', ...camera('frame'))

  router.post('/lan/shutters/:id', guard(), allow('shutters'), express.json({ limit: '1kb' }), async (req, res) => {
    if (!services.shutters) return void res.status(503).json({ error: 'volets non configurés' })
    const command = (req.body as { command?: unknown } | undefined)?.command
    if (typeof command !== 'string' || !SHUTTER_COMMANDS.includes(command as ShutterCommand)) {
      return void res.status(400).json({ error: `command doit valoir : ${SHUTTER_COMMANDS.join(', ')}` })
    }
    try {
      const { id, name, lastCommand } = await services.shutters.command(String(req.params.id), command as ShutterCommand)
      res.json({ id, name, lastCommand })
    } catch (error) {
      if (error instanceof UnknownShutter) return void res.status(404).json({ error: 'volet inconnu' })
      res.status(502).json({ error: 'le volet ne répond pas' })
    }
  })

  router.put('/lan/lights/:id', guard(), allow('lights'), express.json({ limit: '1kb' }), async (req, res) => {
    if (!services.hue) return void res.status(503).json({ error: 'pont Hue non configuré' })
    const body = req.body as { on?: unknown } | undefined
    if (typeof body?.on !== 'boolean' || Object.keys(body).length !== 1) return void res.status(400).json({ error: 'le corps doit être {"on": true|false}' })
    try {
      res.json(await services.hue.setLight(String(req.params.id), body.on ? { on: true, bri: MAX_BRI } : { on: false }))
    } catch (error) {
      if (error instanceof UnknownHueId) return void res.status(404).json({ error: 'lampe inconnue' })
      res.status(502).json({ error: 'le pont ne répond pas' })
    }
  })

  router.post('/lan/ac/:id', guard(), allow('ac'), express.json({ limit: '1kb' }), async (req, res) => {
    if (!services.ac) return void res.status(503).json({ error: 'clim non configurée' })
    const body = (req.body ?? {}) as Record<string, unknown>
    const patch = Object.keys(body).every((key) => AC_KEYS.includes(key)) ? toPatch(body) : null
    if (!patch) return void res.status(400).json({ error: 'le corps doit être {"on", "mode", "temperature" et/ou "fan"}' })
    try {
      res.json(await services.ac.update(String(req.params.id), patch))
    } catch (error) {
      if (error instanceof UnknownAcUnit) return void res.status(404).json({ error: 'unité inconnue' })
      res.status(502).json({ error: 'la clim ne répond pas' })
    }
  })
  return router
}
