import type { ReactNode } from 'react'

/** L'état dit par le liseré : `ok` (rien à signaler : la bordure normale du bloc), `off` (rouge : éteint ou injoignable), `open` (bleu pâle) et `closed` (violet), pour un volet qui n'est pas en panne. */
export type StatusFrameTone = 'ok' | 'off' | 'open' | 'closed'

export interface StatusFrameProps {
  tone: StatusFrameTone
  children: ReactNode
}
