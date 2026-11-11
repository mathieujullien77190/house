export const ROW_CLASS = 'flex items-center gap-1'
export const LAMP_NAME = 'Perruche'
export const LAMP_ON_TEXT = 'allumée'
export const LAMP_OFF_TEXT = 'éteinte'
export const LAMP_UNREACHABLE_TEXT = 'injoignable'
export const PLUG_NAME = 'Prise'
/** Le symbole du mode pluie, sur la vidéo : juste le dessin (🌧️ pluie, ☔ pluie forte). */
export const RAIN_CHIP = { rain: '🌧️', heavy: '☔' } as const
/** Ce que dit l'infobulle de la pluie (un clic sur son dessin). */
export const RAIN_HINT = {
  rain: 'Il pleut : le mode pluie est actif, la détection de mouvement est coupée et une image est gardée toutes les 5 secondes.',
  heavy: 'Forte pluie : le mode pluie est actif, la détection de mouvement est coupée et une image est gardée toutes les 5 secondes.',
} as const
/** L'œil de la recherche des yeux qui brillent : un dessin dans le même bloc, de la même taille que celui de la pluie (🌧️). */
export const EYES_CHIP = '👁️'
export const EYES_HINT = 'Détection des yeux qui brillent active (de 30 min après le coucher à 30 min avant le lever).'
