import * as THREE from 'three'
import { QUALITY, RUNS } from './constants'
import type { Quality } from './constants'
import { buildFurniture } from './furniture/furniture'
import { buildGarden } from './garden/garden'
import { buildShell } from './house/shell'
import { run } from './kitchen/runs'
import { kitchenMaps, kitchenMaterials } from './materials'
import { mergeStatic, shareMaterials } from './merge'
import { shutterWindows } from './shutters'
import type { SceneParts } from './types'

/**
 * La scène : le gros œuvre, le mobilier, le jardin, puis les trois files de caissons (la hotte dans son groupe, pour la cacher). Une fois
 * tout construit, les matériaux identiques n'en font qu'un et ce qui ne bouge jamais est fondu en un maillage par matériau (le groupe
 * `static`, ajouté en dernier) : bien moins d'appels de dessin, pour le même rendu. `quality` : la densité de l'herbe (téléphone).
 */
export const buildScene = (quality: Quality = QUALITY.desktop): SceneParts => {
  const maps = kitchenMaps()
  const materials = kitchenMaterials(maps)
  const root = new THREE.Group()
  const hoodParts = new THREE.Group()
  root.add(buildShell(materials, maps), buildFurniture(), buildGarden(quality.grass))
  for (const spec of RUNS) root.add(run(materials, spec, hoodParts))
  // Une ampoule et un voyant de clim gardent leur matériau : leur couleur suit la maison.
  shareMaterials(root, (mesh) => mesh.userData.fixture === true || mesh.userData.acLed !== undefined)
  // Les fenêtres à volet (on les clique en entier) et la hotte restent entières.
  mergeStatic(root, [hoodParts, ...shutterWindows(root).map((window) => window.object)])
  root.traverse((child) => {
    const mesh = child as THREE.Mesh
    if (mesh.isMesh) {
      // Ne portent pas d'ombre : les ampoules, et les petites choses du jardin marquées par `noShadow`.
      mesh.castShadow = mesh.userData.fixture !== true && mesh.userData.noShadow !== true
      mesh.receiveShadow = true
    }
  })
  return { root, hood: hoodParts }
}
