// tv : la télécommande du Freebox Player (Android TV Remote v2). GET /tv rend {configured, paired, online, name?} (online : le Player est actif dans la box, null si la box ne le dit pas).
// POST /tv/pair/start ouvre l'appairage (la TV affiche un code), POST /tv/pair/code {code} le termine, DELETE /tv/pair l'oublie. POST /tv/key {key, long?} envoie une touche.
// Le certificat client, sa clé et le code ne figurent dans aucune réponse.
import express, { Router, type Response } from 'express'
import { findPlayer, isTvKey, normalizePairingCode, TV_KEYS, TvRemoteError, type TvRemote } from '../lib/tvRemote.ts'
import type { BoxService } from '../services/boxService.ts'

const STATUS = { not_paired: 409, no_pairing: 409, bad_code: 422, unreachable: 502, refused: 502, timeout: 504 } as const

const fail = (res: Response, error: unknown) => {
  const code = error instanceof TvRemoteError ? error.code : 'unreachable'
  res.status(STATUS[code]).json({ error: code === 'unreachable' ? 'player off or unreachable' : (error as Error).message, reason: code })
}

export const tvRouter = (tv: TvRemote | null, box: BoxService | null): Router => {
  const router = Router()
  router.get('/tv', async (_req, res) => {
    let online: boolean | null = null
    let name: string | undefined
    if (box) {
      try {
        const player = findPlayer(await box.lanDevices())
        online = player?.active ?? null
        name = player?.name
      } catch {
        online = null
      }
    }
    res.json({ configured: tv !== null, paired: tv?.paired() ?? false, online, ...(name ? { name } : {}) })
  })
  router.post('/tv/pair/start', async (_req, res) => {
    if (!tv) return void res.status(503).json({ error: 'tv remote not configured' })
    try {
      await tv.pairStart()
      res.json({ started: true })
    } catch (error) {
      fail(res, error)
    }
  })
  router.post('/tv/pair/code', express.json({ limit: '1kb' }), async (req, res) => {
    if (!tv) return void res.status(503).json({ error: 'tv remote not configured' })
    const code = normalizePairingCode(((req.body ?? {}) as { code?: unknown }).code)
    if (!code) return void res.status(400).json({ error: 'body must be {"code": 6 hexadecimal characters}' })
    try {
      await tv.pairFinish(code)
      res.json({ paired: true })
    } catch (error) {
      fail(res, error)
    }
  })
  router.delete('/tv/pair', (_req, res) => {
    if (!tv) return void res.status(503).json({ error: 'tv remote not configured' })
    tv.unpair()
    res.json({ paired: false })
  })
  router.post('/tv/key', express.json({ limit: '1kb' }), async (req, res) => {
    if (!tv) return void res.status(503).json({ error: 'tv remote not configured' })
    const body = (req.body ?? {}) as { key?: unknown; long?: unknown }
    if (!isTvKey(body.key) || (body.long !== undefined && typeof body.long !== 'boolean')) {
      return void res.status(400).json({ error: `body must be {"key": one of ${TV_KEYS.join(', ')}, "long"?: boolean}` })
    }
    try {
      await tv.press(body.key, body.long === true)
      res.json({ key: body.key, long: body.long === true })
    } catch (error) {
      fail(res, error)
    }
  })
  return router
}
