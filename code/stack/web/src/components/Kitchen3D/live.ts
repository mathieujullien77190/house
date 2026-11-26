import * as THREE from 'three'
import { VIEW_LABEL } from './constants'
import type { ScreenFeed, ScreenFrame } from './types'

/**
 * Met la pendule de la scène à l'heure : ses deux aiguilles sont des groupes marqués par `userData.clockHand` (« hour » ou « minute »), qui
 * tournent autour du centre du cadran. La pendule est vue de la cuisine, dos à +z : un angle positif autour de z y tourne dans le sens horaire.
 */
export const applyClock = (root: THREE.Object3D, now: Date): void => {
  const minutes = now.getMinutes() + now.getSeconds() / 60
  root.traverse((object) => {
    const hand = object.userData.clockHand as string | undefined
    if (!hand) return
    object.rotation.z = (hand === 'minute' ? minutes / 60 : ((now.getHours() % 12) + minutes / 60) / 12) * Math.PI * 2
  })
}

/** Les clims de la scène (leur bloc est marqué par `userData.acUnit`, l'identifiant de la vraie clim) : ce qu'on clique pour l'allumer ou l'éteindre. */
export const acMeshes = (root: THREE.Object3D): { id: string; object: THREE.Object3D }[] => {
  const found: { id: string; object: THREE.Object3D }[] = []
  root.traverse((object) => {
    const id = object.userData.acUnit as string | undefined
    if (id) found.push({ id, object })
  })
  return found
}

/** Les couleurs du voyant de la clim : en marche, à l'arrêt, état inconnu (pas lue ou injoignable). */
export const AC_LED = { on: 0x2fd45a, off: 0xd43a2f, unknown: 0x8a8f96 }

/**
 * Règle le voyant de chaque clim (le petit pavé marqué par `userData.acLed`, l'identifiant de la vraie clim) d'après `powers` : vert en
 * marche, rouge à l'arrêt, gris si on ne sait pas (absente de `powers`, ou null).
 */
export const applyAcLed = (root: THREE.Object3D, powers: Record<string, boolean | null>): void => {
  root.traverse((object) => {
    const id = object.userData.acLed as string | undefined
    if (!id) return
    const power = powers[id] ?? null
    const material = (object as THREE.Mesh).material as THREE.MeshBasicMaterial
    material.color.setHex(power === null ? AC_LED.unknown : power ? AC_LED.on : AC_LED.off)
  })
}

/** La couleur d'un écran du bureau qui ne montre rien. */
export const SCREEN_BLUE = 0x2f5f94
/** L'image de la caméra est recopiée sur l'écran au plus toutes les tant de millisecondes. */
const SCREEN_REFRESH_MS = 100

/** La couleur de la télé éteinte. */
export const TV_BLACK = 0x06070a

/** L'étiquette du bouton « Voir » : un cartouche sombre arrondi, le mot en blanc. */
const viewLabel = (): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas')
  canvas.width = 200
  canvas.height = 80
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.fillStyle = 'rgba(15, 18, 24, 0.82)'
    ctx.beginPath()
    ctx.roundRect(4, 4, 192, 72, 18)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)'
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.fillStyle = '#fff'
    ctx.font = '600 40px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(VIEW_LABEL, 100, 42)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

/** La taille de l'image d'un écran (16:9, comme les écrans et la télé de la scène). */
const SCREEN_PIXELS = { width: 640, height: 360 }

/**
 * Dessine l'image d'une caméra dans celle de l'écran, entière et sans l'étirer : centrée, à la plus grande taille qui tient, le reste en noir.
 * En portrait, elle est tournée d'un quart de tour horaire (la caméra est montée couchée).
 */
export const drawContained = (ctx: CanvasRenderingContext2D, image: HTMLImageElement, portrait: boolean): void => {
  const { width, height } = SCREEN_PIXELS
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, width, height)
  const shownWidth = portrait ? image.naturalHeight : image.naturalWidth
  const shownHeight = portrait ? image.naturalWidth : image.naturalHeight
  const scale = Math.min(width / shownWidth, height / shownHeight)
  ctx.save()
  ctx.translate(width / 2, height / 2)
  if (portrait) ctx.rotate(Math.PI / 2)
  ctx.drawImage(image, (-image.naturalWidth * scale) / 2, (-image.naturalHeight * scale) / 2, image.naturalWidth * scale, image.naturalHeight * scale)
  ctx.restore()
}

/**
 * Les écrans de la scène qui montrent une caméra (les maillages marqués par `userData.cameraScreen` : « left » et « right » au bureau,
 * « tv » au salon). `show(key, src)` ouvre sur cet écran le direct léger d'une caméra (un MJPEG lu par une image hors page, redessinée sur
 * l'écran dix fois par seconde, entière et sans déformation, tournée si la caméra est en portrait), `show(key, null)` le referme et lui rend sa couleur d'écran éteint (`userData.screenOff`). Un flux n'est
 * ouvert que tant qu'il est montré. `frame(key)` dit où est l'écran et vers où il regarde (`userData.screenFacing` : +1 ou −1 le long de
 * son axe z), pour venir se placer devant.
 */
