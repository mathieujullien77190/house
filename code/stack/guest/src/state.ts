// L'interrupteur de la page invité : un petit fichier JSON (`{"enabled": false}`) que House Sync écrit (bouton « Coupée » de ses réglages) et que la page
// invité relit toutes les quelques secondes, en lecture seule. Coupée, elle ferme son port : plus rien n'y répond, d'où que l'on vienne.
import { readFile } from 'node:fs/promises'

export const STATE_POLL_MS = 2_000

/**
 * La page doit-elle être joignable ? Sans fichier configuré ou sans fichier du tout, oui (on l'a lancée exprès). Un fichier qui existe mais qu'on ne sait pas
 * lire (abîmé, droits) la coupe : dans le doute, elle reste fermée.
 */
export const readEnabled = async (file: string): Promise<boolean> => {
  if (!file) return true
  let text: string
  try {
    text = await readFile(file, 'utf8')
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'ENOENT'
  }
  try {
    const state = JSON.parse(text) as { enabled?: unknown }
    return state.enabled === true
  } catch {
    return false
  }
}
