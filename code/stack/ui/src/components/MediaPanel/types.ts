export type MediaKind = 'video' | 'image'

export interface MediaPanelProps {
  kind: MediaKind
  /** Le nom montré au-dessus (chemin du fichier). */
  title: string
  src: string
  /** Caméra posée de côté (portrait) : le média est tourné d'un quart de tour horaire pour être droit. */
  rotated?: boolean
  onClose: () => void
}
