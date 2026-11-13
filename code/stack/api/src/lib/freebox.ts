import { createHmac } from 'node:crypto'
// Client de l'API locale de la Freebox (v16, HTTP sur le réseau de la maison). L'application « House » (FREEBOX_APP_ID) a été autorisée une fois sur la box ; son jeton
// (FREEBOX_APP_TOKEN, dans le .env) ne sert qu'à ouvrir une session : GET /login/ donne un défi, la réponse est HMAC-SHA1(jeton, défi) en hexadécimal, POST /login/session/
// rend un `session_token` à envoyer dans l'en-tête X-Fbx-App-Auth. La session est gardée en mémoire et renouvelée une fois quand la box la refuse. Le jeton ne sort jamais d'ici.

export interface FreeboxConfig {
  /** Par exemple http://mafreebox.freebox.fr. */
  url: string
  appId: string
  appToken: string
}

export interface FreeboxClient {
  get: <T>(path: string) => Promise<T>
  put: <T>(path: string, body: unknown) => Promise<T>
  post: <T>(path: string, body: unknown) => Promise<T>
  del: <T>(path: string) => Promise<T>
}

/** Une réponse en erreur de la box (ou une box muette : `status` 0). Le message ne contient jamais le jeton. */
export class FreeboxError extends Error {
  readonly status: number
  readonly code: string
  constructor(message: string, status: number, code = '') {
    super(message)
    this.name = 'FreeboxError'
    this.status = status
    this.code = code
  }
}

interface Envelope<T> {
  success: boolean
  result?: T
  error_code?: string
  msg?: string
}

/** Le délai maximum d'une requête vers la box. */
const TIMEOUT_MS = 5000

/** Une session refusée : la box répond 403 (`auth_required`, `invalid_session`), sauf quand c'est un droit qui manque. */
const sessionRefused = (error: FreeboxError): boolean =>
  error.code === 'auth_required' || error.code === 'invalid_session' || (error.status === 403 && error.code !== 'insufficient_rights')

export const createFreeboxClient = (config: FreeboxConfig, fetcher: typeof fetch = fetch): FreeboxClient => {
  const base = `${config.url.replace(/\/+$/, '')}/api/v16`
  let session: string | null = null
  let opening: Promise<string> | null = null

  const send = async <T>(path: string, init: { method: string; body?: unknown; token?: string }): Promise<T> => {
    let response: Response
    try {
      response = await fetcher(`${base}${path}`, {
        method: init.method,
        headers: {
          ...(init.body === undefined ? {} : { 'Content-Type': 'application/json' }),
          ...(init.token ? { 'X-Fbx-App-Auth': init.token } : {}),
        },
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
    } catch {
      throw new FreeboxError('la box ne répond pas', 0)
    }
    const envelope = (await response.json().catch(() => null)) as Envelope<T> | null
    if (!response.ok || !envelope?.success) {
      throw new FreeboxError(envelope?.msg ?? `HTTP ${response.status}`, response.status, envelope?.error_code ?? '')
    }
    return envelope.result as T
  }

  const open = async (): Promise<string> => {
    const { challenge } = await send<{ challenge: string }>('/login/', { method: 'GET' })
    const password = createHmac('sha1', config.appToken).update(challenge).digest('hex')
    const opened = await send<{ session_token: string }>('/login/session/', { method: 'POST', body: { app_id: config.appId, password } })
    return opened.session_token
  }

  /** Une seule ouverture de session à la fois, même si plusieurs requêtes la demandent ensemble. */
  const token = async (): Promise<string> => {
    if (session) return session
    opening ??= open()
      .then((opened) => (session = opened))
      .finally(() => {
        opening = null
      })
    return opening
  }

  const authed = async <T>(path: string, method: string, body?: unknown): Promise<T> => {
    try {
      return await send<T>(path, { method, body, token: await token() })
    } catch (error) {
      if (!(error instanceof FreeboxError) || !sessionRefused(error) || path.startsWith('/login')) throw error
      // La session est périmée : une nouvelle ouverture, un seul nouvel essai.
      session = null
      return send<T>(path, { method, body, token: await token() })
    }
  }

  return {
    get: (path) => authed(path, 'GET'),
    put: (path, body) => authed(path, 'PUT', body),
    post: (path, body) => authed(path, 'POST', body),
    del: (path) => authed(path, 'DELETE'),
  }
}
