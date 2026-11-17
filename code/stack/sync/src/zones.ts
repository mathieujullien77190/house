// Les zones de surveillance du mouvement, écrites par House API (document `zones` de la table house_state) : pour chaque caméra,
// un polygone dessiné sur l'image dans la WebApp. House Sync les donne à l'enregistreur ; une caméra sans zone est surveillée sur toute l'image.
import type { DatabaseSync } from 'node:sqlite'
import { readState } from './houseState.ts'

export type ZonePoint = [number, number]
export type Zones = Record<string, ZonePoint[]>

/** Un polygone valable : de 3 à 1000 sommets, deux nombres entre 0 et 1 chacun. */
export const validPolygon = (value: unknown): value is ZonePoint[] =>
  Array.isArray(value) &&
  value.length >= 3 &&
  value.length <= 1000 &&
  value.every(
    (point) =>
      Array.isArray(point) && point.length === 2 && point.every((n) => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1),
  )

/**
 * Les zones par caméra. null quand on ne peut pas en être sûr (base illisible, document abîmé) : l'appelant ne change alors rien chez
 * l'enregistreur (qui garde la zone qu'il a). Un document absent veut dire « aucune zone » : toute l'image.
 */
export const readZones = (db: DatabaseSync): Zones | null => {
  let text: string | null
  try {
    text = readState(db, 'zones')
  } catch {
    return null
  }
  if (text === null) return {}
  try {
    const parsed: unknown = JSON.parse(text)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null
    const zones: Zones = {}
    for (const [camera, polygon] of Object.entries(parsed)) if (validPolygon(polygon)) zones[camera] = polygon
    return zones
  } catch {
    return null
  }
}
