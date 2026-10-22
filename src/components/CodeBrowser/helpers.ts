import { ORDER, RULES } from './constants'
import type { Language, Token, TreeNode } from './types'

interface Dir {
  dirs: Map<string, Dir>
  files: string[]
}

const rank = (name: string): number => {
  const i = ORDER.indexOf(name)
  return i === -1 ? ORDER.length : i
}

const byRank = (a: string, b: string): number => rank(a) - rank(b) || a.localeCompare(b)

/** Langage d'un fichier, déduit de son nom. */
export const languageOf = (path: string): Language => {
  const name = path.split('/').pop() ?? path
  if (name === 'Dockerfile') return 'dockerfile'
  if (name === '.env.example') return 'env'
  if (/\.(ts|js)$/.test(name)) return 'ts'
  if (/\.ya?ml$/.test(name)) return 'yaml'
  if (name.endsWith('.json')) return 'json'
  if (name.endsWith('.html')) return 'html'
  if (name.endsWith('.md')) return 'md'
  return 'plain'
}

/** Découpe le code en morceaux colorables : chaque règle est testée dans l'ordre à chaque position. */
export const tokenize = (code: string, language: Language): Token[] => {
  const rules = RULES[language]
  if (rules.length === 0) return [{ text: code, kind: 'plain' }]
  const regex = new RegExp(rules.map(([, rule]) => `(${rule.source})`).join('|'), 'gm')
  const out: Token[] = []
  let last = 0
  for (const match of code.matchAll(regex)) {
    const start = match.index ?? 0
    if (start > last) out.push({ text: code.slice(last, start), kind: 'plain' })
    const rule = rules[match.slice(1).findIndex((group) => group !== undefined)]
    out.push({ text: match[0], kind: rule[0] })
    last = start + match[0].length
  }
  if (last < code.length) out.push({ text: code.slice(last), kind: 'plain' })
  return out
}

/** Aplatit les chemins en lignes d'arbre : dans chaque dossier, les fichiers d'abord, puis les sous-dossiers. */
export const buildTree = (paths: string[]): TreeNode[] => {
  const root: Dir = { dirs: new Map(), files: [] }
  for (const path of paths) {
    const parts = path.split('/')
    let dir = root
    for (const part of parts.slice(0, -1)) {
      const existing = dir.dirs.get(part)
      const next: Dir = existing ?? { dirs: new Map(), files: [] }
      dir.dirs.set(part, next)
      dir = next
    }
    dir.files.push(parts[parts.length - 1])
  }

  const out: TreeNode[] = []
  const walk = (dir: Dir, prefix: string, depth: number) => {
    for (const name of [...dir.files].sort(byRank)) out.push({ name, path: prefix + name, depth, isFolder: false })
    for (const [name, child] of [...dir.dirs.entries()].sort(([a], [b]) => byRank(a, b))) {
      out.push({ name, path: prefix + name, depth, isFolder: true })
      walk(child, `${prefix}${name}/`, depth + 1)
    }
  }
  walk(root, '', 0)
  return out
}
