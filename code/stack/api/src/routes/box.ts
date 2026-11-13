// box : la Freebox. GET /box rend {configured, reachable, model, firmware, uptime, connection: {state, type, ipv4, rateDown, rateUp}, wifi: {enabled}, devices: [{name, ip, mac, active, staticLease, home, type, vendor}]}
// (appareils actifs d'abord, triés par nom). Sans FREEBOX_APP_TOKEN : 200 avec `configured: false`. PUT /box/wifi avec {"enabled": true|false} allume ou coupe le WiFi de la box
// (503 non configurée, 400 corps faux, 502 box muette ou droit refusé).
// GET /box/guests?limit= (1 à 500, 100 par défaut) rend {filterState, guests: [{mac, name, ip, type, vendor, firstSeen, lastSeen, active, excluded}], events} : les invités (tout appareil hors de la maison) et leurs dernières connexions, la plus récente d'abord.
// GET /box/known rend {home: [{mac, name, ip}]} ; DELETE /box/known/{mac} retire un appareil de la maison (il devient un invité ; 404 s'il n'y était pas) ; PUT /box/known {"mac"} ajoute un appareil à la maison (fichier de l'API ; 400 MAC fausse, 503 liste de départ pas encore prise).
// PUT /box/guests/{mac}/exclude {"excluded": bool} exclut ou réadmet un invité du WiFi (filtrage MAC de la box ; 400 MAC fausse ou de la maison, 404 pas un invité, 409 box en liste blanche, 502 box muette ou droit refusé).
import express, { Router } from 'express'
import { normalizeMac } from '../lib/boxKnownStore.ts'
import { FreeboxError } from '../lib/freebox.ts'
import { NOT_CONFIGURED, WhitelistMode, type BoxService } from '../services/boxService.ts'
import type { BoxWatcher } from '../services/boxWatcher.ts'

const DEFAULT_LIMIT = 100
const MAX_LIMIT = 500

export const boxRouter = (box: BoxService | null, watcher: BoxWatcher | null = null): Router => {
  const router = Router()
  router.get('/box', async (_req, res) => {
    if (!box) return void res.json(NOT_CONFIGURED)
    const state = await box.state()
    // `home` : l'appareil fait partie de la maison (la liste de départ et ceux qu'on y a ajoutés) ; faux : c'est un invité. Absent tant que la liste n'est pas prise.
    const home = watcher && watcher.homeList().length > 0 ? new Set(watcher.homeList().map((device) => device.mac)) : null
    res.json(home ? { ...state, devices: state.devices.map((device) => ({ ...device, home: home.has(device.mac.toUpperCase()) })) } : state)
  })
  // Le mot de passe du WiFi invité : à part de GET /box (relu toutes les 12 s), lu seulement quand l'utilisateur le demande.
  router.get('/box/guest-wifi', async (_req, res) => {
    if (!box) return void res.status(503).json({ error: 'box not configured' })
    try {
      const guest = await box.guestWifi()
      if (!guest) return void res.status(404).json({ error: 'no guest wifi key' })
      res.set('Cache-Control', 'no-store').json(guest)
    } catch (error) {
      res.status(502).json({ error: error instanceof FreeboxError ? `box: ${error.message}` : 'box unreachable' })
    }
  })
  router.get('/box/guests', async (req, res) => {
    if (!watcher) return void res.status(503).json({ error: 'box not configured' })
    const raw = req.query.limit
    const limit = raw === undefined ? DEFAULT_LIMIT : Number(raw)
    if (raw !== undefined && (typeof raw !== 'string' || !/^[0-9]+$/.test(raw) || limit < 1 || limit > MAX_LIMIT)) {
      return void res.status(400).json({ error: `limit must be an integer from 1 to ${MAX_LIMIT}` })
    }
    // Le filtrage MAC du WiFi (lecture) : `excluded` est null quand la box ne répond pas.
    const filter = box ? await box.macFilter().catch(() => null) : null
    const guests = watcher.guestList().map((guest) => ({ ...guest, excluded: filter ? filter.entries.some((entry) => entry.mac === guest.mac && entry.type === 'blacklist') : null }))
    res.json({ filterState: filter?.state ?? null, guests, events: watcher.recent(limit) })
  })
  router.put('/box/guests/:mac/exclude', express.json({ limit: '1kb' }), async (req, res) => {
    if (!box || !watcher) return void res.status(503).json({ error: 'box not configured' })
    const mac = normalizeMac(req.params.mac)
    const excluded = (req.body as { excluded?: unknown } | undefined)?.excluded
    if (!mac) return void res.status(400).json({ error: 'invalid mac' })
    if (typeof excluded !== 'boolean') return void res.status(400).json({ error: 'body must be {"excluded": true|false}' })
    // La maison (dont le mini PC et la box) ne s'exclut jamais.
    if (watcher.homeList().some((device) => device.mac === mac)) return void res.status(400).json({ error: 'device belongs to the house' })
    if (!watcher.guestList().some((guest) => guest.mac === mac)) return void res.status(404).json({ error: 'unknown guest' })
    try {
      res.json(await box.setExcluded(mac, excluded))
    } catch (error) {
      if (error instanceof WhitelistMode) return void res.status(409).json({ error: 'la box est en liste blanche' })
      const refused = error instanceof FreeboxError && (error.code === 'insufficient_rights' || error.status === 403)
      res.status(502).json({ error: refused ? 'box: le droit « Modification des réglages » est requis pour l’application House' : error instanceof FreeboxError ? `box: ${error.message}` : 'box unreachable' })
    }
  })
  router.get('/box/known', (_req, res) => {
    if (!watcher) return void res.status(503).json({ error: 'box not configured' })
    res.json({ home: watcher.homeList() })
  })
  router.put('/box/known', express.json({ limit: '1kb' }), (req, res) => {
    if (!watcher) return void res.status(503).json({ error: 'box not configured' })
    const result = watcher.addToHome((req.body as { mac?: unknown } | undefined)?.mac)
    if (result === 'invalid') return void res.status(400).json({ error: 'body must be {"mac": "AA:BB:CC:DD:EE:FF"}' })
    if (result === 'not-ready') return void res.status(503).json({ error: 'house list not created yet' })
    res.json(result)
  })
  router.delete('/box/known/:mac', (req, res) => {
    if (!watcher) return void res.status(503).json({ error: 'box not configured' })
    const result = watcher.removeFromHome(req.params.mac)
    if (result === 'invalid') return void res.status(400).json({ error: 'invalid mac' })
    if (result === 'not-ready') return void res.status(503).json({ error: 'house list not created yet' })
    if (result === 'absent') return void res.status(404).json({ error: 'device is not in the house list' })
    res.json({ home: watcher.homeList() })
  })
  router.put('/box/wifi', express.json({ limit: '1kb' }), async (req, res) => {
    if (!box) return void res.status(503).json({ error: 'box not configured' })
    const enabled = (req.body as { enabled?: unknown } | undefined)?.enabled
    if (typeof enabled !== 'boolean') return void res.status(400).json({ error: 'body must be {"enabled": true|false}' })
    try {
      res.json(await box.setWifi(enabled))
    } catch (error) {
      res.status(502).json({ error: error instanceof FreeboxError ? `box: ${error.message}` : 'box unreachable' })
    }
  })
  return router
}
