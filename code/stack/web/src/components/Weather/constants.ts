/** Chez soi (Dammarie-lès-Lys) : la météo est celle de ce point. À changer ici pour une autre maison. */
export const HOUSE_LATITUDE = 48.52
export const HOUSE_LONGITUDE = 2.64
/** Le nom du lieu, écrit à côté de la météo (sur grand écran). */
export const HOUSE_PLACE = 'Dammarie-lès-Lys'

/** L'enveloppe de la météo : pas de position propre, pour que le panneau se place sur la barre (sa position fixe), pas sur le bouton. */
export const WRAP_CLASS = 'flex shrink-0 items-center'
export const ICON_CLASS = 'text-[1.15rem] leading-none'
export const TEMPERATURE_CLASS = 'font-semibold tabular-nums'
/** Le lieu : seulement dès 1024 px, la barre du téléphone est étroite. */
export const PLACE_CLASS = 'text-muted max-lg:hidden'

/** Le bouton (la météo d'aujourd'hui) qui ouvre ou ferme les prévisions. */
export const BUTTON_CLASS = 'flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md text-[0.9rem] text-fg'
/** Le panneau des prévisions : sous la barre, sur toute sa largeur (il se place sur la barre, qui est en position fixe) ; une flèche de chaque côté et les heures au milieu. */
export const PANEL_CLASS = 'absolute inset-x-0 top-full z-20 flex items-center gap-2 border-b border-line bg-card px-3 py-3 shadow-lg'
/** Les heures : elles défilent à l'horizontale (au doigt sur téléphone, avec les flèches partout), sans barre de défilement. */
export const SCROLLER_CLASS = 'flex min-w-0 flex-1 gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
export const ARROW_CLASS =
  'flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-line bg-card text-[1.1rem] text-fg hover:bg-line/40 disabled:cursor-default disabled:opacity-30'
export const ARROW_PREVIOUS_LABEL = 'Heures précédentes'
export const ARROW_NEXT_LABEL = 'Heures suivantes'
/** Une flèche fait défiler de cette part de la largeur visible. */
export const SCROLL_STEP = 0.8
export const HOUR_CLASS = 'flex min-w-[4.5rem] shrink-0 flex-col items-center gap-0.5 rounded-md px-2 py-1 text-center'
export const HOUR_NOW_CLASS = 'bg-line/40'
export const HOUR_TIME_CLASS = 'text-[0.75rem] text-muted'
export const HOUR_ICON_CLASS = 'text-[1.4rem] leading-none'
export const HOUR_TEMPERATURE_CLASS = 'font-semibold tabular-nums'
export const HOUR_RAIN_CLASS = 'text-[0.7rem] tabular-nums text-muted'
export const HOUR_RAINY_CLASS = 'text-[0.7rem] font-semibold tabular-nums text-accent'
/** Au-delà de cette probabilité (%), la pluie est mise en avant. */
export const RAINY_CHANCE = 50
export const PANEL_LABEL = 'Prévisions heure par heure'
