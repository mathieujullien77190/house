// Le plan de la maison (la carte de l'onglet Caméras) : House API en est la seule source, rien n'est gardé dans le navigateur. Le plan est lu une fois au montage (un autre appareil
// le retrouve en rechargeant la page) ; un changement local s'applique tout de suite et part à l'API 500 ms plus tard (le dernier gagne, la base est mise à jour). Tant que le plan de
// l'API n'est pas lu, rien n'est envoyé (le dessin de départ n'écrase jamais le plan gardé).
import { useCallback, useEffect, useRef, useState } from 'react'
import type { PlanCamera, PlanHedge, PlanTree } from '@house/ui'
import { DEFAULT_TREES, PLAN_CAGE, PLAN_CAMERA_LINKS, PLAN_CAMERAS } from '@/components/Lights/constants'
import { PARCEL_HEDGES } from '@/components/MapPlan/parcel'
import { fetchPlan, putPlan, type PlanDocument } from '@/lib/api'
import { fromStored, STORED_VERSION, toStored } from '@/lib/planCoords'

const SAVE_DELAY_MS = 500

/** Les liens de départ : l'identifiant de l'icône du plan pour chaque vraie caméra (PLAN_CAMERA_LINKS dit l'inverse). */
const DEFAULT_LINKS: Record<string, string> = Object.fromEntries(Object.entries(PLAN_CAMERA_LINKS).map(([name, planId]) => [planId, name]))

/** Le plan de départ, tel qu'il est dessiné avant que quelqu'un le modifie. */
const startingPlan = (): PlanDocument => ({
  trees: DEFAULT_TREES,
  hedges: PARCEL_HEDGES,
  cage: null,
  offsets: {},
  items: {},
  cameras: PLAN_CAMERAS,
  links: DEFAULT_LINKS,
})

/** Le plan de l'API complété par le dessin de départ : les arbres, haies et caméras qu'il n'a pas encore, les liens de départ. */
const merged = (document: PlanDocument): PlanDocument => {
  const stored = fromStored(document)
  const start = startingPlan()
  const known = new Set(stored.trees.map((tree) => tree.id))
  return {
    trees: stored.trees.length > 0 ? [...stored.trees, ...start.trees.filter((tree) => !known.has(tree.id))] : start.trees,
    hedges: stored.hedges.length > 0 ? stored.hedges : start.hedges,
    cage: stored.cage,
    offsets: stored.offsets,
    items: stored.items,
    cameras: start.cameras.map((camera) => ({ ...camera, ...stored.cameras.find((saved) => saved.id === camera.id) })),
    links: { ...DEFAULT_LINKS, ...stored.links },
  }
}

export interface PlanState {
  trees: PlanTree[]
  hedges: PlanHedge[]
  /** La cage à perruches : sa taille est celle du dessin, sa place est gardée. */
  cage: { x: number; y: number; w: number; h: number }
  /** Les décalages du chemin du garage et des portes, par identifiant. */
  offsets: Record<string, { dx: number; dy: number }>
  /** Les positions de la lampe et de la prise, par identifiant. */
  items: Record<string, { x: number; y: number }>
  cameras: PlanCamera[]
  /** Le lien de chaque caméra du plan (identifiant) avec une vraie caméra (son nom). */
  links: Record<string, string>
  moveTree: (id: string, x: number, y: number) => void
  resizeTree: (id: string, r: number) => void
  moveHedge: (id: string, points: [number, number][]) => void
  moveCage: (x: number, y: number) => void
  moveOffset: (id: string, dx: number, dy: number) => void
  moveItem: (id: string, x: number, y: number) => void
  /** Pose d'un coup plusieurs éléments (les coins des carreaux). */
  moveItems: (items: Record<string, { x: number; y: number }>) => void
  moveCamera: (id: string, x: number, y: number) => void
  adjustCamera: (id: string, setting: { angle: number; far: number; fov: number }) => void
  link: (planId: string, camera: string) => void
}

