import * as THREE from 'three'
import { kindOf } from './merge'
import { BULB_OFF } from './primitives'

/**
 * Les couleurs de la vue « Matrix », dans le même ton vert mais qui changent selon le genre (`kindOf`) : le gros œuvre (la maison), le
 * mobilier, les arbres, le reste du jardin. Les arêtes sont fines et à demi transparentes pour ne pas crier ; les caméras (blanc plein) et les lampes qu'on peut
 * piloter sont chacune entourées de trois cercles rouges : ce sont eux qu'on doit voir d'abord. Une ampoule allumée garde la couleur de sa lampe,
 * une éteinte reste d'un gris terne.
 */
export const MATRIX_COLORS: Record<string, number> = { shell: 0x217550, furniture: 0x485d3f, tree: 0x185d3f, garden: 0x246d55 }
export const MATRIX_CAMERA = 0xff3b30
/** Les volets qu'on peut piloter, en fil de fer (leurs lames apparaissent et disparaissent, le maillage suit tout seul), et le cadre de leur fenêtre : violet fermés, bleu ciel ouverts. */
export const MATRIX_SHUTTER = { closed: 0x9b59ff, open: 0x6fc8ff }
const LINE_OPACITY = 0.8
/** Le thème clair de la vue Matrix (thème clair de la WebApp) : les mêmes arêtes en gris, sur fond clair, et les objets pleins (caméras, clims, radiateur) en gris foncé. */
export const MATRIX_LIGHT = { colors: { shell: 0x8e939a, furniture: 0xaeb3b9, tree: 0xc2c6cb, garden: 0xb8bcc2 } as Record<string, number>, solid: 0x2a2d31, background: 0xf1f2f4 }
export const MATRIX_DARK_BACKGROUND = 0x000000

/** Un maillage et ses arêtes (ou, pour une caméra, son matériau d'origine) : l'un est caché quand l'autre se montre. */
interface Pair {
  mesh: THREE.Mesh
  edges: THREE.Object3D | null
  original?: THREE.Material | THREE.Material[]
  /** Pour une ampoule : le repère rouge autour d'elle (l'ampoule garde sa couleur, qui dit si la lampe est allumée). */
  marker?: THREE.Object3D
  /** Un volet : son maillage reste en place, en fil de fer ambre. */
  swap?: THREE.Material
}

/** L'état d'une caméra d'après le switch PoE : en marche (alimentée, flux reçu), en démarrage (alimentée, pas encore de flux) ou coupée. */
export type CameraState = 'on' | 'starting' | 'off'

/** Le volet roulant (le groupe de lames marqué par `userData.shutter`) dont l'objet fait partie, ou null. */
const shutterOf = (object: THREE.Object3D): THREE.Object3D | null => {
  for (let node: THREE.Object3D | null = object; node; node = node.parent) if (node.userData.shutter !== undefined) return node
  return null
}

/** L'appareil dont l'objet fait partie, ou null : une clim de la scène (`userData.acUnit`) ou le radiateur de la cage (`userData.plug`) : en blanc plein, avec leur voyant. */
const unitOf = (object: THREE.Object3D): THREE.Object3D | null => {
  for (let node: THREE.Object3D | null = object; node; node = node.parent) if (node.userData.acUnit !== undefined || node.userData.plug === true) return node
  return null
}

/** Le groupe du modèle de caméra dont l'objet fait partie (celui que marque `userData.camera`), ou null. */
const cameraOf = (object: THREE.Object3D): THREE.Object3D | null => {
  for (let node: THREE.Object3D | null = object; node; node = node.parent) if (node.userData.camera) return node
  return null
}

/**
 * La vue « Matrix » : toute la scène réduite à ses arêtes sur fond noir, une teinte de vert par genre, et les caméras en blanc plein, et elles comme les lampes à piloter entourées de trois cercles rouges.
 * Les arêtes sont calculées une seule fois, à la première demande (le plus long : les maillages fondus sont gros), puis la vue ne fait que
 * montrer ou cacher. Les maillages en copies (herbe, feuilles, fleurs : trop nombreux) sont simplement cachés.
 */
