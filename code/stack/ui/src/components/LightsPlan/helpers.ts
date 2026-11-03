import { BULB_RADIUS, VIEW_HEIGHT, VIEW_WIDTH, VIEW_X, VIEW_Y } from './constants'

/** Borne une position pour que l'ampoule reste entière dans le dessin (jardin et zone « À placer » compris), arrondie à l'unité. */
export const clampToPlan = (x: number, y: number): { x: number; y: number } => ({
  x: Math.round(Math.min(VIEW_X + VIEW_WIDTH - BULB_RADIUS, Math.max(VIEW_X + BULB_RADIUS, x))),
  y: Math.round(Math.min(VIEW_Y + VIEW_HEIGHT - BULB_RADIUS, Math.max(VIEW_Y + BULB_RADIUS, y))),
})

/** Un point de l'écran (pixels) en position du plan, d'après le rectangle que le dessin occupe à l'écran. */
export const toPlan = (clientX: number, clientY: number, box: { left: number; top: number; width: number; height: number }): { x: number; y: number } =>
  clampToPlan(VIEW_X + ((clientX - box.left) / box.width) * VIEW_WIDTH, VIEW_Y + ((clientY - box.top) / box.height) * VIEW_HEIGHT)
