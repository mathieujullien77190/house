import type { ReactNode } from 'react'

export interface CameraTileProps {
  name: string
  /** Ce qui est montré dans la vignette : le direct, ou un cadre noir avec un message. */
  media: ReactNode
  /** Posé sur le média, en bas à gauche : par exemple la température. */
  overlay?: ReactNode
  /** Une ligne sous le nom (état de la caméra), vide par défaut. */
  caption?: string
  /** Appelé au clic : le parent ouvre le détail de la caméra. */
  onOpen: () => void
}
