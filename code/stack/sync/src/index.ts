// House Sync : à intervalle régulier, il lit chez l'enregistreur (le conteneur motion) les caméras
// et les événements terminés, copie chaque clip sur le disque backup et écrit dans SQLite les événements,
// l'adresse de la dernière image et l'adresse iframe du direct de chaque caméra.
// Seul House Sync écrit dans cette base ; House API la lit. Il sert aussi sa propre page (port 8081, HTTPS,
// derrière la clé) qui montre la base et les fichiers du disque backup : l'API n'expose jamais la base brute.
//
// Ce fichier n'est que le point d'entrée : il donne à `startApp` (app.ts) le vrai environnement, le vrai réseau, la vraie horloge, et
// branche les signaux du processus. Toute la logique est dans les autres modules (testés), hors de la couverture de ce seul fichier.
import { startApp, unhandledRejectionMessage } from './app.ts'

const log = (message: string) => console.log(`${new Date().toISOString()} ${message}`)

const app = await startApp({ env: process.env, fetch: (input, init) => fetch(input, init), now: Date.now, log, exit: (code) => process.exit(code) })

process.on('unhandledRejection', (reason) => log(unhandledRejectionMessage(reason)))
process.on('SIGTERM', () => void app.stop())
process.on('SIGINT', () => void app.stop())
