import { createElement, type ComponentType } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { HiOutlineVideoCamera } from 'react-icons/hi2'
import { RiLightbulbFill } from 'react-icons/ri'
import { LuHeater } from 'react-icons/lu'
import { BsRouter } from 'react-icons/bs'
import { MdOutlineHeatPump, MdOutlineSensorWindow, MdSensorWindow } from 'react-icons/md'
import { TbAirConditioning } from 'react-icons/tb'
import type { Map as MapLibreMap } from 'maplibre-gl'
import type { Palette } from './features'

/** Les images des icônes du plan : la caméra (Heroicons `HiOutlineVideoCamera`, sur un rond), la caméra barrée en rouge quand la vraie caméra est éteinte ou que la caméra du plan n'est liée à aucune (`HiOutlineVideoCameraSlash`), l'ampoule (`RiLightbulbFill`, une image par couleur), et la climatisation (`TbAirConditioning`). */
export const CAMERA_IMAGE = 'camera-icon'
export const CAMERA_DOT_ON_IMAGE = 'camera-dot-on'
export const CAMERA_DOT_OFF_IMAGE = 'camera-dot-off'
export const CAMERA_DOT_MISSING_IMAGE = 'camera-dot-missing'
/** Le préfixe de l'image d'une ampoule (`lamp-#ffa85a`) : une image par couleur, dessinée au moment où la carte la demande. */
export const LAMP_PREFIX = 'lamp-'
export const PLUG_IMAGE = 'plug-icon'
export const SHUTTER_OPEN_IMAGE = 'shutter-icon-open'
export const SHUTTER_CLOSED_IMAGE = 'shutter-icon-closed'
export const AC_IMAGE = 'ac-icon'
/** Les mêmes icônes au survol : le fond blanc du rond devient bleu pâle. */
export const CAMERA_HOVER_IMAGE = 'camera-icon-hover'
export const PLUG_HOVER_IMAGE = 'plug-icon-hover'
export const SHUTTER_OPEN_HOVER_IMAGE = 'shutter-icon-open-hover'
export const SHUTTER_CLOSED_HOVER_IMAGE = 'shutter-icon-closed-hover'
export const AC_HOVER_IMAGE = 'ac-icon-hover'
/** Le préfixe de l'image d'une ampoule survolée (`lamph-#ffa85a`) : comme `lamp-`, sur un fond bleu pâle. */
export const LAMP_HOVER_PREFIX = 'lamph-'
/** Le bleu pâle du fond d'une icône survolée. */
export const HOVER_BACKGROUND = '#bfdbfe'
/** La pompe à chaleur (Material `MdOutlineHeatPump`) : une icône **seule**, sans rond autour, comme l'emoji d'un clip. */
export const HEATPUMP_IMAGE = 'heatpump-icon'
/** Le routeur (la box, Bootstrap `BsRouter`) : lui aussi une icône seule, sans rond. */
export const ROUTER_IMAGE = 'router-icon'

/** Le côté de l'image en pixels (elle s'affiche à moitié, en pixels de l'écran, pour rester nette sur les écrans à haute densité) et celui de l'icône dedans. */
const SIZE = 64
const ICON = 36
/** Les images sont dessinées à `SCALE` fois la densité de base (1 : sans suréchantillonnage, l'essai à 2 était moins net) ; la carte les réduit pour l'écran (`PIXEL_RATIO`). */
const SCALE = 1
const PIXEL_RATIO = 2 * SCALE

/** Le préfixe de l'image d'un texte de température (« temp-21,5° ») : dessinée au moment où la carte la demande (`styleimagemissing`), une par valeur. */
export const TEMPERATURE_PREFIX = 'temp-'
/** Le préfixe de l'image d'un emoji de clip (« emoji-🦊 ») : dessinée à la demande, une par pictogramme. */
export const EMOJI_PREFIX = 'emoji-'
const TEMPERATURE_FONT = 'bold 30px sans-serif'

type Colors = Pick<Palette, 'bg' | 'fg' | 'accent' | 'danger' | 'orange' | 'muted' | 'green'>

/**
 * Dessine une icône sur un rond (le fond de la page, avec un anneau de la couleur de l'état) : l'icône est un SVG de react-icons, rendu en image puis posé dans un canvas. Rend null quand le navigateur ne sait pas dessiner (pas de canvas) ou que l'image ne charge pas.
 */
