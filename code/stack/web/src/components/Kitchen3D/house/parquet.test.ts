import * as THREE from 'three'
import { stubCanvasContext } from '@/test/canvas'
import { parquet, PLANK, SMALL_PLANK } from './parquet'

/** La place et la taille de la lame `index` d'un parquet. */
const plankOf = (mesh: THREE.InstancedMesh, index: number) => {
  const matrix = new THREE.Matrix4()
  mesh.getMatrixAt(index, matrix)
  const position = new THREE.Vector3()
  const scale = new THREE.Vector3()
  matrix.decompose(position, new THREE.Quaternion(), scale)
  return { position, scale }
}

/** La teinte de chaque lame. */
const tintsOf = (mesh: THREE.InstancedMesh): number[] =>
  Array.from({ length: mesh.count }, (_, index) => {
    const color = new THREE.Color()
    mesh.getColorAt(index, color)
    return color.getHex()
  })

describe('parquet', () => {
  beforeEach(() => {
    stubCanvasContext(null)
  })

  it('des lames de 110 cm sur 18 cm posées au tiers, coupées au bord de la pièce, un joint entre elles', () => {
    // Deux rangées de 2,20 m : deux lames entières, puis, décalée d'un tiers de lame, une chute, une lame entière et une lame coupée.
    const mesh = parquet([[0, 2.2, 0, 0.36]])
    expect(mesh.count).toBe(5)
    const first = plankOf(mesh, 0)
    expect(first.scale.x).toBeCloseTo(PLANK.length - PLANK.joint)
    expect(first.scale.y).toBeCloseTo(PLANK.thickness)
    expect(first.scale.z).toBeCloseTo(PLANK.width - PLANK.joint)
    expect(first.position.x).toBeCloseTo(PLANK.length / 2)
    expect(first.position.y).toBeCloseTo(-PLANK.thickness / 2)
    expect(first.position.z).toBeCloseTo(PLANK.width / 2)
    const offcut = plankOf(mesh, 2)
    expect(offcut.scale.x).toBeCloseTo(PLANK.length / 3 - PLANK.joint / 2)
    expect(offcut.position.z).toBeCloseTo(PLANK.width * 1.5)
    // Chaque lame a sa teinte.
    expect(new Set(tintsOf(mesh)).size).toBe(5)
  })

  it('une chute de moins de 4 mm, en long comme en large, n’est pas posée', () => {
    expect(parquet([[0, PLANK.length + 0.003, 0, PLANK.width + 0.003]]).count).toBe(1)
  })

  it('la trame est la même pour toute la maison : du côté négatif, le décalage au tiers continue', () => {
    const mesh = parquet([[0, 1.1, -0.18, 0]])
    expect(mesh.count).toBe(2)
    expect(plankOf(mesh, 0).scale.x).toBeCloseTo((PLANK.length * 2) / 3 - PLANK.joint / 2)
    expect(plankOf(mesh, 0).position.z).toBeCloseTo(-PLANK.width / 2)
  })

  it('plusieurs pièces : un seul maillage, et les lames se suivent de l’une à l’autre', () => {
    const whole = parquet([[0, 2.2, 0, 0.18]])
    const halves = parquet([
      [0, 1.1, 0, 0.18],
      [1.1, 2.2, 0, 0.18],
    ])
    expect(halves.count).toBe(whole.count)
    expect(plankOf(halves, 1).position.x).toBeCloseTo(plankOf(whole, 1).position.x)
    // La teinte d'une lame vient de sa place dans la trame : la même à chaque ouverture.
    expect(tintsOf(halves)).toEqual(tintsOf(whole))
    expect(tintsOf(parquet([[0, 2.2, 0, 0.18]]))).toEqual(tintsOf(whole))
  })

  it('tournées d’un quart de tour, de petites lames courent le long de z', () => {
    const mesh = parquet([[0, SMALL_PLANK.width, 0, SMALL_PLANK.length]], SMALL_PLANK, true)
    expect(mesh.count).toBe(1)
    const { position, scale } = plankOf(mesh, 0)
    expect(scale.x).toBeCloseTo(SMALL_PLANK.width - PLANK.joint)
    expect(scale.z).toBeCloseTo(SMALL_PLANK.length - PLANK.joint)
    expect(position.x).toBeCloseTo(SMALL_PLANK.width / 2)
    expect(position.z).toBeCloseTo(SMALL_PLANK.length / 2)
  })
})
