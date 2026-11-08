// shutters : les volets roulants. GET /shutters rend {mock, shutters: [{id, name, lastCommand, lastAt, auto}]} (`auto` : null si le volet n'a pas d'action automatique,
// sinon {open, close} : ouvrir au lever du soleil, fermer à son coucher, chacune activée ou non) ; POST /shutters/<id> avec {"command": "up" | "down" | "stop"} envoie l'ordre
// (404 si le volet n'existe pas, 400 si l'ordre est inconnu, 502 si l'ESP32 ne répond pas) et rend le volet à jour ; PUT /shutters/<id>/auto avec {"open": true|false}
// et/ou {"close": true|false} active ou coupe l'une ou l'autre option (une option absente garde sa valeur ; 404 si le volet n'en a pas, 400 si le corps est faux).
// Sans volets configurés (SHUTTERS vide), le service répond 503.
import express, { Router } from 'express'
import { SHUTTER_COMMANDS, type ShutterCommand } from '../lib/shutterDriver.ts'
import type { ShuttersAuto } from '../services/shuttersAutoService.ts'
import { UnknownShutter, type ShuttersService } from '../services/shuttersService.ts'

export const shuttersRouter = (shutters: ShuttersService | null, auto: ShuttersAuto | null = null): Router => {
  const router = Router()
  router.get('/shutters', (_req, res) => {
    if (!shutters) return void res.status(503).json({ error: 'shutters not configured' })
    const state = shutters.state()
    const enabled = auto?.state() ?? {}
    res.json({ ...state, shutters: state.shutters.map((shutter) => ({ ...shutter, auto: shutter.id in enabled ? enabled[shutter.id] : null })) })
  })
  router.post('/shutters/:id', express.json({ limit: '1kb' }), async (req, res) => {
    if (!shutters) return void res.status(503).json({ error: 'shutters not configured' })
    const command = (req.body as { command?: unknown } | undefined)?.command
    if (typeof command !== 'string' || !SHUTTER_COMMANDS.includes(command as ShutterCommand)) {
      return void res.status(400).json({ error: `command must be one of: ${SHUTTER_COMMANDS.join(', ')}` })
    }
    try {
      const shutter = await shutters.command(req.params.id, command as ShutterCommand)
      const enabled = auto?.state() ?? {}
      res.json({ ...shutter, auto: shutter.id in enabled ? enabled[shutter.id] : null })
    } catch (error) {
      if (error instanceof UnknownShutter) return void res.status(404).json({ error: 'unknown shutter' })
      res.status(502).json({ error: 'shutter driver unreachable' })
    }
  })
  router.put('/shutters/:id/auto', express.json({ limit: '1kb' }), (req, res) => {
    if (!shutters || !auto) return void res.status(503).json({ error: 'shutters not configured' })
    const { open, close } = (req.body ?? {}) as { open?: unknown; close?: unknown }
    const valid = (value: unknown): value is boolean | undefined => value === undefined || typeof value === 'boolean'
    if (!valid(open) || !valid(close) || (open === undefined && close === undefined)) {
      return void res.status(400).json({ error: 'body must be {"open": true|false} and/or {"close": true|false}' })
    }
    if (!auto.setOptions(req.params.id, { open, close })) return void res.status(404).json({ error: 'this shutter has no automatic action' })
    res.json({ id: req.params.id, auto: auto.state()[req.params.id] })
  })
  return router
}
