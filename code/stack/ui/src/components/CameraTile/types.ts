import type { ReactNode } from 'react'

export interface CameraTileProps {
  name: string
  /** Ce qui est montré dans la vignette : le direct, ou un cadre noir avec un message. */
  media: ReactNode
  /** Posé sur le média, en bas à gauche : par exemple la température. */
  overlay?: ReactNode
  /** Une ligne sous le nom (état de la caméra), vide par défaut. */
  caption?: string
  /** La caméra est éteinte : la vignette a une bordure rouge. */
  alert?: boolean
  /** Sous le nom : par exemple le dernier événement et s'il est lu. */
  footer?: ReactNode
  /** Appelé au clic sur le pied de la vignette ; sans lui, le pied n'est pas cliquable à part. */
  onOpenFooter?: () => void
  /** Appelé au clic : le parent ouvre le détail de la caméra. */
  onOpen: () => void
}
