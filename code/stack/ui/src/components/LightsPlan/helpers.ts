import { BULB_RADIUS, HOUSE_HEIGHT, HOUSE_WIDTH, VIEW_HEIGHT, VIEW_WIDTH, VIEW_X, VIEW_Y } from './constants'

/** Borne une position pour que l'ampoule reste entière dans le dessin (jardin et zone « À placer » compris), arrondie à l'unité. */
export const clampToPlan = (x: number, y: number): { x: number; y: number } => ({
  x: Math.round(Math.min(VIEW_X + VIEW_WIDTH - BULB_RADIUS, Math.max(VIEW_X + BULB_RADIUS, x))),
  y: Math.round(Math.min(VIEW_Y + VIEW_HEIGHT - BULB_RADIUS, Math.max(VIEW_Y + BULB_RADIUS, y))),
})

/** Un point de l'écran (pixels) en position du plan, d'après le rectangle que le dessin occupe à l'écran. */
export const toPlan = (
  clientX: number,
  clientY: number,
  box: { left: number; top: number; width: number; height: number },
  viewWidth = VIEW_WIDTH,
): { x: number; y: number } =>
  clampToPlan(VIEW_X + ((clientX - box.left) / box.width) * viewWidth, VIEW_Y + ((clientY - box.top) / box.height) * VIEW_HEIGHT)

/** Un point à la distance `radius` de (x, y), dans la direction `angle` (degrés depuis le haut du plan, sens des aiguilles d'une montre). */
const polar = (x: number, y: number, angle: number, radius: number): string => {
  const radians = (angle * Math.PI) / 180
  return `${Math.round(x + radius * Math.sin(radians))} ${Math.round(y - radius * Math.cos(radians))}`
}

/** Le champ de vision d'une caméra : un croissant, la portion de couronne entre `near` et `far`, de part et d'autre de sa direction. */
export const fieldOfView = (x: number, y: number, angle: number, fov: number, near: number, far: number): string => {
  const from = angle - fov / 2
  const to = angle + fov / 2
  return `M ${polar(x, y, from, far)} A ${far} ${far} 0 0 1 ${polar(x, y, to, far)} L ${polar(x, y, to, near)} A ${near} ${near} 0 0 0 ${polar(x, y, from, near)} Z`
}

/** Le vert d'un arbre : plus il est gros, plus il est foncé (du vert clair d'un petit arbre au vert sombre d'un grand), un peu transparent. */
export const treeFill = (radius: number): string => {
  const share = Math.min(1, Math.max(0, (radius - 15) / 135))
  return `hsl(140 50% ${Math.round(62 - 42 * share)}% / 0.85)`
}

/**
 * Tout le pavage (la terrasse de la maison, décalée avec elle, et les autres zones de sol) en **un seul tracé** : des rectangles de même sens
 * dans un même chemin, donc leur réunion, sans trait ni couture entre eux.
 */
export const tileArea = (
  terrace: number,
  houseShift: number,
  floors: { x: number; y: number; w: number; h: number }[],
  floorPaths: string[] = [],
): string => {
  const rects = [
    ...(terrace > 0 ? [{ x: houseShift - terrace, y: -terrace, w: HOUSE_WIDTH + 2 * terrace, h: HOUSE_HEIGHT + 2 * terrace }] : []),
    ...floors,
  ]
  return [...rects.map((rect) => `M ${rect.x} ${rect.y} h ${rect.w} v ${rect.h} h ${-rect.w} Z`), ...floorPaths].join(' ')
}
