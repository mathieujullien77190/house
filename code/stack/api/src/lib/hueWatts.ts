// La puissance estimée d'une lampe Hue : le pont ne mesure rien, on la déduit du modèle (`modelid`), de l'état (allumée, luminosité) et de la joignabilité.

/** Ce que tire une ampoule Hue sur le réseau mais éteinte (la veille de la puce radio), en watts. */
export const STANDBY_WATTS = 0.4

/** La puissance maximale (watts) des modèles de la maison, d'après les fiches Hue, par `modelid`. */
export const MODEL_WATTS: Record<string, number> = {
  /** Spot GU10 blanc ambiance. */
  LTG002: 5,
  /** Ampoule A60 E27 blanc ambiance. */
  LTW010: 9,
  /** Ampoule A60 E27 couleur. */
  LCT015: 9,
  /** Bougie E14 blanc ambiance. */
  LTW012: 4,
  /** Ruban Lightstrip Plus. */
  LST002: 20,
}

const MAX_BRI = 254

/**
 * Les watts estimés d'une lampe, à un dixième près ; null si le modèle est inconnu.
 * Injoignable : 0 (coupée à l'interrupteur). Joignable et éteinte : la veille. Allumée : veille + (max − veille) × (bri / 254)².
 * La courbe au carré est une approximation (selon Signify, 90 % de luminosité ≈ −19 % de puissance, 70 % ≈ −51 %), pas une mesure.
 */
export const estimateWatts = (modelid: string | undefined, on: boolean, bri: number | null, reachable: boolean): number | null => {
  const max = modelid === undefined ? undefined : MODEL_WATTS[modelid]
  if (max === undefined) return null
  if (!reachable) return 0
  if (!on) return STANDBY_WATTS
  const level = (bri ?? MAX_BRI) / MAX_BRI
  return Math.round((STANDBY_WATTS + (max - STANDBY_WATTS) * level * level) * 10) / 10
}
