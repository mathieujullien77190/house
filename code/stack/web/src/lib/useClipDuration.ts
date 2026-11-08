import { useEffect, useState } from 'react'
import { rememberClipDuration } from './clipDurations'

/**
 * La durée réelle d'un clip, lue dans les métadonnées de sa vidéo (l'API ne la donne pas : le clip déborde de l'événement, marges et
 * segments). `null` sans clip ou tant qu'elle n'est pas lue. Seules les métadonnées sont demandées (`preload="metadata"`).
 */
export const useClipDuration = (id: string | null, path: string | null): number | null => {
  const [state, setState] = useState<{ path: string; seconds: number } | null>(null)
  useEffect(() => {
    if (!path) return
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      if (!Number.isFinite(video.duration)) return
      if (id) rememberClipDuration(id, video.duration)
      setState({ path, seconds: video.duration })
    }
    video.src = path
    return () => {
      video.onloadedmetadata = null
      video.removeAttribute('src')
      video.load()
    }
  }, [id, path])
  return path && state?.path === path ? state.seconds : null
}
