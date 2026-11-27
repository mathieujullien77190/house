import * as THREE from 'three'
import { CABINET, COUNTER_TOP, HOB, SPLASH } from '@/components/Kitchen3D/constants'
import type { KitchenMaterials } from '@/components/Kitchen3D/materials'
import { box } from '@/components/Kitchen3D/primitives'
import type { RunSpec } from '@/components/Kitchen3D/types'
import { cabinet, endPanel } from './units'
import { hob, hood, sink, worktop } from './worktop'

/** Une file de caissons avec son plan de travail, et ce qu'elle porte (évier, plaque, hotte, panneau de bout). Repère de la file : x le long de la file, z vers le devant (0 = façade). */
export const run = (materials: KitchenMaterials, spec: RunSpec, hoodParts: THREE.Group): THREE.Group => {
  const group = new THREE.Group()
  group.position.set(spec.x, 0, spec.z)
  group.rotation.y = spec.angle
  let cursor = 0
  const centers = spec.modules.map((module) => {
    const center = cursor + module.width / 2
    cursor += module.width
    return center
  })
  spec.modules.forEach((module, index) => group.add(cabinet(materials, module, centers[index])))
  const sinkIndex = spec.modules.findIndex((module) => module.kind === 'sink')
  group.add(worktop(materials, cursor, sinkIndex >= 0 ? centers[sinkIndex] : null))
  if (sinkIndex >= 0) group.add(sink(materials, centers[sinkIndex]))
  if (spec.id === HOB.run) {
    group.add(hob(materials, centers[HOB.module]))
    // La crédence en inox derrière la plaque, contre le mur.
    group.add(box(SPLASH.width, SPLASH.height, 0.01, materials.steel, centers[HOB.module], COUNTER_TOP + SPLASH.height / 2, -CABINET.depth + 0.005))
    hoodParts.add(hood(materials, centers[HOB.module]))
    group.add(hoodParts)
  }
  if (spec.endPanel) group.add(endPanel(materials, cursor))
  return group
}
