// Les zones de surveillance du mouvement, écrites par House API (fichier JSON dans data/house, monté en lecture seule) : pour chaque caméra,
// un polygone dessiné sur l'image dans la WebApp. House Sync les donne à l'enregistreur ; une caméra sans zone est surveillée sur toute l'image.
import { readFile, stat } from 'node:fs/promises'
import { dirname } from 'node:path'

export type ZonePoint = [number, number]
export type Zones = Record<string, ZonePoint[]>

/** Un polygone valable : de 3 à 32 sommets, deux nombres entre 0 et 1 chacun. */
export const validPolygon = (value: unknown): value is ZonePoint[] =>
  Array.isArray(value) &&
  value.length >= 3 &&
  value.length <= 32 &&
  value.every(
    (point) =>
      Array.isArray(point) && point.length === 2 && point.every((n) => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1),
  )

/**
 * Les zones par caméra. null quand on ne peut pas en être sûr (dossier non monté, fichier abîmé) : l'appelant ne change alors rien chez
 * l'enregistreur (qui garde la zone qu'il a). Un fichier absent dans un dossier qui existe veut dire « aucune zone » : toute l'image.
 */
export const readZones = async (file: string): Promise<Zones | null> => {
  const folder = await stat(dirname(file)).then(
    (info) => info.isDirectory(),
    () => false,
  )
  if (!folder) return null
  let text: string
  try {
    text = await readFile(file, 'utf8')
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'ENOENT' ? {} : null
  }
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
