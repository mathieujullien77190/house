/** La caméra d'un chemin du disque backup (clips/<caméra>/<fichier>, snapshots/<caméra>/...) : son deuxième segment ; null s'il n'y en a pas. */
export const cameraOfPath = (path: string): string | null => {
  const parts = path.split('/')
  return parts.length >= 3 ? parts[1] : null
}
