// La liste des clips sauvegardés, écrite par House API (document `saved-clips` de la table `house_state`).
import type { DatabaseSync } from 'node:sqlite'
import { readState } from './houseState.ts'

/**
 * Les identifiants des clips à ne jamais effacer. null quand on ne peut pas en être sûr (base illisible, document abîmé) :
 * l'appelant n'efface alors rien. Un document absent veut dire « aucun clip sauvegardé ».
 */
export const readSavedIds = (db: DatabaseSync): Set<string> | null => {
  let text: string | null
  try {
    text = readState(db, 'saved-clips')
  } catch {
    return null
  }
  if (text === null) return new Set()
  try {
    const parsed = JSON.parse(text) as { ids?: unknown }
    return Array.isArray(parsed.ids) ? new Set(parsed.ids.filter((id): id is string => typeof id === 'string')) : null
  } catch {
    return null
  }
}
