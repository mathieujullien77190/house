// Le plan de la maison (la carte de la WebApp) : arbres, haies, cage, chemin du garage et portes, positions de la lampe et de la prise, caméras du plan et leur lien avec les vraies
// caméras. Gardé par l'API (STATE_DIR/plan.json) pour qu'il soit le même sur tous les appareils ; House Sync le lit (en lecture seule) et l'importe dans SQLite (table `plan`).
// Un document : seules les parties connues et bien formées sont gardées, le reste est jeté.
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

type Point = [number, number]

export interface PlanDocument {
  trees: { id: string; x: number; y: number; r: number }[]
  hedges: { id: string; points: Point[] }[]
  cage: { x: number; y: number } | null
  /** Les décalages du chemin du garage et des portes, par identifiant. */
  offsets: Record<string, { dx: number; dy: number }>
  /** Les positions de la lampe et de la prise, par identifiant. */
  items: Record<string, { x: number; y: number }>
  cameras: { id: string; name: string; x: number; y: number; angle: number; fov: number; near: number; far: number }[]
  /** Le lien de chaque caméra du plan (identifiant) avec une vraie caméra (son nom). */
  links: Record<string, string>
}

const ID = /^[\w.:-]{1,60}$/
const MAX_ITEMS = 200
const MAX_POINTS = 400

const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const round = (value: number): number => Math.round(value * 100) / 100
const record = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value.slice(0, MAX_ITEMS) : [])
const text = (value: unknown, max = 120): string | null =>
  typeof value === 'string' && value.length > 0 && value.length <= max ? value : null

/** Le document tel qu'on le garde : ce qui est bien formé, arrondi ; un document vide est valable (tout reste au dessin de départ). */
export const parsePlan = (value: unknown): PlanDocument => {
  const raw = record(value)
  const plan: PlanDocument = { trees: [], hedges: [], cage: null, offsets: {}, items: {}, cameras: [], links: {} }
  for (const item of list(raw.trees)) {
    const tree = record(item)
    const id = text(tree.id)
    if (id && ID.test(id) && finite(tree.x) && finite(tree.y) && finite(tree.r) && tree.r > 0)
      plan.trees.push({ id, x: round(tree.x), y: round(tree.y), r: round(tree.r) })
  }
  for (const item of list(raw.hedges)) {
    const hedge = record(item)
    const id = text(hedge.id)
    if (!id || !ID.test(id) || !Array.isArray(hedge.points) || hedge.points.length < 2 || hedge.points.length > MAX_POINTS) continue
    const points: Point[] = []
    for (const point of hedge.points as unknown[]) {
      if (Array.isArray(point) && point.length === 2 && finite(point[0]) && finite(point[1]))
        points.push([round(point[0]), round(point[1])])
    }
    if (points.length === hedge.points.length) plan.hedges.push({ id, points })
  }
  const cage = record(raw.cage)
  if (finite(cage.x) && finite(cage.y)) plan.cage = { x: round(cage.x), y: round(cage.y) }
  for (const [id, item] of Object.entries(record(raw.offsets)).slice(0, MAX_ITEMS)) {
    const offset = record(item)
    if (ID.test(id) && finite(offset.dx) && finite(offset.dy)) plan.offsets[id] = { dx: round(offset.dx), dy: round(offset.dy) }
  }
  for (const [id, item] of Object.entries(record(raw.items)).slice(0, MAX_ITEMS)) {
    const position = record(item)
    if (ID.test(id) && finite(position.x) && finite(position.y)) plan.items[id] = { x: round(position.x), y: round(position.y) }
  }
  for (const item of list(raw.cameras)) {
    const camera = record(item)
    const id = text(camera.id)
    const name = text(camera.name, 200)
    if (
      id &&
      ID.test(id) &&
      name &&
      finite(camera.x) &&
      finite(camera.y) &&
      finite(camera.angle) &&
      finite(camera.fov) &&
      finite(camera.near) &&
      finite(camera.far)
    ) {
      plan.cameras.push({
        id,
        name,
        x: round(camera.x),
        y: round(camera.y),
        angle: round(camera.angle),
        fov: round(camera.fov),
        near: round(camera.near),
        far: round(camera.far),
      })
    }
  }
  for (const [id, name] of Object.entries(record(raw.links)).slice(0, MAX_ITEMS)) {
    if (ID.test(id) && typeof name === 'string' && /^[\w-]{1,40}$/.test(name)) plan.links[id] = name
  }
  return plan
}

export const createPlanStore = (file: string) => {
  const read = (): PlanDocument | null => {
    try {
      return parsePlan(JSON.parse(readFileSync(file, 'utf8')))
    } catch {
      return null
    }
  }
  return {
    /** Le plan gardé, ou null s'il n'y en a pas encore (les appareils partent alors de leur dessin et de leurs réglages locaux). */
    get: read,
    /** Garde le plan (nettoyé) et le rend. Écrit dans un fichier temporaire puis le renomme. */
    set: (value: unknown): PlanDocument => {
      const plan = parsePlan(value)
      mkdirSync(dirname(file), { recursive: true })
      const partial = `${file}.tmp`
      writeFileSync(partial, JSON.stringify(plan, null, 2))
      renameSync(partial, file)
      return plan
    },
  }
}

export type PlanStore = ReturnType<typeof createPlanStore>
