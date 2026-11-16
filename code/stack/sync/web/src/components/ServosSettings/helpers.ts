import type { ServoCommand, ServoField, ServoPatch, ServoSettings } from './types'

/**
 * Ce qu'il faut envoyer pour le champ `key` (`url`, ou `<volet>.<ordre>.<champ>`) saisi en `text` ; null s'il n'y a rien à envoyer (texte vide ou pas un nombre, valeur inchangée).
 * Les bornes sont vérifiées par House Sync (400 : le champ revient à la valeur gardée).
 */
export const patchOf = (settings: ServoSettings, key: string, text: string): ServoPatch | null => {
  if (key === 'url') return text.trim() === settings.url ? null : { url: text.trim() }
  const [shutter, command, field] = key.split('.') as [string, ServoCommand, ServoField]
  if (text.trim() === '') return null
  const value = Number(text)
  if (!Number.isFinite(value) || value === settings.shutters[shutter][command][field]) return null
  return { shutters: { [shutter]: { [command]: { [field]: value } } } }
}
