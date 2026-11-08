/** Un sommet, en part de l'image : x de 0 (gauche) à 1 (droite), y de 0 (haut) à 1 (bas). */
export type ZonePoint = [number, number]

export interface ZoneEditorProps {
  /** Les sommets du polygone, dans l'ordre (3 au moins). Toute l'image : les quatre coins. */
  points: ZonePoint[]
  /** Un sommet bouge (à chaque mouvement du pointeur), ou un sommet est ajouté ou retiré : le parent garde les nouveaux sommets. */
  onChange: (points: ZonePoint[]) => void
  /** Le pointeur est relâché (ou un sommet retiré) : les sommets définitifs, à enregistrer. */
  onCommit: (points: ZonePoint[]) => void
  /** Le parent est tourné d'un quart de tour horaire (CSS) : les coordonnées du pointeur sont ramenées dans l'image non tournée. */
  quarterTurn?: boolean
}
