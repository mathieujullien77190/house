// Les éléments du plan de la maison, en données simples : la WebApp les dessine sur la carte (MapLibre), ce paquet ne fait que les nommer. Toutes les positions sont en unités du plan
// (43,5 par mètre, y vers le bas).

/** Une ampoule posée sur le plan. */
export interface PlanLamp {
  id: string
  name: string
  x: number
  y: number
  on: boolean
  /** La lampe répond au pont ; sinon l'ampoule est montrée éteinte, contour rouge pâle. */
  reachable: boolean
  /** La luminosité (1 à 254) : l'ampoule allumée est d'autant plus pâle qu'elle est basse, et son nom dit le pourcentage. Absente : plein. */
  brightness?: number | null
  /** Une lampe de l'intérieur : la carte des caméras ne la montre que toit caché. */
  indoor?: boolean
  /** Une lampe pas encore placée : elle attend dans la zone « À placer » et ne se voit qu'en mode modification. */
  waiting?: boolean
  /** La couleur actuelle de l'ampoule en #rrggbb (à pleine luminosité) : l'icône s'affiche dans cette couleur quand elle est allumée ; null : la couleur par défaut. */
  color?: string | null
}

/** Un rectangle du plan. */
export interface PlanRect {
  x: number
  y: number
  w: number
  h: number
}

/** Un mur du plan : un segment, qui peut s'arrêter avant le mur d'en face pour laisser une ouverture. */
export interface PlanWall {
  x1: number
  y1: number
  x2: number
  y2: number
  /** Un claustra (une cloison ajourée) plutôt qu'un mur plein : tracé en pointillés. */
  screen?: boolean
}

/** Une pièce du plan : un ou plusieurs rectangles (une pièce en L en a deux). */
export interface PlanRoom {
  name: string
  rects: PlanRect[]
}

/** Un arbre posé dans le jardin : un rond vert déplaçable. */
export interface PlanTree {
  id: string
  x: number
  y: number
  /** Le rayon du rond. */
  r: number
}

/** Une haie : une ligne brisée (ses sommets), dessinée en gros trait vert arrondi. */
export interface PlanHedge {
  id: string
  points: [number, number][]
}

/** Un portail ou un portillon : un segment sur le contour du terrain. */
export interface PlanGate {
  id: string
  name: string
  x1: number
  y1: number
  x2: number
  y2: number
}

/** Une caméra posée sur le plan et son champ de vision, un croissant (une portion de couronne) devant elle. */
export interface PlanCamera {
  id: string
  name: string
  x: number
  y: number
  /** Où elle regarde, en degrés depuis le haut du plan, dans le sens des aiguilles d'une montre : 0 = tout droit en haut, 180 = tout droit en bas. */
  angle: number
  /** L'ouverture du champ, en degrés. */
  fov: number
  /** La vraie caméra est éteinte : son icône est un rond rouge avec une caméra blanche barrée. */
  off?: boolean
  /** La caméra du plan n'existe pas (elle n'est liée à aucune vraie caméra) : son icône est une caméra rouge sur un rond au contour rouge. */
  missing?: boolean
  /** Le bord proche et le bord lointain du croissant. */
  near: number
  far: number
}

/** Une prise connectée posée sur le plan, avec son état : allumée ou éteinte. */
export interface PlanPlug {
  id: string
  name: string
  x: number
  y: number
  on: boolean
}

/** Une climatisation (l'unité intérieure) posée sur le plan, une icône : allumée ou éteinte, joignable ou non, avec un texte d'état pour le survol. */
export interface PlanAc {
  id: string
  name: string
  x: number
  y: number
  on: boolean
  reachable: boolean
  /** La température de la pièce en °C, lue par l'unité : écrite sur le plan sous l'icône ; null : rien. */
  temperature?: number | null
  /** L'orientation de l'icône en degrés, dans le sens des aiguilles d'une montre (90 : un quart de tour horaire, -90 : un quart de tour trigonométrique) ; 0 par défaut. */
  rotation?: number
  /** Ce qu'on écrit en bas de la carte au survol : « Salon · Chaud 22 °C · pièce 20 °C ». */
  label: string
}

/** Un volet roulant posé sur le plan, une icône : fermé ou ouvert (sens unique : on ne sait que le dernier ordre, écrit au survol ; seul « descendre » vaut fermé, monter, stop et la position du milieu valent ouvert). */
export interface PlanShutter {
  id: string
  name: string
  x: number
  y: number
  /** Le dernier ordre était « descendre » : l'icône est celle d'un volet fermé. */
  closed: boolean
  /** Ce qu'on écrit en bas de la carte au survol : « Volet cuisine · Dernier ordre : Monter, à 08:12 ». */
  label: string
}

/** Une étiquette de température posée sur le plan (dehors, dans la cage…) : un rectangle arrondi avec le texte dedans, qu'on déplace en modification. */
export interface PlanLabel {
  id: string
  name: string
  x: number
  y: number
  /** Le texte de l'étiquette : « 12° », « 21,5° ». Vide : rien n'est dessiné. */
  text: string
}

/** L'emoji d'un clip sauvegardé posé sur le plan : un clic montre le clip, un double clic l'ouvre. */
export interface PlanEmoji {
  /** L'identifiant du clip (de son événement). */
  id: string
  /** Le pictogramme (🦊). */
  emoji: string
  x: number
  y: number
}
