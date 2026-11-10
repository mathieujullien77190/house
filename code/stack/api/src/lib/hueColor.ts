// La couleur d'une lampe du pont Hue, en #rrggbb, d'après son état : `xy` (CIE 1931), `ct` (température de couleur en mireds) ou `hue` et `sat` selon son `colormode`. La couleur est
// rendue à pleine luminosité (la luminosité se montre autrement) ; null pour une lampe qui ne change pas de couleur (simple allumage, sans colormode).

export interface HueColorState {
  colormode?: string
  xy?: [number, number]
  ct?: number
  hue?: number
  sat?: number
}

const clamp = (value: number): number => Math.min(1, Math.max(0, value))
const hex = (rgb: [number, number, number]): string => `#${rgb.map((channel) => Math.round(clamp(channel) * 255).toString(16).padStart(2, '0')).join('')}`
/** Le rendu sRGB d'une valeur linéaire. */
const gamma = (value: number): number => (value <= 0.0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055)

/** Un point xy du pont à pleine luminosité (Y = 1), en sRGB : la conversion du guide de Philips, ramenée pour que le plus grand canal vaille 1. */
const fromXy = ([x, y]: [number, number]): [number, number, number] | null => {
  if (y <= 0) return null
  const X = x / y
  const Z = (1 - x - y) / y
  const linear: [number, number, number] = [X * 1.656492 - 1 * 0.354851 - Z * 0.255038, -X * 0.707196 + 1 * 1.655397 + Z * 0.036152, X * 0.051713 - 1 * 0.121364 + Z * 1.01153]
  const positive = linear.map((channel) => Math.max(0, channel))
  // Y = 1 impose qu'un canal au moins soit positif : le plus grand ramène l'ensemble à 1.
  const peak = Math.max(...positive)
  return positive.map((channel) => gamma(channel / peak)) as [number, number, number]
}

/** Une température de couleur (mireds → kelvins) en sRGB, par l'approximation de Tanner Helland. */
const fromMireds = (mireds: number): [number, number, number] | null => {
  if (!(mireds > 0)) return null
  const kelvin = Math.min(40000, Math.max(1000, 1_000_000 / mireds)) / 100
  const red = kelvin <= 66 ? 255 : 329.698727446 * (kelvin - 60) ** -0.1332047592
  const green = kelvin <= 66 ? 99.4708025861 * Math.log(kelvin) - 161.1195681661 : 288.1221695283 * (kelvin - 60) ** -0.0755148492
  const blue = kelvin >= 66 ? 255 : kelvin <= 19 ? 0 : 138.5177312231 * Math.log(kelvin - 10) - 305.0447927307
  return [red / 255, green / 255, blue / 255]
}

/** Teinte (0 à 65535) et saturation (0 à 254) du pont à pleine luminosité, en sRGB. */
const fromHueSat = (hue: number, sat: number): [number, number, number] => {
  const h = ((hue / 65535) * 360) / 60
  const s = clamp(sat / 254)
  const sector = Math.floor(h) % 6
  const fraction = h - Math.floor(h)
  const p = 1 - s
  const q = 1 - s * fraction
  const t = 1 - s * (1 - fraction)
  return [
    [1, q, p, p, t, 1][sector],
    [t, 1, 1, q, p, p][sector],
    [p, p, t, 1, 1, q][sector],
  ] as [number, number, number]
}

export const hueColor = (state: HueColorState): string | null => {
  const rgb =
    state.colormode === 'xy' && state.xy
      ? fromXy(state.xy)
      : state.colormode === 'ct' && typeof state.ct === 'number'
        ? fromMireds(state.ct)
        : state.colormode === 'hs' && typeof state.hue === 'number' && typeof state.sat === 'number'
          ? fromHueSat(state.hue, state.sat)
          : null
  return rgb ? hex(rgb) : null
}
