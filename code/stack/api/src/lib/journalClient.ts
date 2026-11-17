// L'envoi d'une ligne de journal (activation du chauffage, ordre à un volet) à House Sync, seul à écrire dans la base : `POST /api/journal/<sujet>` sur sa page (HTTPS, même clé que l'API,
// certificat signé par la CA de la maison). L'envoi part sans attendre et une erreur ne gêne jamais la commande : le journal est perdu pour cette fois, l'appareil a reçu son ordre.
import { request } from 'node:https'

export type JournalKind = 'heating' | 'shutters'

export interface JournalTarget {
  /** Par exemple https://sync:8081 */
  url: string
  key: string
  /** La CA de la maison, qui signe le certificat de House Sync. */
  ca: string
  /** Un nom du certificat (House Sync est joint par « sync », qui n'y figure pas). */
  servername: string
}

export type JournalPost = (kind: JournalKind, entry: object) => void

const TIMEOUT_MS = 5000

export const createJournalPost =
  (target: JournalTarget | null, onError: (message: string) => void = () => undefined, send: typeof request = request): JournalPost =>
  (kind, entry) => {
    if (!target) return
    const body = JSON.stringify(entry)
    const req = send(
      `${target.url}/api/journal/${kind}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), 'X-House-Key': target.key }, ca: target.ca, servername: target.servername, timeout: TIMEOUT_MS },
      (res) => {
        if (res.statusCode !== 200) onError(`journal ${kind} : réponse ${res.statusCode}`)
        res.resume()
      },
    )
    req.on('timeout', () => req.destroy(new Error('délai dépassé')))
    req.on('error', (error) => onError(`journal ${kind} : ${error.message}`))
    req.end(body)
  }
