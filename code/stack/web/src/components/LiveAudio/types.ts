export interface LiveAudioProps {
  /** Le nom de la caméra, tel que House API le connaît (son flux audio est celui de son direct léger). */
  camera: string
  /** Le son est ouvert dès l'arrivée (il l'était sur la caméra d'où l'on vient). */
  initialOn?: boolean
  /** Appelé quand l'utilisateur ouvre ou coupe le son (pas quand on quitte la caméra). */
  onChange?: (on: boolean) => void
}
