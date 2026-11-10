// L'ordre des caméras partout où on les liste (page de House Sync, énergie, clips) : celui de leur arrivée. Une caméra qui n'est pas dans la liste vient après,
// par ordre alphabétique. **Copié dans `api/src/lib/cameraOrder.ts`** (l'API ne dépend pas de House Sync) : si l'un change, changer l'autre.

/** Les caméras connues, dans l'ordre où elles sont arrivées. */
export const CAMERA_ORDER = ['voliere-interieur', 'voliere-exterieur', 'salon-de-jardin', 'voliere-toit']

const rank = (camera: string): number => {
  const index = CAMERA_ORDER.indexOf(camera)
  return index === -1 ? CAMERA_ORDER.length : index
}

/** Pour `Array.sort` : l'ordre d'arrivée, puis l'ordre alphabétique pour celles qui n'y sont pas. */
export const compareCameras = (a: string, b: string): number => rank(a) - rank(b) || a.localeCompare(b)

/** La clause SQL qui range une colonne de caméras dans cet ordre (à mettre après `ORDER BY`). */
export const cameraOrderSql = (column = 'camera'): string =>
  `CASE ${column} ${CAMERA_ORDER.map((camera, index) => `WHEN '${camera}' THEN ${index}`).join(' ')} ELSE ${CAMERA_ORDER.length} END, ${column}`