export const createScreenFeed = (root: THREE.Object3D): ScreenFeed => {
  interface Feed {
    mesh: THREE.Mesh
    image: HTMLImageElement
    /** L'image de l'écran : le direct y est redessiné entier, sans déformation, sur fond noir. */
    canvas: HTMLCanvasElement
    texture: THREE.Texture
    live: boolean
    /** Le bouton « Voir », dans le coin de l'écran, tant qu'un direct y est montré. */
    button: THREE.Mesh
    /** Caméra en portrait : son image se montre tournée d'un quart de tour horaire. */
    portrait: boolean
    last: number
  }
  const feeds = new Map<string, Feed>()
  root.traverse((object) => {
    const key = object.userData.cameraScreen as string | undefined
    if (!key) return
    const image = document.createElement('img')
    const canvas = document.createElement('canvas')
    canvas.width = SCREEN_PIXELS.width
    canvas.height = SCREEN_PIXELS.height
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    const mesh = object as THREE.Mesh
    // Le bouton « Voir » : une petite étiquette posée sur la dalle, en bas à droite pour qui la regarde, cachée tant que l'écran est éteint.
    const facing = mesh.userData.screenFacing as number
    const { width, height, depth } = (mesh.geometry as THREE.BoxGeometry).parameters
    const wide = width * 0.2
    const tall = wide * 0.4
    const button = new THREE.Mesh(new THREE.PlaneGeometry(wide, tall), new THREE.MeshBasicMaterial({ map: viewLabel(), transparent: true }))
    button.position.set(facing * (width / 2 - wide / 2 - width * 0.02), -height / 2 + tall / 2 + width * 0.02, facing * (depth / 2 + 0.001))
    if (facing < 0) button.rotation.y = Math.PI
    button.visible = false
    mesh.add(button)
    feeds.set(key, { mesh, image, canvas, texture, button, live: false, portrait: false, last: 0 })
  })
  const materialOf = (feed: Feed): THREE.MeshBasicMaterial => feed.mesh.material as THREE.MeshBasicMaterial
  const show = (key: string, src: string | null, portrait = false) => {
    const feed = feeds.get(key)
    if (!feed) return
    feed.live = src !== null
    feed.button.visible = feed.live
    feed.portrait = portrait
    feed.last = 0
    // Vider l'adresse ferme la connexion du direct précédent.
    feed.image.removeAttribute('src')
    if (src) feed.image.src = src
    const material = materialOf(feed)
    material.map = null
    material.color.setHex(src ? 0x0a0c10 : (feed.mesh.userData.screenOff as number))
    material.needsUpdate = true
  }
  const update = (now: number) => {
    for (const feed of feeds.values()) {
      if (!feed.live || feed.image.naturalWidth === 0 || now - feed.last < SCREEN_REFRESH_MS) continue
      feed.last = now
      const ctx = feed.canvas.getContext('2d')
      if (!ctx) continue
      drawContained(ctx, feed.image, feed.portrait)
      const material = materialOf(feed)
      if (!material.map) {
        material.map = feed.texture
        material.color.setHex(0xffffff)
        material.needsUpdate = true
      }
      feed.texture.needsUpdate = true
    }
  }
  // L'écran touché par le rayon, le plus proche de l'œil.
  const hit = (raycaster: THREE.Raycaster): string | null => {
    let best: string | null = null
    let nearest = Infinity
    for (const [key, feed] of feeds) {
      const found = raycaster.intersectObject(feed.mesh, false)[0]
      if (found && found.distance < nearest) {
        nearest = found.distance
        best = key
      }
    }
    return best
  }
  // L'écran dont le bouton « Voir » est touché par le rayon (seulement s'il montre un direct).
  const button = (raycaster: THREE.Raycaster): string | null => {
    for (const [key, feed] of feeds) if (feed.live && raycaster.intersectObject(feed.button, false).length > 0) return key
    return null
  }
  const frame = (key: string): ScreenFrame | null => {
    const feed = feeds.get(key)
    if (!feed) return null
    const size = new THREE.Box3().setFromObject(feed.mesh).getSize(new THREE.Vector3())
    const normal = new THREE.Vector3(0, 0, feed.mesh.userData.screenFacing as number).applyQuaternion(feed.mesh.getWorldQuaternion(new THREE.Quaternion()))
    return { center: feed.mesh.getWorldPosition(new THREE.Vector3()), normal, width: Math.max(size.x, size.z), height: size.y }
  }
  const dispose = () => {
    for (const feed of feeds.values()) {
      feed.image.removeAttribute('src')
      materialOf(feed).map = null
      feed.texture.dispose()
    }
  }
  return { show, update, hit, button, frame, dispose }
}

/**
 * D'où regarder un écran pour qu'il occupe la part `share` de la vue (en largeur comme en hauteur, la plus exigeante des deux) : la
 * distance devant lui, pour une caméra d'angle vertical `fov` (degrés) et de rapport `aspect`.
 */
export const screenDistance = (width: number, height: number, fov: number, aspect: number, share: number): number => {
  const half = Math.tan((fov * Math.PI) / 360)
  return Math.max(width / share / (2 * half * aspect), height / share / (2 * half))
}
