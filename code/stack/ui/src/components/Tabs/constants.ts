export const GROUP_CLASS = 'flex flex-wrap gap-0.5 rounded-lg border border-line bg-card p-0.5'
export const ITEM_CLASS =
  'flex h-[2.125rem] cursor-pointer items-center justify-center rounded-md border-0 px-3 text-[0.9rem] lg:h-[1.625rem] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent'
/** Version « bloc » : un seul rectangle à bords arrondis dont les onglets remplissent tout l'espace, rectangulaires, séparés par un trait (le menu de la barre du haut). */
export const BLOCK_GROUP_CLASS = 'flex divide-x divide-line overflow-hidden rounded-lg border border-line bg-card'
export const BLOCK_ITEM_CLASS =
  'flex h-[2.375rem] cursor-pointer items-center justify-center rounded-none border-0 px-4 text-[0.9rem] lg:h-[1.875rem] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent'
/** Version « bloc » de la taille d'un bouton rond de la vidéo (32 px avec la bordure du bloc) : le choix « L / 4K / Off » posé sur la vidéo. */
export const BLOCK_TINY_ITEM_CLASS =
  'flex h-[1.875rem] min-w-8 cursor-pointer items-center justify-center rounded-none border-0 px-2 text-[0.8rem] leading-none disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent'
export const ACTIVE_CLASS = 'bg-bg font-semibold text-fg shadow-sm'
export const IDLE_CLASS = 'bg-transparent text-muted hover:text-fg'
/** Version basse, de la hauteur d'un `Button` (les barres d'onglets posées au milieu de boutons) : même hauteur du texte, moins de marge dans l'onglet (8 px de chaque côté du texte : « 10 min · 1 h · 6 h · 24 h » de la frise). */
export const COMPACT_ITEM_CLASS =
  'flex h-[2.125rem] cursor-pointer items-center justify-center rounded-md border-0 px-2 text-[0.9rem] lg:h-[1.625rem] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent'
/** Version minuscule, de la taille d'un petit bouton rond posé sur la vidéo (le bouton du son, 32 px) : pour un choix de deux mots courts (« L » / « 4K ») sur téléphone. */
export const TINY_ITEM_CLASS =
  'flex h-[1.625rem] min-w-7 cursor-pointer items-center justify-center rounded-md border-0 px-1.5 text-[0.75rem] leading-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent'