export const usePlan = (apiKey: string): PlanState => {
  const [plan, setPlan] = useState<PlanDocument>(startingPlan)
  // Le plan de l'API a été lu : on peut en renvoyer des changements.
  const loaded = useRef(false)
  const latest = useRef(plan)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const send = useCallback(() => {
    // Si l'API ne répond pas, le changement sera renvoyé avec le suivant.
    putPlan(apiKey, toStored(latest.current)).catch(() => undefined)
  }, [apiKey])

  // Lecture au montage.
  useEffect(() => {
    let cancelled = false
    const read = async () => {
      try {
        const stored = await fetchPlan(apiKey)
        if (cancelled) return
        if (!stored) {
          // Pas encore de plan gardé : le dessin de départ le devient.
          if (!loaded.current) {
            loaded.current = true
            send()
          }
          return
        }
        loaded.current = true
        // Un changement fait pendant la lecture reste : il sera envoyé par-dessus.
        if (timer.current) return
        const next = merged(stored)
        latest.current = next
        setPlan(next)
        // Un plan enregistré en unités du dessin (version 1) est renvoyé tout de suite en vraies coordonnées.
        if (stored.version !== STORED_VERSION) send()
      } catch {
        // l'API ne répond pas : on garde ce qu'on a
      }
    }
    void read()
    return () => {
      cancelled = true
    }
  }, [apiKey, send])

  // Un changement local : appliqué tout de suite, envoyé 500 ms après le dernier.
  const change = useCallback(
    (update: (current: PlanDocument) => PlanDocument) => {
      const next = update(latest.current)
      latest.current = next
      setPlan(next)
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        timer.current = undefined
        if (loaded.current) send()
      }, SAVE_DELAY_MS)
    },
    [send],
  )
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )

  const moveTree = useCallback(
    (id: string, x: number, y: number) =>
      change((p) => ({ ...p, trees: p.trees.map((tree) => (tree.id === id ? { ...tree, x, y } : tree)) })),
    [change],
  )
  const resizeTree = useCallback(
    (id: string, r: number) => change((p) => ({ ...p, trees: p.trees.map((tree) => (tree.id === id ? { ...tree, r } : tree)) })),
    [change],
  )
  const moveHedge = useCallback(
    (id: string, points: [number, number][]) =>
      change((p) => ({ ...p, hedges: p.hedges.map((hedge) => (hedge.id === id ? { ...hedge, points } : hedge)) })),
    [change],
  )
  const moveCage = useCallback((x: number, y: number) => change((p) => ({ ...p, cage: { x, y } })), [change])
  const moveOffset = useCallback(
    (id: string, dx: number, dy: number) => change((p) => ({ ...p, offsets: { ...p.offsets, [id]: { dx, dy } } })),
    [change],
  )
  const moveItem = useCallback(
    (id: string, x: number, y: number) => change((p) => ({ ...p, items: { ...p.items, [id]: { x, y } } })),
    [change],
  )
  const moveItems = useCallback(
    (items: Record<string, { x: number; y: number }>) => change((p) => ({ ...p, items: { ...p.items, ...items } })),
    [change],
  )
  const moveCamera = useCallback(
    (id: string, x: number, y: number) =>
      change((p) => ({ ...p, cameras: p.cameras.map((camera) => (camera.id === id ? { ...camera, x, y } : camera)) })),
    [change],
  )
  const adjustCamera = useCallback(
    (id: string, setting: { angle: number; far: number; fov: number }) =>
      change((p) => ({ ...p, cameras: p.cameras.map((camera) => (camera.id === id ? { ...camera, ...setting } : camera)) })),
    [change],
  )
  const link = useCallback(
    (planId: string, camera: string) =>
      change((p) => {
        // Une vraie caméra n'est liée qu'à une icône du plan : on retire son ancien lien.
        const links = Object.fromEntries(Object.entries(p.links).map(([id, name]) => [id, name === camera && camera !== '' ? '' : name]))
        links[planId] = camera
        return { ...p, links }
      }),
    [change],
  )

  return {
    trees: plan.trees,
    hedges: plan.hedges,
    cage: { ...PLAN_CAGE, ...plan.cage },
    offsets: plan.offsets,
    items: plan.items,
    cameras: plan.cameras,
    links: plan.links,
    moveTree,
    resizeTree,
    moveHedge,
    moveCage,
    moveOffset,
    moveItem,
    moveItems,
    moveCamera,
    adjustCamera,
    link,
  }
}
