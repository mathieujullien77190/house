// D'où vient un changement de lampe ? Le pont Hue ne le dit pas : son flux d'événements donne l'état qui a changé, jamais
// celui qui l'a demandé. On le devine donc en rapprochant le changement de ce qui s'est passé juste avant :
//   1. l'appui sur un interrupteur ou une télécommande Hue ;
//   2. une scène lancée (alors on cherche ce qui l'a lancée : un interrupteur, un détecteur de mouvement) ;
//   3. un détecteur de mouvement (les règles du pont allument des scènes) ;
//   4. une règle à heure fixe du pont (« Eteind tout » à 10:00) dont l'heure vient de passer : on les connaît, le pont les liste ;
//   5. la reconnexion radio de la lampe (retour du courant : elle revient allumée, mode « safety ») ;
//   sinon : inconnue. C'est là que se cachent l'appli Hue, la WebApp de House ou un autre appareil du réseau :
//   le pont ne distingue pas ces émetteurs, et House Sync ne voit pas les ordres de House.
// Fonctions pures : le temps et les listes sont passés en paramètres.

export type Origin = 'switch' | 'sensor' | 'rule' | 'scene' | 'power' | 'device' | 'unknown'

export const ORIGINS: Origin[] = ['switch', 'sensor', 'rule', 'scene', 'power', 'device', 'unknown']

/** Ce qui s'est passé sur le réseau Hue : une scène, un appui, un mouvement, une lampe qui se reconnecte. */
export interface Trigger {
  at: number
  kind: 'scene' | 'button' | 'motion' | 'connectivity'
  name: string
  /** L'identifiant de ce qui l'a produit : l'appareil (propriétaire du capteur ou de la lampe) ou la scène. */
  id: string
}

/** Ce qu'on cherche à expliquer : un changement de lampe. */
export interface LightChange {
  at: number
  /** L'appareil de la lampe (son propriétaire), pour rapprocher une reconnexion radio. */
  owner: string
}

export interface Verdict {
  origin: Origin
  detail: string
}

/** Une règle à heure fixe du pont (« Eteind tout » : tous les jours à 10:00). */
export interface Schedule {
  name: string
  /** Les jours où elle tourne, en anglais et en minuscules comme dans le pont (« monday »...) ; tous les jours si la règle en liste sept. */
  days: string[]
  /** L'heure de départ, en secondes depuis minuit, à l'heure locale du pont. */
  secondOfDay: number
  /** Comment la dire : « tous les jours à 10:00 ». */
  text: string
}

/** Une règle agit à l'heure pile : ses lampes bougent de 2 secondes avant (horloges) à 20 secondes après. */
export const SCHEDULE_WINDOW = { before: 2, after: 20 }

/** La règle à heure fixe qui vient de partir à ce jour et à cette heure locale, ou null. */
export const scheduleAt = (schedules: Schedule[], weekday: string, secondOfDay: number): Schedule | null =>
  schedules.find((s) => s.days.includes(weekday) && secondOfDay - s.secondOfDay >= -SCHEDULE_WINDOW.before && secondOfDay - s.secondOfDay <= SCHEDULE_WINDOW.after) ?? null

const ruleVerdict = (schedule: Schedule): Verdict => ({ origin: 'rule', detail: `règle à heure fixe du pont « ${schedule.name} » (${schedule.text})` })

export const WINDOWS = {
  button: 4000,
  scene: 4000,
  motion: 15_000,
  connectivity: 120_000,
}

/** Ce qui est survenu dans les `ms` millisecondes avant `at` (à une demi-seconde de tolérance près), le plus récent d'abord. */
const before = (triggers: Trigger[], kind: Trigger['kind'], at: number, ms: number): Trigger[] =>
  triggers.filter((t) => t.kind === kind && at - t.at >= -500 && at - t.at <= ms).sort((a, b) => b.at - a.at)

/** Qui a lancé ce changement, d'après un interrupteur ou un détecteur juste avant ? Rien s'il n'y a pas d'indice. */
const cause = (triggers: Trigger[], at: number): Verdict | null => {
  const button = before(triggers, 'button', at, WINDOWS.button)[0]
  if (button) return { origin: 'switch', detail: `appui sur « ${button.name} »` }
  const motion = before(triggers, 'motion', at, WINDOWS.motion)[0]
  if (motion) return { origin: 'sensor', detail: `mouvement détecté par « ${motion.name} » (règle du pont)` }
  return null
}

const UNKNOWN_SOURCE = 'ni interrupteur, ni détecteur, ni règle à heure fixe du pont : l’appli Hue, la WebApp de House ou un autre appareil du réseau'

/** Explique le changement d'une lampe. `schedule` est la règle à heure fixe qui vient de partir à cet instant, s'il y en a une. */
export const classifyLight = (change: LightChange, triggers: Trigger[], schedule: Schedule | null = null): Verdict => {
  const scene = before(triggers, 'scene', change.at, WINDOWS.scene)[0]
  if (scene) {
    const by = cause(triggers, scene.at)
    if (by) return { origin: by.origin, detail: `${by.detail}, scène « ${scene.name} »` }
    if (schedule) return { ...ruleVerdict(schedule), detail: `${ruleVerdict(schedule).detail}, scène « ${scene.name} »` }
    return { origin: 'scene', detail: `scène « ${scene.name} » lancée par une source que le pont ne dit pas : ${UNKNOWN_SOURCE}` }
  }
  const direct = cause(triggers, change.at)
  if (direct) return direct
  if (schedule) return ruleVerdict(schedule)
  const back = before(triggers, 'connectivity', change.at, WINDOWS.connectivity).find((t) => t.id === change.owner)
  if (back) return { origin: 'power', detail: 'la lampe venait de se reconnecter au pont (retour du courant ou du réseau radio)' }
  return { origin: 'unknown', detail: UNKNOWN_SOURCE }
}

/** Explique une scène lancée : un interrupteur ou un détecteur juste avant, sinon une source inconnue. */
export const classifyScene = (at: number, name: string, triggers: Trigger[], schedule: Schedule | null = null): Verdict => {
  const by = cause(triggers, at)
  if (by) return { origin: by.origin, detail: `${by.detail}, scène « ${name} »` }
  if (schedule) return { ...ruleVerdict(schedule), detail: `${ruleVerdict(schedule).detail}, scène « ${name} »` }
  return { origin: 'unknown', detail: `scène « ${name} » lancée : ${UNKNOWN_SOURCE}` }
}

/** Les événements qui ne sont pas des ordres (appui, mouvement, reconnexion) : l'appareil seul, sans origine à chercher. */
export const deviceVerdict = (detail: string): Verdict => ({ origin: 'device', detail })
