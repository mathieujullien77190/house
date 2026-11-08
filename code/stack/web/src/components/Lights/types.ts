export interface LightsProps {
  apiKey: string
  /** Sur téléphone, l'onglet est un écran à part : la flèche retour le quitte. */
  onBack?: () => void
}

export type LightsStatus = 'loading' | 'ready' | 'unavailable' | 'error'

/** La position de chaque ampoule, par identifiant de lampe (unités du plan : celles de l ancien plan 540 × 300 pour les copies anciennes, celles de la carte pour le plan de l API). */
export type Positions = Record<string, { x: number; y: number }>
