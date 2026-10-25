// auth : la clé est bonne (le middleware l'a vérifiée), rien d'autre à dire.
import { Router } from 'express'

export const authRouter = (): Router => {
  const router = Router()
  router.get('/auth', (_req, res) => {
    res.json({ ok: true })
  })
  return router
}
