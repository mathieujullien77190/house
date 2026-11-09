// La carte de chaleur déjà calculée d'une caméra : un fichier JSON de STATE_DIR. C'est une donnée dérivée des images : un fichier abîmé ou d'une autre version est simplement
// oublié (la carte se recalcule), contrairement aux fichiers de l'utilisateur.
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { COLS, ROWS, THRESHOLDS, emptyCounts } from './heatmapMath.ts'

/** Change quand la grille ou les seuils changent : l'ancienne carte n'a plus de sens. */
const VERSION = 1

export interface Heatmap {
  /** L'instant (secondes) de la dernière image traitée : le calcul reprend après elle. */
  upTo: number
  /** L'instant et la grille de gris de la dernière image lue avec succès, pour la comparer à la suivante ; null au départ. */
  frameAt: number
  frame: Uint8Array | null
  /** Le nombre de paires d'images comparées. */
  pairs: number
  /** Un compteur par seuil (`THRESHOLDS`), une valeur par case. */
  counts: Uint16Array[]
}

export const emptyHeatmap = (): Heatmap => ({ upTo: 0, frameAt: 0, frame: null, pairs: 0, counts: emptyCounts() })

const bytesOf = (text: unknown, length: number): Uint8Array | null => {
  if (typeof text !== 'string') return null
  const bytes = new Uint8Array(Buffer.from(text, 'base64'))
  return bytes.length === length ? bytes : null
}

export const createHeatmapStore = (dir: string) => {
  const fileOf = (camera: string) => `${dir}/heatmap-${camera}.json`
  return {
    /** La carte gardée, ou une carte vide (fichier absent, abîmé ou d'une autre version). */
    read: (camera: string): Heatmap => {
      try {
        const parsed = JSON.parse(readFileSync(fileOf(camera), 'utf8')) as {
          version?: unknown
          upTo?: unknown
          frameAt?: unknown
          frame?: unknown
          pairs?: unknown
          counts?: unknown
        }
        const cells = COLS * ROWS
        const counts = Array.isArray(parsed.counts) ? parsed.counts.map((level) => bytesOf(level, cells * 2)) : []
        if (
          parsed.version !== VERSION ||
          typeof parsed.upTo !== 'number' ||
          typeof parsed.frameAt !== 'number' ||
          typeof parsed.pairs !== 'number' ||
          counts.length !== THRESHOLDS.length ||
          counts.some((level) => level === null)
        )
          return emptyHeatmap()
        return {
          upTo: parsed.upTo,
          frameAt: parsed.frameAt,
          frame: parsed.frame === null ? null : bytesOf(parsed.frame, cells),
          pairs: parsed.pairs,
          counts: counts.map((level) => new Uint16Array(level!.buffer.slice(level!.byteOffset, level!.byteOffset + level!.byteLength))),
        }
      } catch {
        return emptyHeatmap()
      }
    },
    /** Garde la carte (écrite dans un fichier temporaire puis renommée). */
    write: (camera: string, heat: Heatmap): void => {
      const file = fileOf(camera)
      mkdirSync(dirname(file), { recursive: true })
      const partial = `${file}.tmp`
      writeFileSync(
        partial,
        JSON.stringify({
          version: VERSION,
          upTo: heat.upTo,
          frameAt: heat.frameAt,
          frame: heat.frame ? Buffer.from(heat.frame).toString('base64') : null,
          pairs: heat.pairs,
          counts: heat.counts.map((level) => Buffer.from(level.buffer, level.byteOffset, level.byteLength).toString('base64')),
        }),
      )
      renameSync(partial, file)
    },
  }
}

export type HeatmapStore = ReturnType<typeof createHeatmapStore>
