import { MediaPanel as MediaPanelUI } from '@house/ui'
import { fileUrl } from '@/lib/api'
import type { MediaPanelProps } from './types'

/** Le clip ou l'image qu'on regarde : le fichier est servi par House Sync derrière la session. */
const MediaPanel = ({ media, onClose }: MediaPanelProps) => {
  return <MediaPanelUI kind={media.kind} title={media.path} src={fileUrl(media.path)} onClose={onClose} />
}

export default MediaPanel
