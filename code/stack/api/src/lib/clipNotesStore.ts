// Les notes des clips (« renard ») : un petit fichier JSON gardé par l'API (STATE_DIR), à part de la liste des clips sauvegardés que House Sync lit.
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

const ID = /^[\w.-]+$/

/** La longueur d'une note, en caractères : une étiquette, pas un texte. */
export const MAX_NOTE_LENGTH = 200

/** Les notes du fichier ; null s'il existe mais n'a pas la bonne forme (on ne l'écrase jamais : les notes seraient perdues). */
const readNotes = (file: string): Record<string, string> | null => {
  let text: string
  try {
    text = readFileSync(file, 'utf8')
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'ENOENT' ? {} : null
  }
  try {
    const parsed = JSON.parse(text) as { notes?: unknown }
    if (typeof parsed.notes !== 'object' || parsed.notes === null || Array.isArray(parsed.notes)) return null
    return Object.fromEntries(Object.entries(parsed.notes).filter((entry): entry is [string, string] => ID.test(entry[0]) && typeof entry[1] === 'string'))
  } catch {
    return null
  }
}

export const createClipNotesStore = (file: string) => ({
  /** Les notes par identifiant de clip (vide si le fichier manque ou est illisible : l'affichage n'en dépend pas). */
  all: (): Record<string, string> => readNotes(file) ?? {},
  /** Pose la note d'un clip (sans espaces autour, au plus `MAX_NOTE_LENGTH` caractères) ; une note vide la supprime. Refuse d'écraser un fichier illisible. */
  set: (id: string, note: string): void => {
    if (!ID.test(id)) throw new Error('identifiant de clip invalide')
    const current = readNotes(file)
    if (current === null) throw new Error('notes des clips illisibles : non modifiées')
    const text = note.trim().slice(0, MAX_NOTE_LENGTH)
    const next = { ...current }
    if (text) next[id] = text
    else delete next[id]
    mkdirSync(dirname(file), { recursive: true })
    const partial = `${file}.tmp`
    writeFileSync(partial, JSON.stringify({ notes: next }, null, 2))
    renameSync(partial, file)
  },
})

export type ClipNotesStore = ReturnType<typeof createClipNotesStore>
