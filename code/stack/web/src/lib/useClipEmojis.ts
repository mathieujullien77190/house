// Les emoji des clips sauvegardés prêts pour la carte : les clips sauvegardés qui ont un emoji (`GET /events?saved=1`, relus toutes les 30 s tant que `enabled`), placés d'après le plan
// (`items`, clé `emoji-<id du clip>`) ou, à défaut, sur une rangée au sud de la maison, à déplacer à la main. Vide avant la première réponse.
import { useEffect, useState } from 'react'
import type { PlanEmoji } from '@house/ui'
import { fromHousePlan } from '@/components/MapPlan/helpers'
import { fetchSavedEvents } from '@/lib/api'
import type { EventRow } from '@/types'

const REFRESH_MS = 30_000

/** La clé de la position de l'emoji d'un clip dans les éléments du plan. */
export const emojiItemId = (id: string): string => `emoji-${id}`

/** La place de départ de la rangée d'emoji, dans le repère de l'ancien plan de la maison (540 × 300) : au sud, côte à côte. */
const START = { x: 40, y: 290 }
const START_STEP = 36

export const useClipEmojis = (
  apiKey: string,
  items: Record<string, { x: number; y: number }>,
  enabled: boolean,
): { emojis: PlanEmoji[]; clips: Record<string, EventRow> } => {
  const [events, setEvents] = useState<EventRow[]>([])

  useEffect(() => {
    if (!enabled) return
    let alive = true
    const load = () =>
      fetchSavedEvents(apiKey)
        .then((list) => {
          if (alive) setEvents(list)
        })
        .catch(() => undefined)
    load()
    const timer = setInterval(load, REFRESH_MS)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [apiKey, enabled])

  const withEmoji = events.filter((event): event is EventRow & { emoji: string } => Boolean(event.emoji))
  const emojis = withEmoji.map((event, index): PlanEmoji => ({
    id: event.id,
    emoji: event.emoji,
    ...(items[emojiItemId(event.id)] ?? fromHousePlan(START.x + START_STEP * index, START.y)),
  }))
  return { emojis, clips: Object.fromEntries(withEmoji.map((event) => [event.id, event])) }
}
