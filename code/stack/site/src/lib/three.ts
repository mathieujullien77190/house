import type * as THREE from 'three'

/** Libère la géométrie, les matériaux et les textures d'un objet three.js. */
export const disposeObject = (object: THREE.Object3D): void => {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh
    mesh.geometry?.dispose()
    const mat = mesh.material
    const materials = Array.isArray(mat) ? mat : mat ? [mat] : []
    for (const m of materials) {
      ;(m as THREE.MeshBasicMaterial).map?.dispose()
      m.dispose()
    }
  })
}

let webglSupport: boolean | undefined

/**
 * Vrai si le navigateur sait créer un contexte WebGL. Le test ne se fait qu'une fois et libère
 * aussitôt son contexte : les navigateurs en limitent le nombre (autour de 16) et en perdent
 * les plus anciens, ce qui vidait la vue 3D après plusieurs ouvertures.
 */
export const supportsWebGL = (): boolean => {
  if (webglSupport === undefined) {
    try {
      const gl = document.createElement('canvas').getContext('webgl2')
      webglSupport = gl !== null
      gl?.getExtension('WEBGL_lose_context')?.loseContext()
    } catch {
      webglSupport = false
    }
  }
  return webglSupport
}
