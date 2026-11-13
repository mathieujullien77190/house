import type { ReactNode } from 'react'
import type { TvKey } from '@/types'

export interface TvPanelProps {
  apiKey: string
  /** Sur téléphone, la télécommande est seule à l'écran (ni titre ni menu) : ce bouton, en haut, en sort. Absent sur grand écran. */
  onBack?: () => void
}

export interface RemoteKeyProps {
  keyId: TvKey
  label: ReactNode
  /** Le nom lu par les lecteurs d'écran quand l'étiquette est un symbole. */
  ariaLabel: string
  onSend: (key: TvKey, long: boolean) => void
  variant?: 'default' | 'danger'
}

/** 'loading' avant la première réponse, 'off' : l'API ne répond pas, null : tout va bien. */
export type TvProblem = 'loading' | 'off' | null

/** L'association du Player : 'idle' rien en cours, 'starting' connexion au Player, 'waiting' le code est affiché sur la TV, 'validating' le code est vérifié. */
export type PairPhase = 'idle' | 'starting' | 'waiting' | 'validating'

export interface PairingProps {
  phase: PairPhase
  error: string | null
  onStart: () => void
  onSubmit: (code: string) => void
}
