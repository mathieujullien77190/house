// House API, en lecture seule : elle lit la base SQLite et les clips écrits par House Sync, jamais Frigate.
// Services : auth, direct, image, events, clips, snapshots, snapshot, derrière la clé X-House-Key (voir routes/).
// HTTPS avec le certificat de la maison : le cookie de Frigate (SameSite=Lax) n'atteint la WebApp que sur le
// même scheme et le même hôte que Frigate. Plus tard : poe, avec une clé distincte.
import { readFileSync } from 'node:fs'
import { createServer as createHttpServer } from 'node:http'
import { createServer as createHttpsServer } from 'node:https'
import { createApp } from './app.ts'
import { loadConfig } from './config.ts'

const config = loadConfig()
const app = createApp(config)
const server = config.tls
  ? createHttpsServer({ cert: readFileSync(config.tls.cert), key: readFileSync(config.tls.key) }, app)
  : createHttpServer(app)

server.listen(config.port, () => console.log(`House API en ${config.tls ? 'HTTPS' : 'HTTP'} sur le port ${config.port}`))

const stop = () => server.close(() => process.exit(0))
process.on('SIGTERM', stop)
process.on('SIGINT', stop)
