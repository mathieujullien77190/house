import { fileUrl } from '@/lib/api'
import MediaPanelUI from './UI'
import type { MediaPanelProps } from './types'

/**
 * Le clip ou l'image qu'on regarde, dans un panneau fixe au-dessus des tableaux : la vidéo démarre à l'ouverture,
 * et Fermer retire le panneau (donc arrête la lecture) sans toucher à la taille des tableaux.
 */
const MediaPanel = ({ media, onClose }: MediaPanelProps) => {
  return <MediaPanelUI media={media} src={fileUrl(media.path)} onClose={onClose} />
}

export default MediaPanel
