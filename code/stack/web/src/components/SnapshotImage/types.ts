export interface SnapshotImageProps {
  apiKey: string
  camera: string
  /** L'instant demandé, en secondes. */
  at: number
  /** L'image est tournée d'un quart de tour horaire : son texte est remis droit. */
  upright?: boolean
  /** La durée du fondu d'une image sur la précédente, en ms (plus courte quand le défilement est rapide). */
  fade?: number
}
