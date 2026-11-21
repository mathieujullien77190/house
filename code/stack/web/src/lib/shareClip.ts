/** Ce qui est arrivé : le menu de partage du système, un téléchargement (pas de partage de fichier sur cet appareil), rien (annulé), ou le fichier prêt (le navigateur veut un nouveau toucher). */
export type ShareOutcome = 'shared' | 'downloaded' | 'cancelled' | 'ready'

/** Télécharge la vidéo d'un clip (le cookie de session suffit). Lève une erreur si elle ne se charge pas. */
export const loadClip = async (path: string, name: string): Promise<File> => {
  const res = await fetch(path)
  if (!res.ok) throw new Error(`${path} : HTTP ${res.status}`)
  return new File([await res.blob()], `${name}.mp4`, { type: 'video/mp4' })
}

/**
 * Ouvre le menu de partage du système avec le fichier (WhatsApp, Messages, Mail… : sur téléphone). Là où le navigateur ne partage pas
 * de fichier (la plupart des ordinateurs), le clip est téléchargé. Le navigateur n'accepte le menu que peu de temps après un toucher :
 * si le téléchargement a pris trop longtemps (`NotAllowedError`), on rend « ready » et le prochain toucher partage le fichier déjà chargé.
 */
export const shareFile = async (file: File, title: string): Promise<ShareOutcome> => {
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title })
      return 'shared'
    } catch (error) {
      // Le menu fermé sans choisir n'est pas une erreur.
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled'
      if (error instanceof DOMException && error.name === 'NotAllowedError') return 'ready'
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

/** Partage un clip : télécharge la vidéo, puis la partage (voir `shareFile`). */
export const shareClip = async (path: string, name: string, title: string): Promise<ShareOutcome> => shareFile(await loadClip(path, name), title)