export const createMatrix = (root: THREE.Object3D): ((on: boolean) => void) & { tint: () => void; cameras: (states: Record<string, CameraState>) => void; devices: (running: Record<string, boolean | null>) => void; theme: (light: boolean) => number } => {
  const bulbs: { bulb: THREE.Mesh; rings: THREE.LineBasicMaterial }[] = []
  const pairs: Pair[] = []
  const known = new Set<THREE.Mesh>()
  const ringed = new Set<THREE.Object3D>()
  const cameraRings = new Map<string, THREE.LineBasicMaterial>()
  const deviceRings = new Map<string, THREE.LineBasicMaterial>()
  const materials = Object.fromEntries(Object.entries(MATRIX_COLORS).map(([kind, color]) => [kind, new THREE.LineBasicMaterial({ color, transparent: true, opacity: LINE_OPACITY, depthWrite: false })]))
  const white = new THREE.MeshBasicMaterial({ color: 0xffffff })
  // Chaque fenêtre à volet a ses deux matériaux : le fil de fer de ses lames et le trait de son cadre. Leur couleur dit l'état du volet (`tint`) : violet fermé, bleu ciel ouvert.
  const shutters = new Map<THREE.Object3D, { wire: THREE.MeshBasicMaterial; line: THREE.LineBasicMaterial }>()
  root.traverse((object) => {
    if (object.userData.shutter !== undefined) shutters.set(object, { wire: new THREE.MeshBasicMaterial({ color: MATRIX_SHUTTER.open, wireframe: true }), line: new THREE.LineBasicMaterial({ color: MATRIX_SHUTTER.open }) })
  })
  // La fenêtre (le parent du groupe de lames) dont l'objet fait partie : son cadre prend la couleur de son volet.
  const windowOf = (object: THREE.Object3D): THREE.Object3D | null => {
    for (let node: THREE.Object3D | null = object; node; node = node.parent) for (const slats of shutters.keys()) if (slats.parent === node) return slats
    return null
  }
  // Le repère d'une lampe : trois cercles rouges de 10 cm de rayon, un par plan, autour de l'ampoule.
  const circle = new THREE.BufferGeometry().setFromPoints(Array.from({ length: 32 }, (_, index) => new THREE.Vector3(Math.cos((index / 32) * Math.PI * 2) * 0.1, Math.sin((index / 32) * Math.PI * 2) * 0.1, 0)))
  const ring = new THREE.LineBasicMaterial({ color: MATRIX_CAMERA })
  const marker = (scale = 1, material: THREE.LineBasicMaterial = ring): THREE.Group => {
    const rings = new THREE.Group()
    const flat = new THREE.LineLoop(circle, material)
    const upright = new THREE.LineLoop(circle, material)
    const side = new THREE.LineLoop(circle, material)
    upright.rotation.x = Math.PI / 2
    side.rotation.y = Math.PI / 2
    rings.add(flat, upright, side)
    rings.scale.setScalar(scale)
    rings.visible = false
    return rings
  }
  // Les meshes apparus depuis la dernière fois (les ampoules nues des lampes sans luminaire n'existent qu'une fois les lampes lues).
  const scan = (): Pair[] => {
    const meshes: THREE.Mesh[] = []
    root.traverse((object) => {
      const mesh = object as THREE.Mesh
      if (mesh.isMesh && !known.has(mesh)) meshes.push(mesh)
    })
    const found: Pair[] = []
    for (const mesh of meshes) {
      known.add(mesh)
      // Les caméras et les ampoules qu'on peut piloter (`fixture` : luminaire ; `lampBulb` : ampoule nue) sont ce qu'on doit voir : rouge plein.
      if (mesh.userData.fixture === true || mesh.userData.lampBulb === true) {
        // L'ampoule garde sa couleur (celle de la lampe quand elle est allumée, un gris terne quand elle est éteinte) ; un repère rouge l'entoure.
        // Ses cercles ont leur propre matériau : jaunes quand la lampe est allumée, rouges quand elle est éteinte ou injoignable (`tint`).
        const own = new THREE.LineBasicMaterial({ color: MATRIX_CAMERA })
        bulbs.push({ bulb: mesh, rings: own })
        const rings = marker(1, own)
        mesh.add(rings)
        found.push({ mesh, edges: null, marker: rings })
        continue
      }
      const slats = shutterOf(mesh)
      if (slats) {
        found.push({ mesh, edges: null, original: mesh.material, swap: shutters.get(slats)?.wire })
        continue
      }
      // Les clims : leur voyant garde sa couleur (vert en marche, rouge à l'arrêt), le reste de l'unité est en blanc plein, comme les caméras.
      if (mesh.userData.acLed !== undefined || mesh.userData.plugLed === true) continue
      const unit = unitOf(mesh)
      if (unit) {
        // Autour de chaque appareil, trois cercles à son matériau : verts en marche, rouges à l'arrêt ou sans état (`devices`).
        let rings: THREE.Object3D | undefined
        if (!ringed.has(unit)) {
          ringed.add(unit)
          const own = new THREE.LineBasicMaterial({ color: MATRIX_CAMERA })
          const heater = unit.userData.plug === true
          deviceRings.set(heater ? 'plug' : (unit.userData.acUnit as string), own)
          rings = marker(heater ? 3.5 : 5, own)
          if (heater) rings.position.set(0, 0.27, 0)
          unit.add(rings)
        }
        found.push({ mesh, edges: null, original: mesh.material, marker: rings })
        continue
      }
      const camera = cameraOf(mesh)
      if (camera) {
        // Une caméra : son modèle en blanc plein, entouré lui aussi de trois cercles rouges (un seul jeu par caméra, plus larges que ceux d'une ampoule).
        let rings: THREE.Object3D | undefined
        if (!ringed.has(camera)) {
          ringed.add(camera)
          // Ses cercles ont leur matériau : verts quand la caméra tourne, orange quand elle démarre, rouges coupée ou sans état (`cameras`).
          const own = new THREE.LineBasicMaterial({ color: MATRIX_CAMERA })
          cameraRings.set(camera.userData.camera as string, own)
          rings = marker(2, own)
          rings.position.set(0, 0, 0.12)
          camera.add(rings)
        }
        found.push({ mesh, edges: null, original: mesh.material, marker: rings })
        continue
      }
      if ((mesh as THREE.InstancedMesh).isInstancedMesh || !mesh.parent) {
        found.push({ mesh, edges: null })
        continue
      }
      // Les arêtes sont voisines du maillage (un maillage caché cache ses enfants), à la même place.
      const framed = windowOf(mesh)
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 30), (framed && shutters.get(framed)?.line) || materials[kindOf(mesh)])
      edges.position.copy(mesh.position)
      edges.quaternion.copy(mesh.quaternion)
      edges.scale.copy(mesh.scale)
      edges.visible = false
      mesh.parent.add(edges)
      found.push({ mesh, edges })
    }
    return found
  }
  // Ce qui était caché avant la vue Matrix le reste (volets relevés, par exemple).
  const hiddenBefore = new Set<THREE.Object3D>()
  const [off, unreachable] = [new THREE.Color(BULB_OFF), new THREE.Color(0xff2a1f)]
  const tint = (): void => {
    // Un volet fermé (sa part fermée à atteindre, `userData.goal`, d'au moins la moitié) est violet, un volet ouvert bleu ciel.
    for (const [slats, { wire, line }] of shutters) {
      const color = ((slats.userData.goal as number | undefined) ?? 0) >= 0.5 ? MATRIX_SHUTTER.closed : MATRIX_SHUTTER.open
      wire.color.set(color)
      line.color.set(color)
    }
    for (const { bulb, rings } of bulbs) {
      const color = (bulb.material as THREE.MeshBasicMaterial).color
      rings.color.set(color.equals(off) || color.equals(unreachable) ? MATRIX_CAMERA : 0xffd23a)
    }
  }
  // Les derniers états reçus (caméras, appareils), gardés pour colorer les cercles dès qu'ils existent.
  let cameraStates: Record<string, CameraState> = {}
  let running: Record<string, boolean | null> = {}
  const paint = (): void => {
    for (const [name, rings] of cameraRings) rings.color.set(cameraStates[name] === 'on' ? 0x2fd45a : cameraStates[name] === 'starting' ? 0xff9a1f : MATRIX_CAMERA)
    for (const [id, rings] of deviceRings) rings.color.set(running[id] === true ? 0x2fd45a : MATRIX_CAMERA)
  }
  const show = (on: boolean): void => {
    tint()
    if (on) {
      pairs.push(...scan())
      // Les cercles naissent au premier passage : on leur redonne les derniers états reçus.
      tint()
      paint()
      for (const { mesh, edges, original, marker, swap } of pairs) {
        if (marker) marker.visible = true
        if (original) {
          mesh.material = swap ?? white
          continue
        }
        if (marker) continue
        if (!mesh.visible) hiddenBefore.add(mesh)
        mesh.visible = false
        if (edges && !hiddenBefore.has(mesh)) edges.visible = true
      }
      return
    }
    for (const { mesh, edges, original, marker } of pairs) {
      if (marker) marker.visible = false
      if (original) {
        mesh.material = original
        continue
      }
      if (marker) continue
      if (edges) edges.visible = false
      mesh.visible = !hiddenBefore.has(mesh)
    }
    hiddenBefore.clear()
  }
  const cameras = (states: Record<string, CameraState>): void => {
    cameraStates = states
    paint()
  }
  // Les clims (par identifiant) et le radiateur (`plug`) : en marche ou non.
  const devices = (states: Record<string, boolean | null>): void => {
    running = states
    paint()
  }
  // Le thème : clair (gris sur fond clair) ou sombre (verts sur fond noir) ; rend la couleur du fond à donner au rendu.
  const theme = (light: boolean): number => {
    for (const [kind, material] of Object.entries(materials)) material.color.set(light ? MATRIX_LIGHT.colors[kind] : MATRIX_COLORS[kind])
    white.color.set(light ? MATRIX_LIGHT.solid : 0xffffff)
    return light ? MATRIX_LIGHT.background : MATRIX_DARK_BACKGROUND
  }
  return Object.assign(show, { tint, cameras, devices, theme })
}

