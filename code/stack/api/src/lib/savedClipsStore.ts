// Les clips sauvegardés (à garder pour toujours) : un petit fichier JSON gardé par l'API (STATE_DIR) que House Sync lit
// avant d'effacer les vieux clips. L'API n'écrit jamais la base : c'est ce fichier qui dit quels clips sont à l'abri.
import type { DocStore } from './docStore.ts'

const ID = /^[\w.-]+$/

/** Les identifiants du fichier ; null s'il existe mais n'a pas la bonne forme (on ne l'écrase jamais : la liste serait perdue). */
const readIds = (file: DocStore): string[] | null => {
  let text: string
  try {
    text = file.read()
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'ENOENT' ? [] : null
  }
  try {
    const parsed = JSON.parse(text) as { ids?: unknown }
    return Array.isArray(parsed.ids) ? parsed.ids.filter((id): id is string => typeof id === 'string' && ID.test(id)) : null
  } catch {
    return null
  }
}

export const createSavedClipsStore = (file: DocStore) => ({
  /** Les identifiants sauvegardés (vide si le fichier manque ou est illisible : l'affichage n'en dépend pas pour effacer). */
  ids: (): Set<string> => new Set(readIds(file) ?? []),
  /** Sauvegarde ou libère un clip. Écrit dans un fichier temporaire puis le renomme ; refuse d'écraser un fichier illisible. */
  set: (id: string, saved: boolean): void => {
    if (!ID.test(id)) throw new Error('identifiant de clip invalide')
    const current = readIds(file)
    if (current === null) throw new Error('liste des clips sauvegardés illisible : non modifiée')
    const next = new Set(current)
    if (saved) next.add(id)
    else next.delete(id)
    file.write(JSON.stringify({ ids: [...next] }, null, 2))
  },
})

export type SavedClipsStore = ReturnType<typeof createSavedClipsStore>
