import type { ReactNode } from 'react'

export interface CameraCardProps {
  name: string
  /** Légende au-dessus du média : « Dernière image », « Image à … », « Clip · … ». */
  caption: string
  /** Un avertissement au-dessus du média (événement en cours, image indisponible), vide sinon. */
  warning?: string
  /** Ce qui est montré en haut : l'image, le lecteur du clip, l'image d'un instant… */
  media: ReactNode
  /** La ligne sous le média : le dernier événement. */
  lastEventText: string
  /** La frise, rendue par le parent. */
  timeline: ReactNode
}
