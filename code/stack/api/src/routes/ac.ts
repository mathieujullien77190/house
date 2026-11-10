// ac : les climatisations Mitsubishi. GET /ac rend {units: [{id, name, reachable, power, mode, targetTemp, roomTemp, fan, vane, wideVane}]} (une unité qui ne répond pas :
// reachable faux, le reste vide) ; POST /ac/<id> change un ou plusieurs réglages, les autres ne bougent pas : {"on": true|false}, {"mode": "heat"|"cool"|"dry"|"fan"|"auto"},
// {"temperature": 16 à 31 par pas de 0,5}, {"fan": "auto"|"quiet"|"1"|"2"|"3"|"4"}, {"vane": "auto"|"1"…"5"|"swing"} (l'ailette haut / bas) et {"wideVane": "left"|"left-center"|"center"|"right-center"|"right"|"swing"} (l'ailette gauche / droite). Rend l'unité (l'état d'avant avec le changement appliqué : la lecture suivante le confirme).
// 404 si l'unité n'existe pas, 400 si le corps est vide ou faux, 502 si le module ne répond pas. Sans unité configurée (AC_UNITS vide), 503.
import express, { Router } from 'express'
import { AC_MODES, FAN_SPEEDS, MAX_TEMPERATURE, MIN_TEMPERATURE, VANE_POSITIONS, WIDE_VANE_POSITIONS, type AcMode, type AcPatch } from '../lib/mitsubishiClient.ts'
import { UnknownAcUnit, type AcService } from '../services/acService.ts'

const BODY_ERROR = `body must be {"on": true|false}, {"mode": ${AC_MODES.join('|')}}, {"temperature": ${MIN_TEMPERATURE} to ${MAX_TEMPERATURE} by 0.5} {"fan": ${FAN_SPEEDS.join('|')}} {"vane": ${VANE_POSITIONS.join('|')}} and/or {"wideVane": ${WIDE_VANE_POSITIONS.join('|')}}`

/** Le corps de la requête en changement, ou null s'il est vide ou faux (champ inconnu, valeur hors plage). */
const toPatch = (body: Record<string, unknown>): AcPatch | null => {
  const patch: AcPatch = {}
  for (const [key, value] of Object.entries(body)) {
    if (key === 'on' && typeof value === 'boolean') patch.power = value
    else if (key === 'mode' && AC_MODES.includes(value as AcMode)) patch.mode = value as AcMode
    else if (key === 'fan' && typeof value === 'string' && FAN_SPEEDS.includes(value)) patch.fan = value
    else if (key === 'vane' && typeof value === 'string' && VANE_POSITIONS.includes(value)) patch.vane = value
    else if (key === 'wideVane' && typeof value === 'string' && WIDE_VANE_POSITIONS.includes(value)) patch.wideVane = value
    else if (key === 'temperature' && typeof value === 'number' && value >= MIN_TEMPERATURE && value <= MAX_TEMPERATURE && Number.isInteger(value * 2)) patch.temperature = value
    else return null
  }
  return Object.keys(patch).length > 0 ? patch : null
}

export const acRouter = (ac: AcService | null): Router => {
  const router = Router()
  router.get('/ac', async (_req, res) => {
    if (!ac) return void res.status(503).json({ error: 'ac not configured' })
    res.json({ units: await ac.state() })
  })
  router.post('/ac/:id', express.json({ limit: '1kb' }), async (req, res) => {
    if (!ac) return void res.status(503).json({ error: 'ac not configured' })
    const patch = toPatch((req.body ?? {}) as Record<string, unknown>)
    if (!patch) return void res.status(400).json({ error: BODY_ERROR })
    try {
      res.json(await ac.update(req.params.id, patch))
    } catch (error) {
      if (error instanceof UnknownAcUnit) return void res.status(404).json({ error: 'unknown ac unit' })
      res.status(502).json({ error: 'ac module unreachable' })
    }
  })
  return router
}
