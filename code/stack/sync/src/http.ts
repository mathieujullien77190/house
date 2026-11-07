// Les petits outils HTTP de la page de House Sync : lire un corps JSON borné, répondre en JSON, valider un entier de réglage.
import type { IncomingMessage, ServerResponse } from 'node:http'

/** Les corps reçus sont des petits JSON (une clé, des réglages) : au-delà, on coupe. */
const MAX_BODY_BYTES = 16 * 1024
export const readBody = (req: IncomingMessage): Promise<string> =>
  new Promise((resolve, reject) => {
    let body = ''
    let size = 0
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        reject(new Error('corps trop gros'))
        req.destroy()
        return
      }
      body += chunk.toString()
    })
    req.on('end', () => resolve(body))
    req.on('error', reject)
    req.on('close', () => reject(new Error('connexion coupée')))
  })

/** Le corps d'une requête en objet JSON ; null s'il n'est pas du JSON, ou si ce n'est pas un objet (null, nombre, tableau). */
export const readJsonObject = async (req: IncomingMessage): Promise<Record<string, unknown> | null> => {
  try {
    const parsed: unknown = JSON.parse(await readBody(req))
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null
  } catch {
    return null
  }
}

/** Un entier de min à max : la valeur envoyée si c'en est un, la valeur actuelle si elle manque, null sinon (un booléen, un texte ou un tableau ne passent pas). */
export const intSetting = (sent: unknown, current: number, min: number, max: number): number | null =>
  sent === undefined ? current : typeof sent === 'number' && Number.isInteger(sent) && sent >= min && sent <= max ? sent : null

export const sendJson = (res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...headers })
  res.end(JSON.stringify(body))
}
