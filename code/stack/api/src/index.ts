// House API : elle lit la base SQLite et les clips écrits par House Sync (jamais elle n'y écrit), relaie le direct
// et l'image à l'instant depuis go2rtc (réseau Docker), et commande le pont Hue, la prise et le PoE du switch.
// Services : auth (clé → cookie de session), direct, image, events, clips, snapshots, snapshot, stream, frame,
// derrière la clé X-House-Key ou la session (voir routes/). HTTPS avec le certificat de la maison.
// poe : allume ou éteint une caméra en coupant le PoE de son port sur le switch (page web du switch, SWITCH_*).
// Point d'entrée : il ouvre le port et écoute les signaux, donc il n'est pas mesuré par les tests ; la logique est dans app.ts et server.ts.
import { createApp } from './app.ts'
import { loadConfig } from './config.ts'
import type { BoxWatcher } from './services/boxWatcher.ts'
import { createAppServer, stopServer } from './server.ts'

const config = loadConfig()
const app = createApp(config)
const server = createAppServer(config, app)
;(app.locals.boxWatcher as BoxWatcher | null)?.start()

server.listen(config.port, () => console.log(`House API en ${config.tls ? 'HTTPS' : 'HTTP'} sur le port ${config.port}`))

const stop = () => stopServer(server, process.exit)
process.on('SIGTERM', stop)
process.on('SIGINT', stop)
