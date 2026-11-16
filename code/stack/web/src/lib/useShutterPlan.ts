// Les volets roulants prêts pour la carte : relus toutes les 10 s tant que `enabled`, placés d'après le plan (`items`, clé `shutter-<id>`) ou, à défaut, à leur place de départ dans la
// pièce. Seuls les volets qui ont une place de départ (celui dont le nom contient « cuisine », « salon », « porte » ou « PC ») ou une place gardée se voient : la cuisine, le salon, la porte et le PC. Vide sans volets configurés.
import { useCallback, useEffect, useState } from 'react'
import type { PlanShutter } from '@house/ui'
import { lastText } from '@/components/ShuttersPanel/helpers'
import { fromHousePlan } from '@/components/MapPlan/helpers'
import { fetchShutters, sendShutter } from '@/lib/api'
import type { ShutterInfo } from '@/types'

const REFRESH_MS = 10_000

/** La clé de la position d'un volet dans les éléments du plan. */
export const shutterItemId = (id: string): string => `shutter-${id}`

/** La place de départ du volet de la cuisine (repéré par son nom : son numéro dépend de `SHUTTERS` dans le .env), dans le repère de l'ancien plan de la maison (540 × 300, converti à la lecture) : au mur nord de la cuisine. À déplacer à la main. */
const KITCHEN_START = { x: 315, y: 8 }
/** La place de départ du volet du salon (repéré par son nom), même repère : au mur sud du salon. À déplacer à la main. */
const LIVING_ROOM_START = { x: 345, y: 292 }
/** La place de départ du volet de la porte (repéré par son nom), même repère : au mur ouest. Posée au jugé, à déplacer à la main. */
const DOOR_START = { x: 8, y: 150 }
/** La place de départ du volet du PC (repéré par son nom), même repère : au mur ouest, plus bas que la porte. Posée au jugé, à déplacer à la main. */
const PC_START = { x: 8, y: 230 }

export interface ShutterPlan {
  shutters: PlanShutter[]
  /** Un clic sur un volet : le descend s'il est ouvert, le monte s'il est fermé (le dernier ordre fait foi : fermé seulement après « descendre »). */
  toggle: (id: string) => void
}

export const useShutterPlan = (apiKey: string, items: Record<string, { x: number; y: number }>, enabled: boolean): ShutterPlan => {
  const [shutters, setShutters] = useState<ShutterInfo[]>([])

  useEffect(() => {
    if (!enabled) return
    let alive = true
    const load = () =>
      fetchShutters(apiKey)
        .then((state) => {
          if (alive) setShutters(state.shutters)
        })
        .catch(() => undefined)
    load()
    const timer = setInterval(load, REFRESH_MS)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [apiKey, enabled])

  const toggle = useCallback(
    (id: string) => {
      const shutter = shutters.find((item) => item.id === id)
      if (!shutter) return
      sendShutter(apiKey, id, shutter.lastCommand === 'down' ? 'up' : 'down')
        .then((next) => setShutters((current) => current.map((item) => (item.id === id ? next : item))))
        .catch(() => undefined)
    },
    [apiKey, shutters],
  )

  const placed = shutters.flatMap((shutter): PlanShutter[] => {
    const start = /cuisine/i.test(shutter.name) ? KITCHEN_START : /salon/i.test(shutter.name) ? LIVING_ROOM_START : /porte/i.test(shutter.name) ? DOOR_START : /\bpc\b/i.test(shutter.name) ? PC_START : undefined
    const place = items[shutterItemId(shutter.id)] ?? (start ? fromHousePlan(start.x, start.y) : null)
    return place
      ? [
          {
            id: shutter.id,
            name: shutter.name,
            ...place,
            closed: shutter.lastCommand === 'down',
            label: `${shutter.name} · ${lastText(shutter)}`,
          },
        ]
      : []
  })
  return { shutters: placed, toggle }
}
