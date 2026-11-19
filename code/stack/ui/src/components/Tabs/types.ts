export interface TabOption<T extends string> {
  id: T
  label: string
}

export interface TabsProps<T extends string> {
  /** Nom du groupe, lu par les lecteurs d'écran. */
  label: string
  options: TabOption<T>[]
  /** L'onglet actif ; une valeur hors des options n'en active aucun. */
  value: T | ''
  onChange: (id: T) => void
  /** Aussi haute qu'un `Button` (au lieu de l'être un peu plus) : pour une barre posée parmi des boutons. */
  compact?: boolean
  /** De la taille d'un petit bouton rond (32 px) : pour deux mots très courts posés sur la vidéo. Prend le pas sur `compact`. */
  tiny?: boolean
  /** Un seul bloc arrondi dont les onglets remplissent tout l'espace, rectangulaires, sans marge ni écart : le menu de la barre du haut. Prend le pas sur `compact` ; avec `tiny`, à la taille d un bouton de la vidéo. */
  block?: boolean
  /** Tous les onglets sont grisés et ne répondent plus. */
  disabled?: boolean
}
