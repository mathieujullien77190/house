// Les emoji des clips (🦊) : un petit fichier JSON gardé par l'API (STATE_DIR), à part des notes et de la liste des clips sauvegardés. Un emoji par clip ; la carte de la maison le montre.
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

const ID = /^[\w.-]+$/

/** La longueur d'un emoji, en unités UTF-16 : un emoji composé (famille, drapeau, peau) en prend jusqu'à une dizaine ; au-delà, ce n'est pas un emoji. */
export const MAX_EMOJI_LENGTH = 16

/** Vrai pour un texte court qui contient un pictogramme et rien qu'un : pas de lettres ni de chiffres. */
export const isEmoji = (value: string): boolean => value.length > 0 && value.length <= MAX_EMOJI_LENGTH && /[\p{Extended_Pictographic}\p{Regional_Indicator}]/u.test(value) && !/[\p{L}\p{N}]/u.test(value)

/** Les emoji du fichier ; null s'il existe mais n'a pas la bonne forme (on ne l'écrase jamais : ils seraient perdus). */
const readEmojis = (file: string): Record<string, string> | null => {
  let text: string
  try {
    text = readFileSync(file, 'utf8')
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'ENOENT' ? {} : null
  }
  try {
    const parsed = JSON.parse(text) as { emojis?: unknown }
    if (typeof parsed.emojis !== 'object' || parsed.emojis === null || Array.isArray(parsed.emojis)) return null
    return Object.fromEntries(Object.entries(parsed.emojis).filter((entry): entry is [string, string] => ID.test(entry[0]) && typeof entry[1] === 'string' && isEmoji(entry[1])))
  } catch {
    return null
  }
}

export const createClipEmojisStore = (file: string) => ({
  /** Les emoji par identifiant de clip (vide si le fichier manque ou est illisible : l'affichage n'en dépend pas). */
  all: (): Record<string, string> => readEmojis(file) ?? {},
  /** Pose l'emoji d'un clip ; `null` le retire. Refuse un texte qui n'est pas un emoji et d'écraser un fichier illisible. */
  set: (id: string, emoji: string | null): void => {
    if (!ID.test(id)) throw new Error('identifiant de clip invalide')
    if (emoji !== null && !isEmoji(emoji)) throw new Error('emoji invalide')
    const current = readEmojis(file)
    if (current === null) throw new Error('emoji des clips illisibles : non modifiés')
    const next = { ...current }
    if (emoji !== null) next[id] = emoji
    else delete next[id]
    mkdirSync(dirname(file), { recursive: true })
    const partial = `${file}.tmp`
    writeFileSync(partial, JSON.stringify({ emojis: next }, null, 2))
    renameSync(partial, file)
  },
})

export type ClipEmojisStore = ReturnType<typeof createClipEmojisStore>
