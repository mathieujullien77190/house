import * as THREE from 'three'
import { kindOf } from './merge'

/**
 * Les couleurs de la vue « Matrix », dans le même ton vert mais qui changent selon le genre (`kindOf`) : le gros œuvre (la maison), le
 * mobilier, les arbres, le reste du jardin. Les arêtes sont fines et à demi transparentes pour ne pas crier ; les caméras (blanc plein) et les lampes qu'on peut
 * piloter sont chacune entourées de trois cercles rouges : ce sont eux qu'on doit voir d'abord. Une ampoule allumée garde la couleur de sa lampe,
 * une éteinte reste d'un gris terne.
 */
export const MATRIX_COLORS: Record<string, number> = { shell: 0x2c9a68, furniture: 0x5e7a52, tree: 0x1f7a52, garden: 0x2f8f6f }
export const MATRIX_CAMERA = 0xff3b30
/** Les volets qu'on peut piloter : ambre, en fil de fer (leurs lames apparaissent et disparaissent, le maillage suit tout seul). */
export const MATRIX_SHUTTER = 0xffb020
const LINE_OPACITY = 0.8

/** Un maillage et ses arêtes (ou, pour une caméra, son matériau d'origine) : l'un est caché quand l'autre se montre. */
interface Pair {
  mesh: THREE.Mesh
  edges: THREE.Object3D | null
  original?: THREE.Material | THREE.Material[]
  /** Pour une ampoule : le repère rouge autour d'elle (l'ampoule garde sa couleur, qui dit si la lampe est allumée). */
  marker?: THREE.Object3D
  /** Un volet : son maillage reste en place, en fil de fer ambre. */
  shutter?: boolean
}

/** Vrai si l'objet est dans un volet roulant (un groupe de lames marqué par `userData.shutter`). */
const inShutter = (object: THREE.Object3D): boolean => {
  for (let node: THREE.Object3D | null = object; node; node = node.parent) if (node.userData.shutter !== undefined) return true
  return false
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
export const createMatrix = (root: THREE.Object3D): ((on: boolean) => void) => {
  const pairs: Pair[] = []
  const known = new Set<THREE.Mesh>()
  const ringed = new Set<THREE.Object3D>()
  const materials = Object.fromEntries(Object.entries(MATRIX_COLORS).map(([kind, color]) => [kind, new THREE.LineBasicMaterial({ color, transparent: true, opacity: LINE_OPACITY, depthWrite: false })]))
  const white = new THREE.MeshBasicMaterial({ color: 0xffffff })
  const amber = new THREE.MeshBasicMaterial({ color: MATRIX_SHUTTER, wireframe: true })
  // Le repère d'une lampe : trois cercles rouges de 10 cm de rayon, un par plan, autour de l'ampoule.
  const circle = new THREE.BufferGeometry().setFromPoints(Array.from({ length: 32 }, (_, index) => new THREE.Vector3(Math.cos((index / 32) * Math.PI * 2) * 0.1, Math.sin((index / 32) * Math.PI * 2) * 0.1, 0)))
  const ring = new THREE.LineBasicMaterial({ color: MATRIX_CAMERA })
  const marker = (scale = 1): THREE.Group => {
    const rings = new THREE.Group()
    const flat = new THREE.LineLoop(circle, ring)
    const upright = new THREE.LineLoop(circle, ring)
    const side = new THREE.LineLoop(circle, ring)
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
        const rings = marker()
        mesh.add(rings)
        found.push({ mesh, edges: null, marker: rings })
        continue
      }
      if (inShutter(mesh)) {
        found.push({ mesh, edges: null, original: mesh.material, shutter: true })
        continue
      }
      const camera = cameraOf(mesh)
      if (camera) {
        // Une caméra : son modèle en blanc plein, entouré lui aussi de trois cercles rouges (un seul jeu par caméra, plus larges que ceux d'une ampoule).
        let rings: THREE.Object3D | undefined
        if (!ringed.has(camera)) {
          ringed.add(camera)
          rings = marker(2)
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
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 30), materials[kindOf(mesh)])
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
  return (on) => {
    if (on) {
      pairs.push(...scan())
      for (const { mesh, edges, original, marker, shutter } of pairs) {
        if (marker) marker.visible = true
        if (original) {
          mesh.material = shutter ? amber : white
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
}
