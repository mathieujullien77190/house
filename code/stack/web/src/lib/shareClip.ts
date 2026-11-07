/** Ce qui est arrivé : le menu de partage du système, un téléchargement (pas de partage de fichier sur cet appareil), ou rien (annulé). */
export type ShareOutcome = 'shared' | 'downloaded' | 'cancelled'

/**
 * Partage un clip : télécharge la vidéo (le cookie de session suffit), puis ouvre le menu de partage du système avec le fichier
 * (WhatsApp, Messages, Mail… : sur téléphone). Là où le navigateur ne partage pas de fichier (la plupart des ordinateurs),
 * le clip est téléchargé. Lève une erreur si la vidéo ne se charge pas.
 */
export const shareClip = async (path: string, name: string, title: string): Promise<ShareOutcome> => {
  const res = await fetch(path)
  if (!res.ok) throw new Error(`${path} : HTTP ${res.status}`)
  const file = new File([await res.blob()], `${name}.mp4`, { type: 'video/mp4' })
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title })
      return 'shared'
    } catch (error) {
      // Le menu fermé sans choisir n'est pas une erreur.
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled'
      throw error
    }
  }
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = file.name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return 'downloaded'
}
