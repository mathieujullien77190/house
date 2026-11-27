import * as THREE from 'three'

/**
 * Met la pendule de la scène à l'heure : ses deux aiguilles sont des groupes marqués par `userData.clockHand` (« hour » ou « minute »), qui
 * tournent autour du centre du cadran. La pendule est vue de la cuisine, dos à +z : un angle positif autour de z y tourne dans le sens horaire.
 */
export const applyClock = (root: THREE.Object3D, now: Date): void => {
  const minutes = now.getMinutes() + now.getSeconds() / 60
  root.traverse((object) => {
    const hand = object.userData.clockHand as string | undefined
    if (!hand) return
    object.rotation.z = (hand === 'minute' ? minutes / 60 : ((now.getHours() % 12) + minutes / 60) / 12) * Math.PI * 2
  })
}

/** Les clims de la scène (leur bloc est marqué par `userData.acUnit`, l'identifiant de la vraie clim) : ce qu'on clique pour l'allumer ou l'éteindre. */
export const acMeshes = (root: THREE.Object3D): { id: string; object: THREE.Object3D }[] => {
  const found: { id: string; object: THREE.Object3D }[] = []
  root.traverse((object) => {
    const id = object.userData.acUnit as string | undefined
    if (id) found.push({ id, object })
  })
  return found
}

/** Les caméras de la scène (leur groupe est marqué par `userData.camera`, le nom de la vraie caméra) : ce qu'on clique pour ouvrir la caméra. */
export const cameraMeshes = (root: THREE.Object3D): { name: string; object: THREE.Object3D }[] => {
  const found: { name: string; object: THREE.Object3D }[] = []
  root.traverse((object) => {
    const name = object.userData.camera as string | undefined
    if (name) found.push({ name, object })
  })
  return found
}

/** Les couleurs du voyant de la clim : en marche, à l'arrêt, état inconnu (pas lue ou injoignable). */
export const AC_LED = { on: 0x2fd45a, off: 0xd43a2f, unknown: 0x8a8f96 }

/**
 * Règle le voyant de chaque clim (le petit pavé marqué par `userData.acLed`, l'identifiant de la vraie clim) d'après `powers` : vert en
 * marche, rouge à l'arrêt, gris si on ne sait pas (absente de `powers`, ou null).
 */
export const applyAcLed = (root: THREE.Object3D, powers: Record<string, boolean | null>): void => {
  root.traverse((object) => {
    const id = object.userData.acLed as string | undefined
    if (!id) return
    const power = powers[id] ?? null
    const material = (object as THREE.Mesh).material as THREE.MeshBasicMaterial
    material.color.setHex(power === null ? AC_LED.unknown : power ? AC_LED.on : AC_LED.off)
  })
}
