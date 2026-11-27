import * as THREE from 'three'
import { still, sway, swaying, WIND } from './wind'

/** Un arbre et une haie marqués, et un objet qui ne bouge pas. */
const garden = () => {
  const root = new THREE.Group()
  const tree = new THREE.Group()
  tree.position.set(2, 0, -3)
  tree.rotation.y = 0.7
  tree.scale.set(1.1, 0.85, 1.1)
  tree.userData.sway = 0.03
  const hedge = new THREE.Mesh()
  hedge.userData.sway = 0.04
  const wall = new THREE.Mesh()
  const inner = new THREE.Group()
  inner.add(hedge)
  root.add(tree, inner, wall)
  return { root, tree, hedge, wall }
}

describe('swaying', () => {
  it('retrouve ce qui est marqué `sway`, où qu’il soit dans la scène', () => {
    const { root, tree, hedge } = garden()
    expect(swaying(root)).toEqual([tree, hedge])
    expect(swaying(new THREE.Group())).toEqual([])
  })
})

describe('sway, still', () => {
  it('chaque objet penche du côté où va le vent, d’autant plus qu’on monte ; son pied ne bouge pas', () => {
    const { root, hedge, wall } = garden()
    const movers = swaying(root)
    const time = 0.4
    sway(movers, time)
    expect(hedge.matrixAutoUpdate).toBe(false)
    expect(wall.matrixAutoUpdate).toBe(true)
    // La haie est le deuxième objet : son balancement à cet instant.
    const lean = 0.04 * (0.45 + 0.4 * Math.sin(time * 1.9 + 1.3) + 0.15 * Math.sin(time * 4.3 + 0.7))
    const cross = 0.04 * 0.15 * Math.sin(time * 2.7 + 1)
    const foot = new THREE.Vector3(5, 0, 5).applyMatrix4(hedge.matrix)
    expect(foot.toArray()).toEqual([5, 0, 5])
    const top = new THREE.Vector3(5, 2, 5).applyMatrix4(hedge.matrix)
    expect(top.x - 5).toBeCloseTo(2 * (lean * WIND.x - cross * WIND.z))
    expect(top.z - 5).toBeCloseTo(2 * (lean * WIND.z + cross * WIND.x))
    expect(top.y).toBe(2)
    // Il penche bien dans le sens du vent.
    expect((top.x - 5) * WIND.x + (top.z - 5) * WIND.z).toBeGreaterThan(0)
  })

  it('un objet posé, tourné et mis à l’échelle garde sa place : il penche dans son propre repère', () => {
    const { root, tree } = garden()
    sway(swaying(root), 1.2)
    const placed = new THREE.Matrix4().compose(tree.position, tree.quaternion, tree.scale)
    expect(new THREE.Vector3().setFromMatrixPosition(tree.matrix).toArray()).toEqual([2, 0, -3])
    expect(tree.matrix.equals(placed)).toBe(false)
    // Le balancement change d'un instant à l'autre.
    const first = tree.matrix.clone()
    sway(swaying(root), 1.7)
    expect(tree.matrix.equals(first)).toBe(false)
    expect(tree.matrixWorldNeedsUpdate).toBe(true)
  })

  it('le vent tombe : chaque objet se redresse', () => {
    const { root, tree, hedge } = garden()
    const movers = swaying(root)
    sway(movers, 2)
    still(movers)
    expect(tree.matrixAutoUpdate).toBe(true)
    expect(tree.matrix.equals(new THREE.Matrix4().compose(tree.position, tree.quaternion, tree.scale))).toBe(true)
    expect(hedge.matrix.equals(new THREE.Matrix4())).toBe(true)
  })

  it('le vent vient du sud-ouest', () => {
    expect(Math.hypot(WIND.x, WIND.z)).toBeCloseTo(1)
    expect(WIND.x).toBeGreaterThan(0)
    expect(WIND.z).toBeGreaterThan(0)
  })
})
