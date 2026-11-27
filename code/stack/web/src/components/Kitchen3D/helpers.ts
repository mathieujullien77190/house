import * as THREE from 'three'
import { RUNS } from './constants'
import { buildFurniture } from './furniture/furniture'
import { buildGarden } from './garden/garden'
import { buildShell } from './house/shell'
import { run } from './kitchen/runs'
import { kitchenMaps, kitchenMaterials } from './materials'
import type { SceneParts } from './types'

/** La scène : le gros œuvre, le mobilier, le jardin, puis les trois files de caissons (la hotte dans son groupe, pour la cacher). */
export const buildScene = (): SceneParts => {
  const maps = kitchenMaps()
  const materials = kitchenMaterials(maps)
  const root = new THREE.Group()
  const hoodParts = new THREE.Group()
  root.add(buildShell(materials, maps), buildFurniture(), buildGarden())
  for (const spec of RUNS) root.add(run(materials, spec, hoodParts))
  root.traverse((child) => {
    const mesh = child as THREE.Mesh
    if (mesh.isMesh) {
      mesh.castShadow = mesh.userData.fixture !== true
      mesh.receiveShadow = true
    }
  })
  return { root, hood: hoodParts }
}
