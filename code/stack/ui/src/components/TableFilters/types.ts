import type { ReactNode } from 'react'

export interface MatchFilter {
  /** Ce que l'on choisit (« Caméra », « Matériel Hue »). */
  label: string
  /** Le texte de la valeur qui ne filtre rien (« Toutes »). */
  allLabel: string
  /** La valeur choisie, vide pour tout. */
  value: string
  /** Les valeurs possibles. */
  options: string[]
  onChange: (value: string) => void
}

export interface DateFilter {
  label: string
  /** Le jour choisi (« 2026-11-07 »), vide pour tous les jours. */
  value: string
  onChange: (value: string) => void
}

export interface TableFiltersProps {
  match?: MatchFilter
  date?: DateFilter
  /** Le bouton qui efface les filtres, montré seulement quand l'un d'eux est actif. */
  clear?: { label: string; onClear: () => void }
  /** D'autres commandes posées avant les filtres (par exemple des onglets). */
  children?: ReactNode
}
