import { HOUSE_SHIFT } from '@/components/Lights/constants'

/** Le centre du bâti de la maison au cadastre (parcelle AO 0018 : un rectangle de 12,4 m sur 7,65 m, bâtiment 45761832 du Parcellaire Express) : latitude et longitude. */
export const MAP_CENTER: [number, number] = [48.52206745, 2.65013952]
/** Les unités du plan par mètre : la maison du plan fait 540 unités de large, le bâti 12,4 m. */
export const MAP_UNITS_PER_METER = 540 / 12.4
/** La hauteur de la maison sur la carte : les 7,65 m du bâti (le plan la dessine en 300 unités, soit 6,9 m ; ici elle est allongée pour coller au bâti). */
export const MAP_HOUSE_HEIGHT = Math.round(7.65 * MAP_UNITS_PER_METER)
/** Le point du plan posé sur ce centre : le milieu de la maison (540 de large, poussée de HOUSE_SHIFT vers la droite). */
export const MAP_ANCHOR = { x: HOUSE_SHIFT + 270, y: MAP_HOUSE_HEIGHT / 2 }
/**
 * Le plan est dessiné nord en haut ; sur le terrain, le grand côté de la maison fait 37,7° (sens horaire) avec l'est. La carte est tournée d'autant
 * (`bearing`), pour que la maison soit droite à l'écran ; le plan est tourné de cet angle dans le repère de la carte.
 */
export const MAP_ROTATION_DEG = 37.7
