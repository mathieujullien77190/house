// Le client de la page « Chez Matou » (`/chezmatou`) : la clé de la page (LAN_KEY) vient de l'adresse (`?k=`), est gardée pour l'onglet (sessionStorage) puis effacée de la barre d'adresse ;
// elle part dans l'en-tête X-Lan-Key, jamais dans une adresse d'appel (sauf l'adresse de la page elle-même). Les images portent un jeton court (`/lan/token`), pas la clé.
import { problemOf } from '@/components/ChezMatou/helpers'
import type { LanProblem, LanState } from '@/components/ChezMatou/types'
import type { AcPatch } from '@/types'

export const LAN_KEY_STORAGE = 'house-lan-key'
const LAN_KEY_HEADER = 'X-Lan-Key'

export class LanError extends Error {
  problem: LanProblem
  constructor(problem: LanProblem) {
    super(problem)
    this.problem = problem
  }
}

/** La clé de la page : celle de l'adresse (gardée, puis effacée de la barre), sinon celle gardée pour l'onglet ; null si on n'en a pas. */
export const readLanKey = (): string | null => {
  const given = new URLSearchParams(window.location.search).get('k')
  try {
    if (given) {
      sessionStorage.setItem(LAN_KEY_STORAGE, given)
      window.history.replaceState(null, '', window.location.pathname)
      return given
    }
    return sessionStorage.getItem(LAN_KEY_STORAGE)
  } catch {
    return given
  }
}

const request = async (key: string, path: string, init: RequestInit = {}): Promise<Response> => {
  let res: Response
  try {
    res = await fetch(path, { ...init, headers: { ...init.headers, [LAN_KEY_HEADER]: key } })
  } catch {
    throw new LanError('unreachable')
  }
  if (res.ok) return res
  const message = ((await res.json().catch(() => ({}))) as { error?: string }).error ?? ''
  throw new LanError(problemOf(res.status, message))
}

const send = (key: string, path: string, method: string, body: unknown): Promise<Response> =>
  request(key, path, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

export const fetchLanState = async (key: string): Promise<LanState> => (await request(key, '/lan/state')).json()
export const fetchLanToken = async (key: string): Promise<string> => ((await (await request(key, '/lan/token')).json()) as { token: string }).token
/** L'adresse du direct d'une caméra : léger, ou 4K (`hd`, seulement pour la vue agrandie) ; `mobile` : le flux dont la cadence se règle à part pour un petit écran. */
export const lanStreamUrl = (camera: string, token: string, hd = false, mobile = false): string =>
  `/lan/stream/${encodeURIComponent(camera)}?t=${encodeURIComponent(token)}${hd ? '&quality=hd' : ''}${mobile ? '&screen=mobile' : ''}`
export const sendLanShutter = async (key: string, id: string, command: 'up' | 'down' | 'stop'): Promise<void> => {
  await send(key, `/lan/shutters/${encodeURIComponent(id)}`, 'POST', { command })
}
export const sendLanLight = async (key: string, id: string, on: boolean): Promise<void> => {
  await send(key, `/lan/lights/${encodeURIComponent(id)}`, 'PUT', { on })
}
export const sendLanAc = async (key: string, id: string, patch: AcPatch): Promise<void> => {
  // Seuls la marche, le mode, la consigne et le ventilateur partent (l'API refuse le reste).
  const { on, mode, temperature, fan } = patch
  await send(key, `/lan/ac/${encodeURIComponent(id)}`, 'POST', { on, mode, temperature, fan })
}
