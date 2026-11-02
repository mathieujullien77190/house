// ca : le certificat PUBLIC de l'autorité de la maison (rootCA.crt), à télécharger depuis le téléphone pour qu'il fasse
// confiance au HTTPS de la maison. Un certificat est public par nature ; la clé privée de l'autorité (rootCA-key.pem)
// ne passe jamais ici : le fichier servi doit être un certificat et ne contenir aucune clé, sinon on ne le sert pas.
import { existsSync, readFileSync } from 'node:fs'
import { Router } from 'express'

const CERTIFICATE_START = '-----BEGIN CERTIFICATE-----'
const PRIVATE_KEY_MARK = 'PRIVATE KEY'

/** Le contenu du fichier s'il est bien un certificat sans clé privée, sinon null. */
export const readCertificate = (file: string): Buffer | null => {
  if (!file || !existsSync(file)) return null
  const content = readFileSync(file)
  const text = content.toString('utf8')
  return text.includes(CERTIFICATE_START) && !text.includes(PRIVATE_KEY_MARK) ? content : null
}

export const caRouter = (file: string): Router => {
  const router = Router()
  router.get('/rootCA.crt', (_req, res) => {
    const certificate = readCertificate(file)
    if (!certificate) return void res.status(404).json({ error: 'not found' })
    res.type('application/x-x509-ca-cert').setHeader('Content-Disposition', 'attachment; filename="rootCA.crt"')
    res.send(certificate)
  })
  return router
}
