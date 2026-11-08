// Le plan de la mosaïque, gardé aussi par House API (puis importé dans SQLite par House Sync) pour qu'il soit le même sur tous les appareils.
// Les hooks du plan (arbres, haies, cage, portes, caméras, lampe et prise, liens) lisent et écrivent le localStorage de l'appareil ; ce fichier fait le pont :
// au démarrage on prend le plan de l'API (ou, s'il n'y en a pas, on lui envoie celui de l'appareil), puis chaque changement local est envoyé. `startSync` dit si le plan de l'API a changé celui de l'appareil (les hooks doivent alors le relire).
import { PLAN_CAMERAS } from '@/components/Lights/constants'
import { fetchPlan, putPlan, type PlanDocument } from '@/lib/api'
import { defaultLinks } from '@/lib/usePlanLinks'

const KEYS = {
  trees: 'house-plan-trees-v5',
  hedges: 'house-plan-hedges-v1',
  cage: 'house-plan-cage-v1',
  moves: 'house-plan-moves-v1',
  cameras: 'house-plan-cameras-v1',
  items: 'house-plan-items-v1',
  links: 'house-plan-links-v1',
} as const

const read = (key: string): unknown => {
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null')
  } catch {
    return null
  }
}
const write = (key: string, value: unknown): void => {
  try {
    if (value === undefined || value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // pas de stockage : le plan de l'appareil ne se garde pas
  }
}
const record = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {}

/** Le plan tel que cet appareil l'a (ses réglages gardés, sinon le dessin de départ), prêt à envoyer. */
export const collectPlan = (): PlanDocument => {
  const positions = record(read(KEYS.cameras))
  const cage = record(read(KEYS.cage))
  const storedLinks = record(read(KEYS.links))
  const links = {
    ...defaultLinks(),
    ...Object.fromEntries(Object.entries(storedLinks).filter(([, name]) => typeof name === 'string')),
  } as Record<string, string>
  const trees = read(KEYS.trees)
  const hedges = read(KEYS.hedges)
  return {
    trees: Array.isArray(trees) ? trees : [],
    hedges: Array.isArray(hedges) ? hedges : [],
    cage: typeof cage.x === 'number' && typeof cage.y === 'number' ? { x: cage.x, y: cage.y } : null,
    offsets: record(read(KEYS.moves)) as PlanDocument['offsets'],
    items: record(read(KEYS.items)) as PlanDocument['items'],
    cameras: PLAN_CAMERAS.map((camera) => ({ ...camera, ...record(positions[camera.id]) })),
    links,
  }
}

/** Pose le plan de l'API dans le localStorage de l'appareil, d'où les hooks le lisent à leur montage. */
export const applyPlan = (plan: PlanDocument): void => {
  if (plan.trees.length > 0) write(KEYS.trees, plan.trees)
  if (plan.hedges.length > 0) write(KEYS.hedges, plan.hedges)
  write(KEYS.cage, plan.cage)
  write(KEYS.moves, plan.offsets)
  write(KEYS.items, plan.items)
  write(
    KEYS.cameras,
    Object.fromEntries(
      plan.cameras.map((camera) => [camera.id, { x: camera.x, y: camera.y, angle: camera.angle, far: camera.far, fov: camera.fov }]),
    ),
  )
  write(KEYS.links, plan.links)
}

/** Au démarrage : le plan de l'API s'il y en a un (il prend la place de celui de l'appareil), sinon celui de l'appareil lui est envoyé. Rend le texte du plan de départ, pour ne renvoyer que ce qui change. */
export const startSync = async (key: string): Promise<{ last: string; changed: boolean }> => {
  const before = JSON.stringify(collectPlan())
  try {
    const stored = await fetchPlan(key)
    if (stored) applyPlan(stored)
    else await putPlan(key, collectPlan())
  } catch {
    // l'API ne répond pas : l'appareil garde son plan, il sera envoyé au prochain changement
  }
  const last = JSON.stringify(collectPlan())
  return { last, changed: last !== before }
}

/** Envoie le plan s'il a changé depuis `last` ; rend le nouveau texte du plan envoyé (ou `last` si rien n'a changé ou si l'envoi échoue). */
export const pushIfChanged = async (key: string, last: string): Promise<string> => {
  const current = collectPlan()
  const text = JSON.stringify(current)
  if (text === last) return last
  try {
    await putPlan(key, current)
    return text
  } catch {
    return last
  }
}
