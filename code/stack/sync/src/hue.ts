// L'état du pont Philips Hue pour l'onglet Machine : est-il joignable depuis la machine ? On lit sa fiche publique
// (`GET /api/config`, sans clé ni compte) : le pont répond son nom, son modèle et ses versions, jamais de lampe ni de clé.

export interface HueBridge {
  /** Une adresse de pont est réglée (HUE_BRIDGE_IP) ; sinon rien à montrer. */
  configured: boolean
  /** Le pont a répondu à temps. */
  reachable: boolean
  address: string
  name: string | null
  model: string | null
  apiVersion: string | null
  softwareVersion: string | null
}

const TIMEOUT_MS = 3000
const ADDRESS = /^[\w.-]+$/

const text = (value: unknown): string | null => (typeof value === 'string' && value !== '' ? value : null)

/** Ce qu'on garde de la fiche publique du pont : nom, modèle et versions ; null si ce n'est pas la fiche d'un pont Hue. */
export const parseBridgeConfig = (body: unknown): Pick<HueBridge, 'name' | 'model' | 'apiVersion' | 'softwareVersion'> | null => {
  if (typeof body !== 'object' || body === null) return null
  const config = body as Record<string, unknown>
  // Un pont Hue donne toujours son identifiant : sans lui, ce n'est pas un pont.
  if (text(config.bridgeid) === null) return null
  return { name: text(config.name), model: text(config.modelid), apiVersion: text(config.apiversion), softwareVersion: text(config.swversion) }
}

export const readHueBridge = async (address = process.env.HUE_BRIDGE_IP ?? ''): Promise<HueBridge> => {
  const down: HueBridge = { configured: address !== '', reachable: false, address, name: null, model: null, apiVersion: null, softwareVersion: null }
  if (address === '' || !ADDRESS.test(address)) return { ...down, configured: false }
  try {
    const res = await fetch(`http://${address}/api/config`, { signal: AbortSignal.timeout(TIMEOUT_MS) })
    if (!res.ok) return down
    const config = parseBridgeConfig(await res.json())
    return config ? { ...down, reachable: true, ...config } : down
  } catch {
    return down
  }
}
