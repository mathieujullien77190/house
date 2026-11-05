// La fusion des clips qui se recouvrent : un mouvement qui reprend quelques secondes après la fin d'un autre donne deux
// clips dont les marges (avant et après) se chevauchent. Passé un délai, on en refait un seul clip.
import type { MotionRecord } from './events.ts'

/** Les marges d'un clip : secondes gardées avant et après l'événement, et durée d'un segment (le clip déborde d'un segment). */
export interface ClipMargins {
  preSeconds: number
  postSeconds: number
  segmentSeconds: number
}

/**
 * Les groupes d'événements à fusionner, chacun du plus ancien au plus récent (identifiants). Deux événements voisins
 * d'une même caméra se suivent quand leurs clips se recouvrent : le suivant commence (`clip_start`, sinon au plus tôt
 * deux segments avant sa marge) avant la fin possible du précédent (fin + marge d'après + un segment) ; un groupe n'est
 * fusionné que si son dernier événement est fini depuis `delaySeconds`.
 */
export const findMergeGroups = (events: MotionRecord[], now: number, margins: ClipMargins, delaySeconds: number): string[][] => {
  const groups: string[][] = []
  const cameras = new Set(events.map((e) => e.camera))
  for (const camera of cameras) {
    const own = events.filter((e) => e.camera === camera && e.merged_into === undefined).sort((a, b) => a.start_time - b.start_time)
    let current: MotionRecord[] = []
    let currentEnd = 0
    const flush = () => {
      if (current.length >= 2 && now - currentEnd >= delaySeconds) groups.push(current.map((e) => e.id))
      current = []
    }
    for (const event of own) {
      // Un événement en cours coupe la chaîne : on ne fusionne pas ce qui n'est pas fini.
      if (event.end_time === null) {
        flush()
        continue
      }
      const clipStart = event.clip_start ?? event.start_time - margins.preSeconds - 2 * margins.segmentSeconds
      if (current.length > 0 && clipStart < currentEnd + margins.postSeconds + margins.segmentSeconds) {
        current.push(event)
        currentEnd = Math.max(currentEnd, event.end_time)
      } else {
        flush()
        current = [event]
        currentEnd = event.end_time
      }
    }
    flush()
  }
  return groups
}
