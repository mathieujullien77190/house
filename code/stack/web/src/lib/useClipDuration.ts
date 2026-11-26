import { useEffect, useState } from 'react'
import { clipDurationOf, rememberClipDuration } from './clipDurations'

/** Lâche la vidéo : sans cela, le navigateur garde sa connexion ouverte vers l'API (il n'en a que six, et chaque direct en prend une). */
const release = (video: HTMLVideoElement): void => {
  video.onloadedmetadata = null
  video.removeAttribute('src')
  video.load()
}

/**
 * La durée réelle d'un clip, lue dans les métadonnées de sa vidéo (l'API ne la donne pas : le clip déborde de l'événement, marges et
 * segments). `null` sans clip ou tant qu'elle n'est pas lue. Seules les métadonnées sont demandées (`preload="metadata"`), la vidéo est
 * lâchée dès qu'elles sont lues, et une durée déjà connue n'est pas redemandée.
 */
export const useClipDuration = (id: string | null, path: string | null): number | null => {
  const [state, setState] = useState<{ path: string; seconds: number } | null>(null)
  const known = id ? clipDurationOf(id) : null
  useEffect(() => {
    if (!path || known !== null) return
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      const seconds = video.duration
      release(video)
      if (!Number.isFinite(seconds)) return
      if (id) rememberClipDuration(id, seconds)
      setState({ path, seconds })
    }
    video.src = path
    return () => release(video)
  }, [id, path, known])
  if (!path) return null
  return known ?? (state?.path === path ? state.seconds : null)
}