const draw = (
  icon: ComponentType<{ size: number; color: string }>,
  color: string,
  ring: string,
  background: string,
): Promise<ImageData | null> =>
  new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    canvas.width = SIZE * SCALE
    canvas.height = SIZE * SCALE
    const context = canvas.getContext('2d')
    if (!context) return resolve(null)
    context.scale(SCALE, SCALE)
    const svg = renderToStaticMarkup(createElement(icon, { size: ICON * SCALE, color }))
    const image = new Image()
    image.onload = () => {
      context.beginPath()
      context.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 3, 0, Math.PI * 2)
      context.globalAlpha = 0.9
      context.fillStyle = background
      context.fill()
      context.globalAlpha = 1
      context.lineWidth = 4
      context.strokeStyle = ring
      context.stroke()
      context.drawImage(image, (SIZE - ICON) / 2, (SIZE - ICON) / 2, ICON, ICON)
      resolve(context.getImageData(0, 0, SIZE * SCALE, SIZE * SCALE))
    }
    image.onerror = () => resolve(null)
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  })

/** Le côté de l'icône seule (sans rond) dans son image. */
const BARE_ICON = 56
/** Le routeur est deux fois plus petit que la pompe à chaleur. */
const ROUTER_ICON = BARE_ICON / 2

/** Dessine une icône **seule** : ni fond ni bordure (comme un emoji), noire avec un fin liseré blanc pour rester lisible sur la photo. Rend null sans canvas ou si l'image ne charge pas. */
const drawBare = (icon: ComponentType<{ size: number; color: string }>, side = BARE_ICON): Promise<ImageData | null> =>
  new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    canvas.width = SIZE * SCALE
    canvas.height = SIZE * SCALE
    const context = canvas.getContext('2d')
    if (!context) return resolve(null)
    context.scale(SCALE, SCALE)
    const white = new Image()
    const black = new Image()
    const svg = (color: string) =>
      `data:image/svg+xml;charset=utf-8,${encodeURIComponent(renderToStaticMarkup(createElement(icon, { size: side * SCALE, color })))}`
    black.onload = () => {
      const at = (SIZE - side) / 2
      // Le liseré blanc : l'icône blanche décalée dans les huit directions, puis l'icône noire par-dessus.
      for (const [dx, dy] of [
        [-1.5, 0],
        [1.5, 0],
        [0, -1.5],
        [0, 1.5],
        [-1, -1],
        [1, 1],
        [-1, 1],
        [1, -1],
      ])
        context.drawImage(white, at + dx, at + dy, side, side)
      context.drawImage(black, at, at, side, side)
      resolve(context.getImageData(0, 0, SIZE * SCALE, SIZE * SCALE))
    }
    black.onerror = () => resolve(null)
    white.onload = () => {
      black.src = svg('#000000')
    }
    white.onerror = () => resolve(null)
    white.src = svg('#ffffff')
  })

