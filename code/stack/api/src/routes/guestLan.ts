// guest-lan : l'adresse de la page invité du réseau (`/chezmatou`), derrière la clé habituelle (X-House-Key ou session) : c'est la **seule** route qui rend LAN_KEY, pour l'onglet « Page invité » de la WebApp
// (le QR code et l'aperçu). GET /guest-lan/link rend {configured, url, enabled, cameras, shutters, lights, ac} : `url` est `https://<LAN_HOST>:<port>/chezmatou?k=<LAN_KEY>` (null sans LAN_KEY),
// le reste l'état en lecture seule des interrupteurs (le document `lan-access`, que seule House Sync écrit).
import { Router } from 'express'
import type { DocStore } from '../lib/docStore.ts'
import { readLanAccess } from '../lib/lanAccess.ts'
import { MIN_LAN_KEY_LENGTH } from '../middleware/lanGuard.ts'

/** `host` : le nom fixe de l'adresse (LAN_HOST), `port` celui de l'API : le lien ne dépend pas de l'adresse par laquelle la WebApp a été ouverte. */
export const guestLanRouter = (key: string, doc: DocStore, host: string, port: number): Router => {
  const router = Router()
  router.get('/guest-lan/link', (_req, res) => {
    const configured = key.length >= MIN_LAN_KEY_LENGTH
    res.setHeader('Cache-Control', 'no-store')
    res.json({ configured, url: configured ? `https://${host}:${port}/chezmatou?k=${encodeURIComponent(key)}` : null, ...readLanAccess(doc) })
  })
  return router
}
