/** Les interrupteurs de la page invité du réseau (`GET`/`PUT /api/lan-access`) et son adresse (sans la clé). */
export interface LanAccessSettings {
  enabled: boolean
  cameras: boolean
  shutters: boolean
  lights: boolean
  ac: boolean
  address: string
}

export type LanAccessKey = 'enabled' | 'cameras' | 'shutters' | 'lights' | 'ac'

export interface LanAccessUIProps {
  settings: LanAccessSettings
  failed: boolean
  onChange: (key: LanAccessKey, on: boolean) => void
}
