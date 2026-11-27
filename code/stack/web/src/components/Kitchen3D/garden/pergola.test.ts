import type * as THREE from 'three'
import { stubCanvasContext } from '@/test/canvas'
import { buildPergola, PERGOLA, PERGOLA_FRONT } from './pergola'

const sizeOf = (mesh: THREE.Mesh) => (mesh.geometry as THREE.BoxGeometry).parameters

describe('PERGOLA_FRONT', () => {
  it('de la façade au rang de poteaux de devant, une fois la pergola collée au mur', () => {
    expect(PERGOLA_FRONT).toBeCloseTo(PERGOLA.deep - PERGOLA.posts.rows[0])
  })
})

describe('buildPergola', () => {
  beforeEach(() => {
    stubCanvasContext(null)
  })

  const parts = () => buildPergola().children as THREE.Mesh[]

  it('six poteaux de 9 cm sur leurs pieds d’acier, coiffés d’un chapeau', () => {
    const meshes = parts()
    const posts = meshes.filter((mesh) => sizeOf(mesh).height === PERGOLA.posts.tall)
    expect(posts).toHaveLength(6)
    for (const post of posts) {
      expect(sizeOf(post).width).toBe(PERGOLA.posts.side)
      // Le poteau commence au-dessus de son pied.
      expect(post.position.y - PERGOLA.posts.tall / 2).toBeCloseTo(PERGOLA.foot)
      expect(PERGOLA.posts.along).toContain(post.position.x)
      expect(PERGOLA.posts.rows).toContain(post.position.z)
    }
    // Sous chaque poteau : une platine au sol, une tige, une platine sous le bois, en acier.
    const steel = meshes[0].material
    const feet = meshes.filter((mesh) => mesh.material === steel && mesh.position.y < PERGOLA.foot)
    expect(feet).toHaveLength(18)
    expect(posts[0].material).not.toBe(steel)
    expect(meshes.filter((mesh) => sizeOf(mesh).height === 0.08)).toHaveLength(6)
  })

  it('les jambes de force à 45° : en profondeur là où la traverse continue, et dans la longueur vers chaque travée', () => {
    const meshes = parts()
    const { brace } = PERGOLA
    // En profondeur : deux par poteau de devant, une seule par poteau du fond (pas de jambe au-delà du bout des traverses).
    const deep = meshes.filter((mesh) => sizeOf(mesh).depth === brace.long)
    expect(deep).toHaveLength(9)
    for (const strut of deep) {
      expect(Math.abs(strut.rotation.x)).toBeCloseTo(Math.PI / 4)
      expect(strut.position.z).toBeLessThanOrEqual(PERGOLA.deep - 0.1)
      expect(strut.position.y).toBe(brace.height)
    }
    expect(deep.filter((strut) => strut.position.z > PERGOLA.posts.rows[1])).toHaveLength(0)
    // Dans la longueur : quatre par rang, entre les poteaux.
    const long = meshes.filter((mesh) => sizeOf(mesh).width === brace.long)
    expect(long).toHaveLength(8)
    for (const strut of long) {
      expect(Math.abs(strut.rotation.z)).toBeCloseTo(Math.PI / 4)
      expect(Math.abs(strut.position.x)).toBeLessThan(PERGOLA.posts.along[2])
    }
  })

  it('six traverses par paires sur toute la profondeur, sept chevrons sur toute la longueur, dix fils d’acier au-dessus', () => {
    const meshes = parts()
    expect(meshes).toHaveLength(70)
    const { ties, rafters, wires } = PERGOLA
    const tieBoards = meshes.filter((mesh) => sizeOf(mesh).width === ties.thick)
    expect(tieBoards.map((board) => board.position.x)).toEqual(ties.along)
    expect(tieBoards.every((board) => sizeOf(board).depth === PERGOLA.deep && board.position.z === PERGOLA.deep / 2)).toBe(true)
    const rafterBoards = meshes.filter((mesh) => sizeOf(mesh).width === rafters.long)
    expect(rafterBoards.map((board) => board.position.z)).toEqual(rafters.rows)
    // Le haut des planches est le haut de la pergola.
    for (const board of [...tieBoards, ...rafterBoards]) expect(board.position.y + sizeOf(board).height / 2).toBeCloseTo(PERGOLA.top)
    const steel = meshes[0].material
    const cables = meshes.filter((mesh) => sizeOf(mesh).depth === wires.long)
    expect(cables.map((cable) => cable.position.x)).toEqual(wires.along)
    expect(cables.every((cable) => cable.material === steel && cable.position.y > PERGOLA.top)).toBe(true)
  })
})
