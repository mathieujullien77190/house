// auth : la clé est bonne (le middleware l'a vérifiée) ; on ouvre une session (cookie) pour le direct et les images.
// logout ferme cette session.
import { Router } from 'express'
import { closeSession, openSession } from '../middleware/session.ts'

export const authRouter = (): Router => {
  const router = Router()
  router.get('/auth', (_req, res) => {
    openSession(res)
    res.json({ ok: true })
  })
  router.get('/logout', (req, res) => {
    closeSession(req, res)
    res.json({ ok: true })
  })
  return router
}
