export interface LightsProps {
  apiKey: string
}

export type LightsStatus = 'loading' | 'ready' | 'unavailable' | 'error'

/** La position de chaque ampoule sur le plan, par identifiant de lampe (unités du plan, 540 × 300). */
export type Positions = Record<string, { x: number; y: number }>
