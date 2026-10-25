import type { SelectOption } from '@/components/UI/Select'

/** Zones proposées pour les caméras. */
export const ZONES = ['Portail', 'Jardin', 'Garage', 'Terrasse', 'Entrée', 'Façade', 'Cour']

export const LINKS_TITLE = 'Liens'
export const LINKS_EMPTY = 'Aucun lien.'
export const POSITION_LABEL = 'Position'
export const NO_ZONE_LABEL = 'Aucune zone'
export const EMPTY_TEXT = 'Clique sur un composant ou un trait du schéma pour le modifier.'
export const REMOVE_LINK_LABEL = 'Supprimer ce lien'

export const NO_ZONE_OPTION: SelectOption = { value: '', label: NO_ZONE_LABEL }