/** Les étiquettes de température des clims, en vue Matrix. */
export interface AcLabels {
  /** La température de la pièce lue par chaque clim (°C), par identifiant ; null : inconnue (l'étiquette montre « – »). */
  /** `running` : pour une clim, si elle est en marche (son étiquette est alors verte ; rouge à l'arrêt ou sans état) ; les autres étiquettes, celles des détecteurs Hue, sont orange. */
  apply: (temps: Record<string, number | null>, running?: Record<string, boolean | null>) => void
  /** Montre ou cache les étiquettes (elles ne se voient qu'en vue Matrix). */
  show: (on: boolean) => void
}

/**
 * À côté de chaque clim de la scène (marquée `userData.acUnit`), et aux places données par `extra`, une étiquette qui donne la température du lieu. C'est un `Sprite` : elle fait
 * toujours face à l'utilisateur, même quand il tourne la vue, et se voit à travers les murs (elle tranche, en rouge comme les repères des lampes).
 */
export const createAcLabels = (root: THREE.Object3D, extra: { id: string; at: THREE.Vector3 }[] = []): AcLabels => {
  const labels = new Map<string, { sprite: THREE.Sprite; canvas: HTMLCanvasElement; texture: THREE.CanvasTexture; shown: string }>()
  const label = (id: string, place: (sprite: THREE.Sprite) => void): void => {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 128
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true }))
    sprite.scale.set(0.6, 0.3, 1)
    sprite.renderOrder = 10
    sprite.visible = false
    root.add(sprite)
    place(sprite)
    labels.set(id, { sprite, canvas, texture, shown: '' })
  }
  // Juste au-dessus de chaque clim, dans le repère de la scène.
  root.traverse((object) => {
    const id = object.userData.acUnit as string | undefined
    if (id && !labels.has(id)) label(id, (sprite) => root.worldToLocal(object.getWorldPosition(sprite.position)).add(new THREE.Vector3(0, 0.3, 0)))
  })
  // Et aux places données (`extra`) : les températures lues par les détecteurs Hue (salle de bain, cage à perruches).
  for (const { id, at } of extra) label(id, (sprite) => sprite.position.copy(at))
  const draw = (canvas: HTMLCanvasElement, text: string, color: string): void => {
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.font = 'bold 84px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.lineWidth = 10
    ctx.strokeStyle = '#000000'
    ctx.strokeText(text, canvas.width / 2, canvas.height / 2)
    ctx.fillStyle = color
    ctx.fillText(text, canvas.width / 2, canvas.height / 2)
  }
  return {
    apply: (temps, running = {}) => {
      for (const [id, label] of labels) {
        const value = temps[id] ?? null
        const text = value === null ? '–' : `${value.toFixed(1).replace('.', ',')}°`
        const color = id in running ? (running[id] === true ? '#2fd45a' : '#ff3b30') : '#ff9a1f'
        if (`${text}${color}` === label.shown) continue
        label.shown = `${text}${color}`
        draw(label.canvas, text, color)
        label.texture.needsUpdate = true
      }
    },
    show: (on) => {
      for (const { sprite } of labels.values()) sprite.visible = on
    },
  }
}
