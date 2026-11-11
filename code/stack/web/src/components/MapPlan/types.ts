import type { PlanAc, PlanEmoji, PlanLabel, PlanShutter, PlanCamera, PlanGate, PlanHedge, PlanLamp, PlanPlug, PlanTree } from '@house/ui'
import type { EditContext } from './edit'
import type { PlanDecor, RoomRects } from './features'
import type { Point } from './projection'

/**
 * Le plan de la maison sur la carte : tous les éléments sont des données de la carte (longitude, latitude), donc ils restent exactement à leur place
 * à tout zoom. Les éléments modifiables se prennent à la souris quand le parent donne le rappel correspondant.
 */
export interface MapPlanProps extends Omit<EditContext, 'cameras' | 'trees' | 'hedges'> {
  /** La carte remplit l'espace qui reste à l'écran (téléphone) au lieu d'avoir sa hauteur fixe. */
  fill?: boolean
  cameras?: PlanCamera[]
  trees: PlanTree[]
  hedges: PlanHedge[]
  gates: PlanGate[]
  /** Le contour des carreaux modifié à la main (ses coins) ; sans lui, le contour calculé. */
  tiles?: Point[] | null
  /** Les rectangles des pièces modifiés à la main (les murs de la maison) ; sans eux, ceux de départ. */
  rooms?: RoomRects | null
  /** Le contour du chemin du garage modifié à la main (avant son décalage) ; sans lui, celui de départ. */
  garage?: Point[] | null
  lamps?: PlanLamp[]
  plugs?: PlanPlug[]
  /** Les climatisations (des rectangles) : un clic ouvre leur page, on les déplace en modification. */
  acs?: PlanAc[]
  /** Un clic sur une climatisation, hors modification : ouvre la page des climatisations. En modification, elle se déplace et le clic ne fait rien. */
  onOpenAc?: (id: string) => void
  /** Un clic sur une climatisation, hors modification : la choisit (`onSelectAc`, le parent affiche son aperçu) ; son double clic ouvre la page (`onOpenAc`). Sans `onSelectAc`, un clic ouvre la page. */
  onSelectAc?: (id: string) => void
  /** La climatisation choisie : la carte donne sa position à l'écran (`onAnchor`) comme pour une caméra choisie. */
  selectedAcId?: string
  /** Les volets roulants (des icônes) : un clic les descend ou les monte (`onToggleShutter`), on les déplace en modification. */
  shutters?: PlanShutter[]
  /** Un clic sur un volet roulant, hors modification : le choisit (`onSelectShutter`, le parent affiche son bloc) ; son double clic ouvre la page Volet (`onOpenShutter`). Sans `onSelectShutter`, un clic donne l'ordre (`onToggleShutter`). */
  onSelectShutter?: (id: string) => void
  /** Le volet choisi : sert à la vue imposée par le parent. */
  selectedShutterId?: string
  /** Les étiquettes de température (dehors, dans la cage) : on les déplace en modification. */
  labels?: PlanLabel[]
  /** Les emoji des clips sauvegardés (un rond avec le pictogramme) : un clic le choisit (`onToggleEmoji`, le parent montre le clip), un double clic l'ouvre (`onOpenEmoji`) ; on les déplace en modification (`onMoveEmoji`). */
  emojis?: PlanEmoji[]
  /** Les icônes seules posées sur le plan (la pompe à chaleur) : sans rond, on les déplace en modification (`onMoveDecor`). */
  decors?: PlanDecor[]
  /** Le clip choisi : sert à l'ancre et à la vue imposée par le parent ; la carte ne le dessine pas autrement. */
  selectedEmojiId?: string
  /** Un clic sur la prise (le chauffage), hors modification : la choisit (`onSelectPlug`) ; son double clic ouvre sa page (`onOpenPlug`). En modification, elle se déplace et le clic ne fait rien. */
  onSelectPlug?: (id: string) => void
  onOpenPlug?: (id: string) => void
  /** La prise est choisie : la carte donne sa position à l'écran (`onAnchor`) comme pour une caméra choisie. */
  selectedPlugId?: string
  selectedCameraId?: string
  /** La caméra survolée (donnée par la carte elle-même) : son champ de vision s'affiche. */
  hoveredCameraId?: string
  /** Un double clic sur une caméra du plan, hors modification : ouvre la page de cette caméra (un clic seul la choisit : `onSelectCamera`). */
  onOpenCamera?: (planId: string) => void
  /** Une vue imposée (centre, zoom, cap) : la carte s'y place quand elle change, null : rien. */
  /** L'objet choisi (caméra, prise, clim, volet, emoji de clip) vu de l'écran : la position de son icône en pixels de la carte, relue à chaque mouvement ; null sans objet choisi. Le parent y tire la ligne jusqu'à son bloc. */
  onAnchor?: (anchor: { x: number; y: number } | null) => void
  /** Le bloc du parent (en pixels de la carte : bord gauche, haut, hauteur) : une ligne bleue, **sous les icônes**, relie l'objet choisi à son bord gauche (à la hauteur de l'icône si elle tombe en face du bloc, sinon à son bord le plus proche) ; null : pas de ligne. */
  linkBox?: { left: number; top: number; height: number } | null
  focusView?: { lat: number; lng: number; zoom: number; bearing: number } | null
  /** Les vraies caméras (leurs noms), le lien de chaque caméra du plan avec l'une d'elles (identifiant → nom), et le rappel pour le changer. */
  cameraNames?: string[]
  links?: Record<string, string>
  onLink?: (planId: string, camera: string) => void
  selectedTreeId?: string
  selectedHedgeId?: string
}

/** Les props une fois complétées : rien n'y manque. */
export type ResolvedProps = Required<
  Pick<
    MapPlanProps,
    | 'cameras'
    | 'lamps'
    | 'plugs'
    | 'acs'
    | 'shutters'
    | 'labels'
    | 'emojis'
    | 'decors'
    | 'selectedCameraId'
    | 'hoveredCameraId'
    | 'cameraNames'
    | 'links'
    | 'selectedTreeId'
    | 'selectedHedgeId'
  >
> &
  Omit<
    MapPlanProps,
    | 'cameras'
    | 'lamps'
    | 'plugs'
    | 'acs'
    | 'shutters'
    | 'labels'
    | 'emojis'
    | 'decors'
    | 'selectedCameraId'
    | 'hoveredCameraId'
    | 'cameraNames'
    | 'links'
    | 'selectedTreeId'
    | 'selectedHedgeId'
  > &
  Pick<EditContext, 'cameras' | 'trees' | 'hedges'>
