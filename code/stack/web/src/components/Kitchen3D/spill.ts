import * as THREE from 'three'
import { REST, ROOM } from './constants'
import { OUTDOOR } from './layers'
import { shutterWindows } from './shutters'

/** La lumière qui sort par une fenêtre : sa force au plus, jusqu'où une lampe compte (m), jusqu'où elle éclaire dehors (m), à quelle distance de la fenêtre elle est posée (m). */
const SPILL = { intensity: 2.2, reach: 6, range: 5, out: 0.7 }

/** Ce que la scène expose : `apply` règle la lumière qui sort par chaque fenêtre. */
export interface Spill {
  /** `sources` : les lampes allumées de la scène ; `closed` : la part fermée de chaque volet (0 : ouvert, 1 : fermé), par mot-clé. */
  apply: (sources: { position: THREE.Vector3; intensity: number; color: THREE.Color; indoor: boolean }[], closed: Record<string, number>) => void
}

/**
 * Les lampes de la maison n'éclairent pas le jardin (voir `layers.ts`) ; mais par une fenêtre dont le volet est ouvert, un peu de leur lumière sort.
 * Chaque fenêtre à volet a donc une petite lumière du dehors, posée devant elle : elle s'allume selon les lampes allumées dans la pièce (à moins de 6 m
 * de la fenêtre, de moins en moins loin) et la part ouverte du volet ; elle prend leur couleur. Volet fermé, ou lampes éteintes : elle est cachée.
 */
export const createSpill = (root: THREE.Object3D): Spill => {
  const group = new THREE.Group()
  root.add(group)
  const windows = shutterWindows(root).map(({ key, object }) => {
    const at = root.worldToLocal(object.getWorldPosition(new THREE.Vector3()))
    // Le dehors : du côté du mur le plus proche (les murs suivent les axes).
    const gaps: [number, THREE.Vector3][] = [
      [Math.abs(at.x - ROOM.xMin), new THREE.Vector3(-1, 0, 0)],
      [Math.abs(at.x - ROOM.xMax), new THREE.Vector3(1, 0, 0)],
      [Math.abs(at.z - REST.west), new THREE.Vector3(0, 0, -1)],
      [Math.abs(at.z - ROOM.zMax), new THREE.Vector3(0, 0, 1)],
    ]
    const outward = gaps.reduce((best, gap) => (gap[0] < best[0] ? gap : best))[1]
    const light = new THREE.PointLight(0xffd9a0, 0, SPILL.range, 2)
    light.position.copy(at).addScaledVector(outward, SPILL.out).setY(1.3)
    light.layers.set(OUTDOOR)
    light.visible = false
    group.add(light)
    return { key, at, light }
  })
  return {
    apply: (sources, closed) => {
      for (const { key, at, light } of windows) {
        const open = 1 - (closed[key] ?? 0)
        let level = 0
        const color = new THREE.Color(0, 0, 0)
        for (const source of sources) {
          if (!source.indoor) continue
          const near = Math.max(0, 1 - Math.hypot(source.position.x - at.x, source.position.z - at.z) / SPILL.reach)
          const share = near * source.intensity
          level += share
          color.add(source.color.clone().multiplyScalar(share))
        }
        const intensity = SPILL.intensity * open * Math.min(1, level / 5)
        light.intensity = intensity
        light.visible = intensity > 0.02
        if (level > 0) light.color.copy(color.multiplyScalar(1 / level))
      }
    },
  }
}