/** Ajoute à la carte les images des icônes (dessinées par le navigateur, donc prêtes un instant après : les calques de symboles les affichent dès qu'elles sont là). */
export const addMapIcons = (map: MapLibreMap, colors: Colors): void => {
  const images: [string, ComponentType<{ size: number; color: string }>, string, string, string?][] = [
    // La caméra : **fond blanc, caméra noire**, tournée vers où elle regarde (voir `plan-cameras`) ; son état est dit par une petite pastille posée sur le rond (`addStatusDots`).
    [CAMERA_IMAGE, HiOutlineVideoCamera, '#000000', '#000000', '#ffffff'],
    // La prise du dehors (celle du chauffage de la volière) : comme la caméra, **un radiateur (Lucide `LuHeater`) noir sur un rond blanc** (contour noir) ; son état (allumée, éteinte) est dit par une pastille sur le contour.
    [PLUG_IMAGE, LuHeater, '#000000', '#000000', '#ffffff'],
    // Le volet roulant : comme la caméra, **noir sur un rond blanc** (contour noir) ; c'est la forme de l'icône qui dit l'état : fenêtre ouverte (Material `MdOutlineSensorWindow`) ou fermée, pleine (`MdSensorWindow`).
    [SHUTTER_OPEN_IMAGE, MdOutlineSensorWindow, '#000000', '#000000', '#ffffff'],
    [SHUTTER_CLOSED_IMAGE, MdSensorWindow, '#000000', '#000000', '#ffffff'],
    // La climatisation : comme la caméra, **fond blanc, icône noire, contour noir** ; son état (allumée, éteinte, injoignable) est dit par une pastille posée sur le contour (`addStatusDots`).
    [AC_IMAGE, TbAirConditioning, '#000000', '#000000', '#ffffff'],
    // Les mêmes au survol : le fond blanc du rond devient bleu pâle.
    [CAMERA_HOVER_IMAGE, HiOutlineVideoCamera, '#000000', '#000000', HOVER_BACKGROUND],
    [PLUG_HOVER_IMAGE, LuHeater, '#000000', '#000000', HOVER_BACKGROUND],
    [SHUTTER_OPEN_HOVER_IMAGE, MdOutlineSensorWindow, '#000000', '#000000', HOVER_BACKGROUND],
    [SHUTTER_CLOSED_HOVER_IMAGE, MdSensorWindow, '#000000', '#000000', HOVER_BACKGROUND],
    [AC_HOVER_IMAGE, TbAirConditioning, '#000000', '#000000', HOVER_BACKGROUND],
  ]
  for (const [id, icon, side] of [
    [HEATPUMP_IMAGE, MdOutlineHeatPump, BARE_ICON],
    [ROUTER_IMAGE, BsRouter, ROUTER_ICON],
  ] as const) {
    void drawBare(icon, side).then((image) => {
      try {
        if (image && !map.hasImage(id)) map.addImage(id, image, { pixelRatio: PIXEL_RATIO })
      } catch {
        // La carte a été retirée entre-temps : rien à ajouter.
      }
    })
  }
  for (const [id, icon, color, ring, background = colors.bg] of images) {
    void draw(icon, color, ring, background).then((image) => {
      try {
        if (image && !map.hasImage(id)) map.addImage(id, image, { pixelRatio: PIXEL_RATIO })
      } catch {
        // La carte a été retirée entre-temps : rien à ajouter.
      }
    })
  }
}

/** Dessine l'étiquette d'une température : un rectangle **blanc, sans bordure et à angles droits**, avec le texte en noir dedans. Rend null sans canvas. */
const drawTemperature = (value: string): ImageData | null => {
  const text = value
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  if (!context) return null
  context.font = TEMPERATURE_FONT
  // Les contours exacts du texte (pas sa boîte de police) : c'est eux qu'on centre dans le rectangle, au pixel près, en largeur comme en hauteur.
  const metrics = context.measureText(text)
  const textWidth = metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight
  const textHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent
  const width = Math.ceil(textWidth) + 28
  const height = 46
  canvas.width = width * SCALE
  canvas.height = height * SCALE
  context.scale(SCALE, SCALE)
  // Un rectangle blanc, sans bordure et à angles droits.
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, width, height)
  context.font = TEMPERATURE_FONT
  context.textAlign = 'left'
  context.textBaseline = 'alphabetic'
  context.fillStyle = '#000000'
  context.fillText(
    text,
    (width - textWidth) / 2 + metrics.actualBoundingBoxLeft,
    (height - textHeight) / 2 + metrics.actualBoundingBoxAscent,
  )
  return context.getImageData(0, 0, width * SCALE, height * SCALE)
}

/** Les tracés de l'icône d'ampoule (`RiLightbulbFill`, viewBox 24 × 24), lus dans son SVG : sans Path2D (jsdom), aucun. */
const bulbPaths = (): Path2D[] =>
  typeof Path2D === 'undefined'
    ? []
    : [...renderToStaticMarkup(createElement(RiLightbulbFill, { size: 24 })).matchAll(/<path([^>]*)>/g)]
        .filter((match) => !/fill="none"/.test(match[1]))
        .map((match) => /\sd="([^"]+)"/.exec(match[1])?.[1])
        .filter((d): d is string => d !== undefined)
        .map((d) => new Path2D(d))

