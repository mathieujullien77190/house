export type MediaKind = 'video' | 'image'

export interface MediaPanelProps {
  kind: MediaKind
  /** Le nom montré au-dessus (chemin du fichier). */
  title: string
  src: string
  onClose: () => void
}
