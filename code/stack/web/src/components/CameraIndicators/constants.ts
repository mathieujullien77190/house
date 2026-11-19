export const ROW_CLASS = 'flex items-center gap-1'
/** Le dessin de la pluie, du vent ou des yeux : seul, sans boîte autour (les températures gardent la leur). */
export const SYMBOL_CLASS = 'flex h-8 items-center text-[1.3rem] leading-none'
export const LAMP_NAME = 'Perruche'
export const LAMP_ON_TEXT = 'allumée'
export const LAMP_OFF_TEXT = 'éteinte'
export const LAMP_UNREACHABLE_TEXT = 'injoignable'
export const PLUG_NAME = 'Prise'
/** Le symbole du mode pluie, sur la vidéo : juste le dessin (🌧️ pluie, ☔ pluie forte). */
/** Le symbole de la recherche des yeux (la nuit), comme la pluie et le vent : juste le dessin, avec son infobulle. */
export const EYES_CHIP = '👁️'
export const EYES_HINT = 'Recherche des yeux active : la nuit, la caméra cherche les reflets des yeux (infrarouge). Des yeux vus comptent comme un mouvement et sont entourés en rouge sur la vidéo.'
export const RAIN_CHIP = { wind: '💨', rain: '🌧️', heavy: '☔', fog: '🌫️' } as const
/** Ce que dit l'infobulle de la pluie (un clic sur son dessin). */
export const RAIN_HINT = {
  wind: 'Vent fort : le mode vent est actif, la détection de mouvement est coupée (le feuillage agité la déclenche) et une image est gardée toutes les 5 secondes.',
  rain: 'Il pleut : le mode pluie est actif, la détection de mouvement est coupée et une image est gardée toutes les 5 secondes.',
  heavy: 'Forte pluie : le mode pluie est actif, la détection de mouvement est coupée et une image est gardée toutes les 5 secondes.',
  fog: 'Brouillard : le mode pluie est actif, la détection de mouvement est coupée (les gouttelettes éclairées par l’infrarouge la déclenchent) et une image est gardée toutes les 5 secondes.',
} as const
