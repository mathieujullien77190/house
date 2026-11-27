// Le zoom optique d'une caméra Reolink (RLC-811A, objectif motorisé ×5) : l'API HTTP de la caméra (port 80, à activer dans ses réglages réseau).
// Vérifié sur la caméra « pommier » (firmware v3.1.0.4695) : `GetZoomFocus` rend la position et sa plage (0 à 28), `StartZoomFocus` avec `op: "ZoomPos"` la règle ;
// l'objectif met quelques secondes à bouger et refait la mise au point tout seul.
// Le compte et le mot de passe sont dans l'adresse de l'appel (la caméra le veut ainsi) : **aucune erreur de ce fichier ne porte l'adresse**, ni le message de `fetch`
// (qui pourrait la citer) : seulement un texte fixe, sans rien de la caméra.

/** Où est la caméra et avec quel compte lui parler. */
export interface ReolinkCamera {
  host: string
  user: string
  password: string
}

/** La position du zoom et sa plage (0 à 28 sur la RLC-811A). */
export interface ZoomState {
  pos: number
  min: number
  max: number
}

export interface ReolinkClient {
  /** La position du zoom et sa plage ; lève une erreur si la caméra ne répond pas ou répond autre chose. */
  getZoom: (camera: ReolinkCamera) => Promise<ZoomState>
  /** Demande la position `pos` ; la caméra répond tout de suite, l'objectif bouge ensuite. */
  setZoom: (camera: ReolinkCamera, pos: number) => Promise<void>
}

/** La caméra est sur le réseau de la maison : elle répond en moins d'une seconde, ou pas du tout. */
const TIMEOUT_MS = 5000

/** La seule erreur qui sort d'ici : un texte fixe, sans adresse ni compte. */
export class ReolinkError extends Error {}

interface Reply {
  code?: unknown
  range?: { ZoomFocus?: { zoom?: { pos?: { min?: unknown; max?: unknown } } } }
  value?: { ZoomFocus?: { zoom?: { pos?: unknown } } }
}

const isInteger = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value)

export const createReolinkClient = (fetcher: typeof fetch = fetch): ReolinkClient => {
  /** Une commande de l'API de la caméra et sa réponse (le premier élément du tableau rendu, `code` 0 = accepté). */
  const command = async (camera: ReolinkCamera, cmd: string, action: number, param: unknown): Promise<Reply> => {
    const url = `http://${camera.host}/cgi-bin/api.cgi?cmd=${cmd}&user=${encodeURIComponent(camera.user)}&password=${encodeURIComponent(camera.password)}`
    let reply: Reply | undefined
    try {
      const response = await fetcher(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{ cmd, action, param }]),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
      if (!response.ok) throw new ReolinkError(`caméra : HTTP ${response.status}`)
      reply = ((await response.json()) as Reply[] | null)?.[0]
    } catch (error) {
      // L'erreur de `fetch` n'est jamais relayée : elle peut citer l'adresse, donc le mot de passe.
      throw error instanceof ReolinkError ? error : new ReolinkError('caméra injoignable')
    }
    if (reply?.code !== 0) throw new ReolinkError(`caméra : ${cmd} refusé`)
    return reply
  }

  return {
    getZoom: async (camera) => {
      const reply = await command(camera, 'GetZoomFocus', 1, { channel: 0 })
      const pos = reply.value?.ZoomFocus?.zoom?.pos
      const range = reply.range?.ZoomFocus?.zoom?.pos
      if (!isInteger(pos) || !isInteger(range?.min) || !isInteger(range.max) || range.max <= range.min) throw new ReolinkError('caméra : zoom illisible')
      return { pos, min: range.min, max: range.max }
    },
    setZoom: async (camera, pos) => {
      await command(camera, 'StartZoomFocus', 0, { ZoomFocus: { channel: 0, pos, op: 'ZoomPos' } })
    },
  }
}
