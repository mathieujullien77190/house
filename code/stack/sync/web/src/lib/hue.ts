import type { SpecItem } from '@house/ui'
import type { HueBridge } from '@/types'

/** Le résumé à côté du titre : « joignable » ou « injoignable ». */
export const bridgeSummary = (bridge: HueBridge): string => (bridge.reachable ? 'joignable' : 'injoignable')

/** Les lignes de la fiche du pont : son état, son adresse et, quand il répond, son nom, son modèle et ses versions. */
export const buildBridgeItems = (bridge: HueBridge): SpecItem[] => {
  const items: (SpecItem | null)[] = [
    { id: 'state', label: 'État', value: bridge.reachable ? 'Joignable' : 'Injoignable' },
    { id: 'address', label: 'Adresse', value: bridge.address },
    bridge.name ? { id: 'name', label: 'Nom', value: bridge.name } : null,
    bridge.model ? { id: 'model', label: 'Modèle', value: bridge.model } : null,
    bridge.apiVersion ? { id: 'api', label: 'API', value: bridge.apiVersion } : null,
    bridge.softwareVersion ? { id: 'software', label: 'Logiciel', value: bridge.softwareVersion } : null,
  ]
  return items.filter((item): item is SpecItem => item !== null)
}
