// Le serveur de l'API : HTTPS avec le certificat de la maison s'il est configuré, HTTP sinon (développement), et son arrêt.
import { readFileSync } from 'node:fs'
import http from 'node:http'
import https from 'node:https'
import type { Config } from './config.ts'

export const createAppServer = (config: Pick<Config, 'tls'>, app: http.RequestListener): http.Server =>
  config.tls ? https.createServer({ cert: readFileSync(config.tls.cert), key: readFileSync(config.tls.key) }, app) : http.createServer(app)

/** Les flux du direct restent ouverts : sans les fermer, l'arrêt attendrait qu'un onglet les quitte. */
export const stopServer = (server: Pick<http.Server, 'close' | 'closeAllConnections'>, exit: (code: number) => void): void => {
  server.close(() => exit(0))
  server.closeAllConnections()
}
