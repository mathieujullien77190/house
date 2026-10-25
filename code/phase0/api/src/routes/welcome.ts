// Le service de bienvenue : l'API est là. Le seul sans clé.
import { Router } from 'express'

export const welcomeRouter = (): Router => {
  const router = Router()
  router.get('/welcome', (_req, res) => {
    res.json({ service: 'house-api', message: 'Welcome to House API', time: new Date().toISOString() })
  })
  return router
}
