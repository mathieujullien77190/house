// La sensibilité de la détection, de 1 à 5, réglée par caméra depuis House Sync. 3 est la détection telle que la règlent les
// variables d'environnement (PIXEL_THRESHOLD, AREA_THRESHOLD) ; plus haut, un pixel compte pour moins de contraste et moins de
// pixels suffisent (un chat, un oiseau, la nuit) ; plus bas, on ignore les petits mouvements (feuilles, insectes, bruit).
import type { DetectorConfig } from './detector.ts'

export const MIN_SENSITIVITY = 1
export const MAX_SENSITIVITY = 5
export const DEFAULT_SENSITIVITY = 3

/** Par niveau, de combien on multiplie l'écart de gris minimal et la part de pixels minimale (le niveau 3 ne change rien). */
const FACTORS: Record<number, { pixel: number; area: number }> = {
  1: { pixel: 1.6, area: 3 },
  2: { pixel: 1.3, area: 1.6 },
  3: { pixel: 1, area: 1 },
  4: { pixel: 0.7, area: 0.6 },
  5: { pixel: 0.45, area: 0.3 },
}

export const isSensitivity = (level: number): boolean => Number.isInteger(level) && level >= MIN_SENSITIVITY && level <= MAX_SENSITIVITY

/** Les seuils du détecteur pour un niveau, d'après ceux de base (le reste de la configuration ne bouge pas). */
export const detectorForLevel = (base: DetectorConfig, level: number): DetectorConfig => {
  const factor = FACTORS[level] ?? FACTORS[DEFAULT_SENSITIVITY]
  return {
    ...base,
    pixelThreshold: Math.max(1, Math.round(base.pixelThreshold * factor.pixel)),
    areaThreshold: base.areaThreshold * factor.area,
  }
}