/** Dessine une ampoule **dans sa couleur** (avec un fin contour noir pour qu'une couleur pâle reste lisible) sur un rond blanc à contour noir, comme la caméra. Synchrone : la carte attend l'image. Rend null sans canvas. */
const drawLamp = (color: string, background = '#ffffff'): ImageData | null => {
  const canvas = document.createElement('canvas')
  canvas.width = SIZE * SCALE
  canvas.height = SIZE * SCALE
  const context = canvas.getContext('2d')
  if (!context) return null
  context.scale(SCALE, SCALE)
  context.beginPath()
  context.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 3, 0, Math.PI * 2)
  context.fillStyle = background
  context.fill()
  context.lineWidth = 4
  context.strokeStyle = '#000000'
  context.stroke()
  context.save()
  context.translate((SIZE - ICON) / 2, (SIZE - ICON) / 2)
  context.scale(ICON / 24, ICON / 24)
  context.fillStyle = color
  context.lineWidth = 0.9
  context.strokeStyle = '#000000'
  for (const path of bulbPaths()) {
    context.fill(path)
    context.stroke(path)
  }
  context.restore()
  return context.getImageData(0, 0, SIZE * SCALE, SIZE * SCALE)
}

/** Dessine un emoji **seul** : ni fond blanc ni bordure. Synchrone : la carte attend l'image. Rend null sans canvas. */
const drawEmoji = (emoji: string): ImageData | null => {
  const canvas = document.createElement('canvas')
  canvas.width = SIZE * SCALE
  canvas.height = SIZE * SCALE
  const context = canvas.getContext('2d')
  if (!context) return null
  context.scale(SCALE, SCALE)
  context.font = `${Math.round(SIZE * 0.8)}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(emoji, SIZE / 2, SIZE / 2 + 1)
  return context.getImageData(0, 0, SIZE * SCALE, SIZE * SCALE)
}

/**
 * Les étiquettes de température et les ampoules sont des images **dessinées à la demande** : la carte les demande par leur nom (`temp-21,5°`, `lamp-#ffa85a`) quand un point en a besoin, et on les dessine
 * sur place, tout de suite (sans police de carte à charger, une image par valeur ou par couleur).
 */
export const watchDynamicImages = (map: MapLibreMap): void => {
  map.on('styleimagemissing', (event: { id: string }) => {
    if (map.hasImage(event.id)) return
    const image = event.id.startsWith(TEMPERATURE_PREFIX)
      ? drawTemperature(event.id.slice(TEMPERATURE_PREFIX.length))
      : event.id.startsWith(LAMP_PREFIX)
        ? drawLamp(event.id.slice(LAMP_PREFIX.length))
        : event.id.startsWith(LAMP_HOVER_PREFIX)
          ? drawLamp(event.id.slice(LAMP_HOVER_PREFIX.length), HOVER_BACKGROUND)
          : event.id.startsWith(EMOJI_PREFIX)
            ? drawEmoji(event.id.slice(EMOJI_PREFIX.length))
            : null
    if (image) map.addImage(event.id, image, { pixelRatio: PIXEL_RATIO })
  })
}

/** Le côté de l'image d'une pastille d'état (elle s'affiche à moitié). */
const DOT_SIZE = 20

/** Dessine une pastille d'état : un petit disque de la couleur donnée, cerné de noir comme le rond de la caméra. Rend null sans canvas. */
const drawDot = (color: string): ImageData | null => {
  const canvas = document.createElement('canvas')
  canvas.width = DOT_SIZE * SCALE
  canvas.height = DOT_SIZE * SCALE
  const context = canvas.getContext('2d')
  if (!context) return null
  context.scale(SCALE, SCALE)
  context.beginPath()
  context.arc(DOT_SIZE / 2, DOT_SIZE / 2, DOT_SIZE / 2 - 2, 0, Math.PI * 2)
  context.fillStyle = color
  context.fill()
  context.lineWidth = 3
  context.strokeStyle = '#000000'
  context.stroke()
  return context.getImageData(0, 0, DOT_SIZE * SCALE, DOT_SIZE * SCALE)
}

/** Ajoute à la carte les pastilles d'état d'une caméra : verte allumée, rouge éteinte, grise quand la caméra n'existe pas (liée à aucune vraie caméra). Posées par un calque à part : l'icône tourne avec la caméra, la pastille reste au coin. */
export const addStatusDots = (map: MapLibreMap, colors: Pick<Palette, 'green' | 'danger' | 'muted'>): void => {
  for (const [id, color] of [
    [CAMERA_DOT_ON_IMAGE, colors.green],
    [CAMERA_DOT_OFF_IMAGE, colors.danger],
    [CAMERA_DOT_MISSING_IMAGE, colors.muted],
  ] as const) {
    const image = drawDot(color)
    if (image && !map.hasImage(id)) map.addImage(id, image, { pixelRatio: PIXEL_RATIO })
  }
}
