// Les automatisations du pont Hue, mises en phrases : « Tous les jours à 10:00 », « Pièces : cuisine, Couloir », « Action : éteindre ».
// Le pont (API v2, behavior_instance) garde chaque règle en JSON ; ici on n'en lit que ce qu'on sait dire. Des fonctions pures, sans réseau.

export interface Rid {
  rid: string
  rtype: string
}

interface Clock {
  hour: number
  minute: number
}

interface MotionSlot {
  start_time?: { time?: Clock }
  on_motion?: { recall_single?: { action?: unknown }[] }
  on_no_motion?: { after?: { minutes?: number }; recall_single?: { action?: unknown }[] }
}

/** Ce qu'on lit d'une règle du pont : un horaire (quand, où, quoi) ou un détecteur de mouvement (des tranches horaires). */
export interface BehaviorInstance {
  id: string
  enabled: boolean
  status: string
  script_id: string
  metadata?: { name?: string }
  configuration: {
    when_extended?: {
      recurrence_days?: string[]
      start_at?: { time_point?: { time?: Clock }; transition?: { minutes?: number } }
      end_at?: { time_point?: { time?: Clock } }
    }
    where?: { group?: Rid; items?: Rid[] }[]
    what?: { recall?: Rid }[]
    motion?: { when?: { timeslots?: MotionSlot[] } }
  }
}

/** Une pièce, une lampe ou une scène du pont : seul le nom nous sert. */
export interface Named {
  id: string
  metadata?: { name?: string }
}

export interface AutomationDto {
  id: string
  name: string
  enabled: boolean
  /** « horaire » : une heure ; « capteur » : un détecteur de mouvement. */
  kind: 'horaire' | 'capteur'
  /** Ce que la règle fait, en phrases courtes. */
  lines: string[]
}

const DAYS: Record<string, string> = {
  monday: 'lundi',
  tuesday: 'mardi',
  wednesday: 'mercredi',
  thursday: 'jeudi',
  friday: 'vendredi',
  saturday: 'samedi',
  sunday: 'dimanche',
}

const pad = (value: number): string => String(value).padStart(2, '0')
const clock = (time: Clock | undefined): string => (time ? `${pad(time.hour)}:${pad(time.minute)}` : '')

const namesOf = (items: Named[]): Map<string, string> => new Map(items.map((item) => [item.id, item.metadata?.name ?? '?']))

/** « Tous les jours à 10:00 », « lundi, mardi de 07:00 à 08:00 (en 5 min) », « Une fois, de 03:40 à 03:54 ». */
export const describeWhen = (when: NonNullable<BehaviorInstance['configuration']['when_extended']>): string => {
  const days = when.recurrence_days
  const dayText = !days || days.length === 0 ? 'Une fois' : days.length === 7 ? 'Tous les jours' : days.map((day) => DAYS[day] ?? day).join(', ')
  const start = clock(when.start_at?.time_point?.time)
  const end = clock(when.end_at?.time_point?.time)
  const transition = when.start_at?.transition?.minutes
  const range = end ? `de ${start} à ${end}` : `à ${start}`
  return `${dayText} ${range}${transition ? ` (en ${transition} min)` : ''}`
}

/** « scène « Lumineux » », « éteindre » pour une recette du pont (celle des règles « Eteind… »), sinon une mention d'inconnu. */
const describeRecall = (recall: Rid | undefined, scenes: Map<string, string>): string => {
  if (!recall) return 'action inconnue'
  if (recall.rtype === 'scene') return `scène « ${scenes.get(recall.rid) ?? '?'} »`
  // Le pont ne détaille pas ses « recettes » : celle des règles d'extinction est traitée comme « éteindre ».
  if (recall.rtype === 'recipe') return 'éteindre'
  return 'action inconnue'
}

/** Une action d'un détecteur : « rien », « tout éteindre » ou une scène. */
const describeSensorAction = (action: unknown, scenes: Map<string, string>): string => {
  if (action === 'do_nothing') return 'rien'
  if (action === 'all_off') return 'tout éteindre'
  const recall = (action as { recall?: Rid } | null)?.recall
  return recall ? describeRecall(recall, scenes) : 'action inconnue'
}

const describeSensorSlot = (slot: MotionSlot, scenes: Map<string, string>): string => {
  const onMotion = describeSensorAction(slot.on_motion?.recall_single?.[0]?.action, scenes)
  const noMotion = slot.on_no_motion
  const parts = [`mouvement → ${onMotion}`]
  if (noMotion) parts.push(`sans mouvement pendant ${noMotion.after?.minutes ?? '?'} min → ${describeSensorAction(noMotion.recall_single?.[0]?.action, scenes)}`)
  return `À partir de ${clock(slot.start_time?.time)} : ${parts.join(' ; ')}`
}

/** Les règles du pont en phrases : les actives d'abord, puis par nom. */
export const describeAutomations = (instances: BehaviorInstance[], rooms: Named[], lights: Named[], scenes: Named[]): AutomationDto[] => {
  const roomName = namesOf(rooms)
  const lightName = namesOf(lights)
  const sceneName = namesOf(scenes)
  const dtos = instances.map((instance): AutomationDto => {
    const { configuration: config } = instance
    const base = { id: instance.id, name: instance.metadata?.name ?? '?', enabled: instance.enabled }
    const slots = config.motion?.when?.timeslots
    if (slots) {
      const sorted = [...slots].sort((a, b) => clock(a.start_time?.time).localeCompare(clock(b.start_time?.time)))
      return { ...base, kind: 'capteur', lines: sorted.map((slot) => describeSensorSlot(slot, sceneName)) }
    }
    const lines: string[] = []
    if (config.when_extended) lines.push(describeWhen(config.when_extended))
    const where = (config.where ?? []).map((target) => {
      const room = roomName.get(target.group?.rid ?? '') ?? '?'
      const items = (target.items ?? []).map((item) => lightName.get(item.rid) ?? '?')
      return items.length > 0 ? `${room} (${items.join(', ')})` : room
    })
    if (where.length > 0) lines.push(`Pièces : ${where.join(', ')}`)
    const what = [...new Set((config.what ?? []).map((entry) => describeRecall(entry.recall, sceneName)))]
    if (what.length > 0) lines.push(`Action : ${what.join(' ; ')}`)
    return { ...base, kind: 'horaire', lines: lines.length > 0 ? lines : ['Règle non décrite'] }
  })
  return dtos.sort((a, b) => Number(b.enabled) - Number(a.enabled) || a.name.localeCompare(b.name, 'fr'))
}
