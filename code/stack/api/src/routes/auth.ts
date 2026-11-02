// auth : la clé est bonne (le middleware l'a vérifiée) ; on ouvre une session (cookie) pour le direct et les images.
// logout ferme cette session.
import { Router } from 'express'
import type { Sessions } from '../middleware/session.ts'

export const authRouter = (sessions: Sessions): Router => {
  const router = Router()
  router.get('/auth', (_req, res) => {
    sessions.open(res)
    res.json({ ok: true })
  })
  router.get('/logout', (_req, res) => {
    sessions.close(res)
    res.json({ ok: true })
  })
  return router
}
