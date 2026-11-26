import * as THREE from 'three'

/** Un tirage pseudo-aléatoire répétable (les textures sont les mêmes à chaque ouverture). */
export const seeded = (seed: number): (() => number) => {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Une texture dessinée sur un canevas carré, qui se répète. */
export const canvasTexture = (size: number, draw: (ctx: CanvasRenderingContext2D) => void): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (ctx) draw(ctx)
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

/** Un matériau mat ou métallique, d'une couleur ou d'une texture. */
export const standard = (color: number | THREE.Texture, roughness: number, metalness = 0, side: THREE.Side = THREE.FrontSide): THREE.MeshStandardMaterial =>
  color instanceof THREE.Texture ? new THREE.MeshStandardMaterial({ map: color, roughness, metalness, side }) : new THREE.MeshStandardMaterial({ color, roughness, metalness, side })

/** Un pavé centré en (x, y, z). */
export const box = (width: number, height: number, depth: number, material: THREE.Material, x: number, y: number, z: number): THREE.Mesh => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material)
  mesh.position.set(x, y, z)
  return mesh
}

/** Un cylindre vertical centré en (x, y, z). */
export const cylinder = (radiusTop: number, radiusBottom: number, height: number, material: THREE.Material, x: number, y: number, z: number, segments = 24): THREE.Mesh => {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), material)
  mesh.position.set(x, y, z)
  return mesh
}

/** La teinte d'une ampoule éteinte. */
export const BULB_OFF = 0x4a4640

/**
 * Marque un maillage comme l'ampoule d'un luminaire : il reçoit son propre matériau (sa couleur suivra la vraie lampe Hue la plus proche)
 * et ne porte pas d'ombre. `lighting.ts` retrouve ces ampoules dans la scène par `userData.fixture`.
 */
export const fixtureBulb = (mesh: THREE.Mesh): THREE.Mesh => {
  mesh.material = new THREE.MeshBasicMaterial({ color: BULB_OFF })
  mesh.userData.fixture = true
  return mesh
}
