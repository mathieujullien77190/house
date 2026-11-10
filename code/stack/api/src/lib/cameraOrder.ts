// L'ordre des caméras partout où l'API les liste : celui de leur arrivée. Une caméra qui n'est pas dans la liste vient après, par ordre alphabétique.
// **Copie assumée de `sync/src/cameraOrder.ts`** (l'API ne dépend pas de House Sync) : si l'un change, changer l'autre.

/** Les caméras connues, dans l'ordre où elles sont arrivées. */
export const CAMERA_ORDER = ['voliere-interieur', 'voliere-exterieur', 'salon-de-jardin', 'voliere-toit']

/** La clause SQL qui range une colonne de caméras dans cet ordre (à mettre après `ORDER BY`). */
export const cameraOrderSql = (column = 'camera'): string =>
  `CASE ${column} ${CAMERA_ORDER.map((camera, index) => `WHEN '${camera}' THEN ${index}`).join(' ')} ELSE ${CAMERA_ORDER.length} END, ${column}`
