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

/**
 * Une texture de bois à la teinte donnée : des veines fines dans le sens de la longueur (plus claires et plus sombres, un peu ondulées),
 * quelques bandes de teinte et un ou deux nœuds. `seed` change le dessin d'un bois à l'autre.
 */
export const woodTexture = (color: number, seed: number): THREE.CanvasTexture =>
  canvasTexture(256, (ctx) => {
    const base = new THREE.Color(color)
    const tone = (shift: number, alpha: number): string => {
      const shade = base.clone().offsetHSL(0, 0, shift)
      return `rgba(${Math.round(shade.r * 255)}, ${Math.round(shade.g * 255)}, ${Math.round(shade.b * 255)}, ${alpha})`
    }
    const rand = seeded(seed)
    ctx.fillStyle = tone(0, 1)
    ctx.fillRect(0, 0, 256, 256)
    // Des bandes larges de teinte, comme des lames collées.
    for (let band = 0; band < 6; band += 1) {
      ctx.fillStyle = tone((rand() - 0.5) * 0.08, 0.5)
      ctx.fillRect(0, rand() * 256, 256, 20 + rand() * 40)
    }
    // Les veines : des traits fins qui ondulent d'un bord à l'autre (ils se raccordent quand la texture se répète).
    for (let vein = 0; vein < 70; vein += 1) {
      const y = rand() * 256
      const wave = 1 + rand() * 4
      const turns = 1 + Math.floor(rand() * 2)
      const phase = rand() * Math.PI * 2
      ctx.strokeStyle = tone(rand() < 0.7 ? -0.05 - rand() * 0.09 : 0.05 + rand() * 0.05, 0.25 + rand() * 0.4)
      ctx.lineWidth = 0.5 + rand() * 1.4
      ctx.beginPath()
      for (let x = 0; x <= 256; x += 8) {
        const offset = Math.sin((x / 256) * Math.PI * 2 * turns + phase) * wave
        if (x === 0) ctx.moveTo(x, y + offset)
        else ctx.lineTo(x, y + offset)
      }
      ctx.stroke()
    }
    // Un ou deux nœuds.
    for (let knot = 0; knot < 2; knot += 1) {
      const x = 30 + rand() * 196
      const y = 30 + rand() * 196
      for (let ring = 3; ring > 0; ring -= 1) {
        ctx.strokeStyle = tone(-0.12, 0.35)
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.ellipse(x, y, ring * 4, ring * 1.6, 0, 0, Math.PI * 2)
        ctx.stroke()
      }
    }
  })

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

/** Une ampoule ronde : une boule à sa place. */
export const bulbBall = (radius: number, x: number, y: number, z: number): THREE.Mesh => {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 12))
  mesh.position.set(x, y, z)
  return mesh
}

/** Tourne un groupe pour que son devant (+z) regarde dans la direction (dx, dz). */
export const facing = (group: THREE.Group, dx: number, dz: number): THREE.Group => {
  group.rotation.y = Math.atan2(dx, dz)
  return group
}

/** La teinte d'une ampoule éteinte. */
export const BULB_OFF = 0x4a4640

/**
 * Marque un maillage comme l'ampoule d'un luminaire : il reçoit son propre matériau (sa couleur suivra la vraie lampe Hue la plus proche)
 * et ne porte pas d'ombre. `lighting.ts` retrouve ces ampoules dans la scène par `userData.fixture`.
 */
export const fixtureBulb = (mesh: THREE.Mesh, name?: string): THREE.Mesh => {
  mesh.material = new THREE.MeshBasicMaterial({ color: BULB_OFF })
  mesh.userData.fixture = true
  // Le nom de la lampe Hue qui l'allume (en minuscules), quand on le connaît : il passe avant la place sur le plan.
  if (name) mesh.userData.fixtureName = name
  return mesh
}

/**
 * Marque un objet trop petit ou trop léger pour porter une ombre qui se voie (herbe, fleurs, fruits, feuilles semées par milliers,
 * grillage) : `buildScene` ne lui en fait pas porter (`userData.noShadow`), ce qui allège d'autant la carte d'ombre du soleil.
 */
export const noShadow = <T extends THREE.Object3D>(object: T): T => {
  object.userData.noShadow = true
  return object
}
