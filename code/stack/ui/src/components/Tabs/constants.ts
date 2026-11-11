export const GROUP_CLASS = 'flex flex-wrap gap-0.5 rounded-lg border border-line bg-card p-0.5'
export const ITEM_CLASS =
  'cursor-pointer rounded-md border-0 px-3 py-2.5 text-[0.9rem] lg:py-1.5 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent'
export const ACTIVE_CLASS = 'bg-bg font-semibold text-fg shadow-sm'
export const IDLE_CLASS = 'bg-transparent text-muted hover:text-fg'
/** Version basse, de la hauteur d'un `Button` (les barres d'onglets posées au milieu de boutons) : même hauteur du texte, moins de marge dans l'onglet. */
export const COMPACT_ITEM_CLASS =
  'cursor-pointer rounded-md border-0 px-3 py-1.5 text-[0.9rem] lg:py-0.5 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent'
/** Version minuscule, de la taille d'un petit bouton rond posé sur la vidéo (le bouton du son, 32 px) : pour un choix de deux mots courts (« L » / « 4K ») sur téléphone. */
export const TINY_ITEM_CLASS =
  'flex h-[1.625rem] min-w-7 cursor-pointer items-center justify-center rounded-md border-0 px-1.5 text-[0.75rem] leading-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent'
