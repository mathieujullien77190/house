// L'interrupteur de la page invité (guest/) : un fichier JSON `{"enabled": bool}` que House Sync écrit (bouton « En ligne / Coupée » de ses réglages) et que la
// page invité relit en lecture seule : House Sync n'a donc jamais besoin du socket Docker. Coupée, la page invité ferme son port.
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

/** La page invité est-elle en ligne ? Sans fichier, oui ; un fichier qu'on ne sait pas lire la compte pour coupée (c'est ce que fait la page invité). */
export const readGuestEnabled = async (file: string): Promise<boolean> => {
  let text: string
  try {
    text = await readFile(file, 'utf8')
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'ENOENT'
  }
  try {
    return (JSON.parse(text) as { enabled?: unknown }).enabled === true
  } catch {
    return false
  }
}

/** Écrit l'état (fichier temporaire puis renommage : la page invité ne lit jamais un fichier à moitié écrit). */
export const writeGuestEnabled = async (file: string, enabled: boolean): Promise<void> => {
  await mkdir(dirname(file), { recursive: true })
  const partial = `${file}.tmp`
  await writeFile(partial, JSON.stringify({ enabled }))
  await rename(partial, file)
}
