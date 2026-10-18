import { GLOSSARY } from '@/glossary'
import type { Segment } from './types'

const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Écritures du glossaire, les plus longues d'abord pour qu'elles l'emportent sur leurs fragments. */
const ALIASES = GLOSSARY.flatMap((e) => e.match.map((alias) => ({ alias, id: e.id }))).sort(
  (a, b) => b.alias.length - a.alias.length,
)

const LOOKUP = new Map(ALIASES.map((a) => [a.alias.toLowerCase(), a.id]))

const PATTERN = new RegExp(
  `(?<![\\p{L}\\p{N}])(${ALIASES.map((a) => escapeRegExp(a.alias)).join('|')})(?![\\p{L}\\p{N}])`,
  'giu',
)

/** Découpe un texte en morceaux simples et en termes du glossaire. */
export const splitTerms = (text: string): Segment[] => {
  const out: Segment[] = []
  let last = 0
  for (const m of text.matchAll(PATTERN)) {
    const start = m.index
    if (start > last) out.push({ text: text.slice(last, start) })
    out.push({ text: m[0], termId: LOOKUP.get(m[0].toLowerCase()) })
    last = start + m[0].length
  }
  if (last < text.length) out.push({ text: text.slice(last) })
  return out
}
