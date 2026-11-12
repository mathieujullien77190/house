/** L'état d'une pastille : allumée (verte), éteinte (rouge), ou inconnue / non liée (grise). */
export type StatusDotState = 'on' | 'off' | 'missing'

export interface StatusDotProps {
  state: StatusDotState
  /** Nom accessible et info-bulle. */
  label?: string
}
