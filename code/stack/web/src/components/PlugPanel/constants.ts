export const TITLE = 'Prise connectée'
export const ON_TEXT = 'Allumée'
export const OFF_TEXT = 'Éteinte'
export const LOADING_TEXT = 'Lecture de la prise…'
export const UNAVAILABLE_TEXT = 'La prise ne répond pas (éteinte, hors du WiFi ou adresse changée : voir PLUG_HOST dans .env).'
export const NOT_CONFIGURED_TEXT = 'Aucune prise configurée : PLUG_HOST est absent du .env du mini PC.'
export const STATE_LABEL = 'État'
export const SINCE_LABEL = 'Allumée depuis'
export const TIMER_LABEL = 'Durée'
export const TIMER_START_LABEL = 'Allumer pendant'
/** Le curseur de la durée, de 1 à 30 minutes par pas de 1 : la prise s'éteint toute seule ensuite. */
export const TIMER_MIN = 1
export const TIMER_MAX = 30
export const TIMER_DEFAULT = 5
export const TIMER_UNIT = 'min'
export const TIMER_BOX_CLASS = 'flex flex-col items-start gap-2 lg:max-w-sm'
export const SLIDER_HEAD_CLASS = 'flex w-full items-baseline justify-between gap-2'
export const SLIDER_CLASS = 'w-full accent-accent'
export const VALUE_CLASS = 'font-mono text-[0.9rem]'
export const REMAINING_LABEL = 'S’éteint dans'
export const BOX_CLASS = 'mt-4 flex flex-col gap-3'
export const EMBEDDED_BOX_CLASS = 'flex flex-col gap-3'
export const HEAD_CLASS = 'flex items-center justify-between gap-2'
export const NAME_CLASS = 'text-[1.1rem] font-semibold'

export const MOTION_LABEL = 'Éteindre si le détecteur intérieur voit un mouvement'
export const MOTION_ARMED_LABEL = 'Éteinte au mouvement'
export const MOTION_ARMED_TEXT = 'oui, au prochain mouvement'
