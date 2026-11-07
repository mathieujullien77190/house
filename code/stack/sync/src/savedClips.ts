// La liste des clips sauvegardés, écrite par House API (fichier JSON dans data/house, monté en lecture seule).
import { readFile, stat } from 'node:fs/promises'
import { dirname } from 'node:path'

/**
 * Les identifiants des clips à ne jamais effacer. null quand on ne peut pas en être sûr (dossier non monté, fichier abîmé) :
 * l'appelant n'efface alors rien. Un fichier absent dans un dossier qui existe veut dire « aucun clip sauvegardé ».
 */
export const readSavedIds = async (file: string): Promise<Set<string> | null> => {
  const folder = await stat(dirname(file)).then((info) => info.isDirectory(), () => false)
  if (!folder) return null
  let text: string
  try {
    text = await readFile(file, 'utf8')
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'ENOENT' ? new Set() : null
  }
  try {
    const parsed = JSON.parse(text) as { ids?: unknown }
    return Array.isArray(parsed.ids) ? new Set(parsed.ids.filter((id): id is string => typeof id === 'string')) : null
  } catch {
    return null
  }
}
