// guest : de quoi bâtir le lien de la page invité (sa clé, son port, son adresse publique si elle existe), pour l'afficher et le copier dans la WebApp.
// Derrière la clé de l'API comme tout le reste : la clé de la page invité n'est donnée qu'à quelqu'un qui a déjà accès à tout.
import { Router } from 'express'

export interface GuestLink {
  key: string
  port: number
  /** L'adresse publique de la page (https://…), vide tant qu'elle n'est pas ouverte à internet. */
  url: string
}

export const guestRouter = (guest: GuestLink | null): Router => {
  const router = Router()
  router.get('/guest', (_req, res) => {
    if (!guest) return void res.status(503).json({ error: 'guest page not configured' })
    res.json(guest)
  })
  return router
}
