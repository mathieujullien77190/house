import * as THREE from 'three'

// La carte ESP32 à 38 broches des schémas 3D (ShutterWiring3D, ServoWiring3D). Dimensions en millimètres (1 unité three.js = 1 mm),
// la carte à plat, USB-C vers +z (vers le spectateur).

/** Colonne de l'ESP32 : à gauche ou à droite, l'USB-C étant vers le spectateur. */
export type Side = 'L' | 'R'

export const PITCH = 2.54
/** Hauteur du bout des broches au-dessus de la carte. */
export const PIN_TOP = 8.5
/** Les deux colonnes de broches sont à ± cette distance de l'axe de la carte. */
export const PIN_X = 12.7
/** Position de la première broche d'une colonne, puis le pas, sur l'axe z. */
export const PIN_Z0 = -22.86

/** Noms des broches de l'ESP32 38 broches, du haut (antenne) vers le bas (USB-C). */
export const ESP_LEFT = ['3V3', 'EN', 'VP', 'VN', 'G34', 'G35', 'G32', 'G33', 'G25', 'G26', 'G27', 'G14', 'G12', 'GND', 'G13', 'SD2', 'SD3', 'CMD', '5V']
export const ESP_RIGHT = ['GND', 'G23', 'G22', 'TX', 'RX', 'G21', 'GND', 'G19', 'G18', 'G5', 'G17', 'G16', 'G4', 'G0', 'G2', 'G15', 'SD1', 'SD0', 'CLK']

export const ESP_COLORS = {
  board: 0x1a1e23,
  chip: 0xbac1c8,
  antennaZone: 0x15181c,
  usb: 0xcfd5da,
  button: 0xd8dde1,
  header: 0x0d0f12,
  pin: 0xc9b25a,
  titleText: '#6b7684',
  mutedText: '#8b95a1',
} as const

/** Nom de la broche de l'ESP32 à ce rang de cette colonne. */
export const espName = (side: Side, index: number): string => (side === 'L' ? ESP_LEFT : ESP_RIGHT)[index]

/** Le bout de la broche de l'ESP32 à ce rang de cette colonne. */
export const espPin = (side: Side, index: number): THREE.Vector3 => new THREE.Vector3(side === 'L' ? -PIN_X : PIN_X, PIN_TOP, PIN_Z0 + index * PITCH)

export const material = (color: number, options: THREE.MeshStandardMaterialParameters = {}): THREE.MeshStandardMaterial =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.1, ...options })

export const box = (w: number, h: number, d: number, color: number, x: number, y: number, z: number): THREE.Mesh => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material(color))
  mesh.position.set(x, y, z)
  return mesh
}

export const cylinder = (radius: number, height: number, mat: THREE.Material, x: number, y: number, z: number, rotationZ = 0): THREE.Mesh => {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 16), mat)
  mesh.position.set(x, y, z)
  mesh.rotation.z = rotationZ
  return mesh
}

/** Un texte posé à plat au-dessus de la carte (il grossit et rapetisse avec le zoom, sans se chevaucher). */
export const textPlane = (
  text: string,
  color: string,
  align: CanvasTextAlign,
  x: number,
  z: number,
  w = 8,
  h = 2,
  bold = false,
  y = 0.95,
): THREE.Object3D => {
  const canvas = document.createElement('canvas')
  canvas.width = 64 * w
  canvas.height = 64 * h
  const g = canvas.getContext('2d')
  if (!g) return new THREE.Group()
  g.font = `${bold ? 700 : 500} ${Math.round(canvas.height * 0.62)}px system-ui, sans-serif`
  g.textBaseline = 'middle'
  g.textAlign = align
  g.fillStyle = color
  g.fillText(text, align === 'left' ? 6 : align === 'right' ? canvas.width - 6 : canvas.width / 2, canvas.height / 2 + 2)
  const texture = new THREE.CanvasTexture(canvas)
  texture.anisotropy = 4
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }))
  mesh.rotation.x = -Math.PI / 2
  mesh.position.set(x, y, z)
  return mesh
}

/** La carte ESP32 : module Wi-Fi, zone d'antenne, USB-C, deux boutons et les deux supports de broches. */
export const drawEspBoard = (root: THREE.Group): void => {
  root.add(box(28, 1.6, 52, ESP_COLORS.board, 0, 0, 0))
  root.add(box(18, 3.2, 25.5, ESP_COLORS.chip, 0, 2.4, -13.5))
  root.add(box(16, 0.2, 6, ESP_COLORS.antennaZone, 0, 4.1, -23.2))
  root.add(box(9, 3.2, 7.5, ESP_COLORS.usb, 0, 2.4, 24.5))
  root.add(box(3.6, 2, 3.6, ESP_COLORS.button, -7, 1.8, 20.5))
  root.add(box(3.6, 2, 3.6, ESP_COLORS.button, 7, 1.8, 20.5))
  root.add(box(2.5, 2.5, 48.3, ESP_COLORS.header, -PIN_X, 2.05, 0))
  root.add(box(2.5, 2.5, 48.3, ESP_COLORS.header, PIN_X, 2.05, 0))
  root.add(textPlane('ESP32', ESP_COLORS.titleText, 'center', 0, -31, 16, 3.5, true))
  root.add(textPlane('USB-C', ESP_COLORS.mutedText, 'center', 0, 31.5, 12, 2.5))
}

/** Une broche utilisée : la couleur de son nom (le nom reste toujours visible). */
export type UsedPins = Map<string, string>

/** Clé d'une broche dans `UsedPins`. */
export const pinKey = (side: Side, index: number): string => `${side}${index}`

/** Les broches de l'ESP32 : le nom des broches utilisées est en couleur et toujours là, les autres vont dans `pinNames` (qu'on peut cacher). */
export const drawEspPins = (root: THREE.Group, pinNames: THREE.Group, used: UsedPins): void => {
  const pinMaterial = material(ESP_COLORS.pin, { metalness: 0.7, roughness: 0.35 })
  for (const side of ['L', 'R'] as const) {
    const names = side === 'L' ? ESP_LEFT : ESP_RIGHT
    names.forEach((name, index) => {
      const p = espPin(side, index)
      root.add(cylinder(0.32, 8, pinMaterial, p.x, 4.5, p.z))
      const color = used.get(pinKey(side, index))
      const label = textPlane(name, color ?? ESP_COLORS.mutedText, side === 'L' ? 'right' : 'left', side === 'L' ? -19.6 : 19.6, p.z, 8, 2, color !== undefined)
      if (color !== undefined) root.add(label)
      else pinNames.add(label)
    })
  }
}
