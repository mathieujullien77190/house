import type { CameraMarker } from '@/types'

export interface CameraMarkersProps {
  /** Les repères à montrer : un par autre caméra, à sa place. */
  markers: CameraMarker[]
  /** Pendant le glisser : la caméra `target` est maintenant à cette place (parts de l'image). */
  onMove: (target: string, x: number, y: number) => void
  /** Au relâchement d'un glisser : les places sont à enregistrer. */
  onCommit: () => void
  /** Un clic droit (ou un appui long sur téléphone) : retire le repère de cette caméra. */
  onRemove: (target: string) => void
  /** Un clic sans glisser : ouvre cette caméra. */
  onOpen: (target: string) => void
}
