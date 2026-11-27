import type * as THREE from 'three'
import type { ShutterCommand } from '@/types'

/** Les volets roulants dessinés dans la scène : le mot qui les désigne dans le nom du volet de la maison (« Volet cuisine », « Volet PC »…). */
export const SHUTTER_KEYS = ['cuisine', 'salon', 'pc', 'porte'] as const

/**
 * La part fermée d'un volet d'après son dernier ordre : descendu = fermé, monté = ouvert. Un arrêt (dont « Fermer à moitié ») ou aucun ordre
 * connu : à moitié. Les volets Somfy RTS ne disent pas où ils sont : c'est le dernier ordre de la maison qui fait foi, pas la télécommande murale.
 */
export const closedOf = (command: ShutterCommand | null): number => (command === 'down' ? 1 : command === 'up' ? 0 : 0.5)

/**
 * La clarté du ciel, de 0 (nuit) à 1 (plein soleil), d'après la météo : nuit, ciel dégagé (codes WMO 0 et 1), nuageux (2 et 3), ou
 * brouillard, pluie, neige. Sans météo lue, on se fie à l'heure : jour moyen de 8 h à 18 h.
 */
export const skyOf = (weather: { isDay: boolean; code: number } | null, hour: number): number => {
  if (!weather) return hour >= 8 && hour < 18 ? 0.7 : 0
  if (!weather.isDay) return 0
  return weather.code <= 1 ? 1 : weather.code <= 3 ? 0.7 : 0.45
}

/** Le temps qu'un volet de la scène met à monter ou descendre en entier, en secondes. */
export const SHUTTER_TRAVEL_S = 8

/** Montre les lames d'un volet jusqu'à cette part fermée. Vrai si le nombre de lames montrées a changé (l'ombre du volet aussi, donc). */
const showSlats = (object: THREE.Object3D, level: number): boolean => {
  const shown = Math.round(object.children.length * level)
  let changed = false
  object.children.forEach((slat, index) => {
    if (slat.visible !== index < shown) changed = true
    slat.visible = index < shown
  })
  return changed
}

/**
 * Donne à chaque volet de la scène (un groupe de lames marqué par `userData.shutter`) sa part fermée à atteindre (`userData.goal`). Il
 * y est tout de suite, sauf avec `animate` (un ordre donné d'un clic dans la scène) : alors `stepShutters` l'y amène peu à peu. Rend la part de vitre découverte une fois les volets
 * arrivés, de 0 à 1 (chaque fenêtre compte pour sa surface, `userData.area`) : de quoi doser la lumière du jour.
 */
export const applyShutters = (root: THREE.Object3D, closed: Record<string, number>, animate = false): number => {
  let total = 0
  let open = 0
  root.traverse((object) => {
    const key = object.userData.shutter as string | undefined
    if (!key) return
    const part = closed[key] ?? 0.5
    object.userData.goal = part
    if (!animate || typeof object.userData.level !== 'number') {
      object.userData.level = part
      showSlats(object, part)
    }
    const area = object.userData.area as number
    total += area
    open += area * (1 - part)
  })
  return total > 0 ? open / total : 0
}

/** Les volets de la scène (les groupes de lames marqués par `userData.shutter`), retrouvés une fois pour la boucle de dessin. */
export const shutterSlats = (root: THREE.Object3D): THREE.Object3D[] => {
  const found: THREE.Object3D[] = []
  root.traverse((object) => {
    if (object.userData.shutter) found.push(object)
  })
  return found
}

/**
 * Fait avancer ces volets vers leur but pendant `seconds` : les lames se déroulent depuis le haut, ou remontent. Rend vrai tant qu'un
 * volet est en route (la boucle de dessin continue) ; `changed` est appelé quand une lame apparaît ou disparaît (il faut redessiner).
 */
export const stepShutters = (shutters: THREE.Object3D[], seconds: number, changed: () => void): boolean => {
  let moving = false
  for (const object of shutters) {
    const goal = object.userData.goal as number | undefined
    const level = object.userData.level as number | undefined
    if (goal === undefined || level === undefined || goal === level) continue
    const step = seconds / SHUTTER_TRAVEL_S
    const next = goal > level ? Math.min(goal, level + step) : Math.max(goal, level - step)
    object.userData.level = next
    if (showSlats(object, next)) changed()
    moving = true
  }
  return moving
}

/** Les fenêtres à volet de la scène : pour chacune, le nom de son volet et tout ce qui la dessine (cadre, vitre, lames), à viser au clic. */
export const shutterWindows = (root: THREE.Object3D): { key: string; object: THREE.Object3D }[] => {
  const found: { key: string; object: THREE.Object3D }[] = []
  root.traverse((object) => {
    const key = object.userData.shutter as string | undefined
    if (key && object.parent) found.push({ key, object: object.parent })
  })
  return found
}
