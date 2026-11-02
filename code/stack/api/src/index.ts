// House API, en lecture seule : elle lit la base SQLite et les clips écrits par House Sync, et relaie le direct
// et l'image à l'instant depuis go2rtc (réseau Docker).
// Services : auth (clé → cookie de session), direct, image, events, clips, snapshots, snapshot, stream, frame,
// derrière la clé X-House-Key ou la session (voir routes/). HTTPS avec le certificat de la maison.
// poe : allume ou éteint une caméra en coupant le PoE de son port sur le switch (page web du switch, SWITCH_*).
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
