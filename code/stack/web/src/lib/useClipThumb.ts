import { useEffect, useState } from 'react'

/** La vignette d'un clip : sa première image (une adresse `data:`), et sa durée réelle en secondes. `null` tant que ce n'est pas lu. */
export interface ClipThumb {
  image: string | null
  seconds: number | null
}

const EMPTY: ClipThumb = { image: null, seconds: null }
/** Les vignettes déjà faites, par adresse de clip : revenir sur la liste ne recharge rien. */
const cache = new Map<string, ClipThumb>()
/** Deux vidéos au plus à la fois : le navigateur n'a que six connexions vers l'API, et chaque direct en garde une. */
const MAX_LOADING = 2
/** Au-delà, la vidéo est lâchée sans image (un téléphone qui ne charge rien sans lecture, par exemple). */
const TIMEOUT_MS = 15000
const THUMB_WIDTH = 480

let loading = 0
const waiting: (() => void)[] = []

const take = (start: () => void): void => {
  if (loading < MAX_LOADING) {
    loading += 1
    start()
  } else waiting.push(start)
}

const done = (): void => {
  const next = waiting.shift()
  if (next) next()
  else loading -= 1
}

/** La première image de la vidéo, réduite et en JPEG. `null` si le navigateur ne peut pas la dessiner. */
const capture = (video: HTMLVideoElement): string | null => {
  if (!video.videoWidth) return null
  const canvas = document.createElement('canvas')
  canvas.width = Math.min(video.videoWidth, THUMB_WIDTH)
  canvas.height = Math.round((video.videoHeight / video.videoWidth) * canvas.width)
  const context = canvas.getContext('2d')
  if (!context) return null
  context.drawImage(video, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.75)
}

/**
 * La vignette et la durée d'un clip, sans garder de vidéo dans la page : la vidéo est chargée à part, sa première image est copiée
 * dans une image fixe, puis elle est lâchée (sa connexion vers l'API est rendue). Les clips sont lus deux par deux.
 */
export const useClipThumb = (path: string | null): ClipThumb => {
  const [state, setState] = useState<{ path: string; thumb: ClipThumb } | null>(null)
  useEffect(() => {
    if (!path || cache.has(path)) return
    let cancelled = false
    let stop: (() => void) | null = null
    take(() => {
      if (cancelled) {
        done()
        return
      }
      const video = document.createElement('video')
      video.preload = 'auto'
      video.muted = true
      video.playsInline = true
      let seconds: number | null = null
      let ended = false
      const end = (image: string | null) => {
        if (ended) return
        ended = true
        clearTimeout(timer)
        video.onloadedmetadata = null
        video.onloadeddata = null
        video.onerror = null
        video.removeAttribute('src')
        video.load()
        done()
        if (cancelled) return
        const thumb = { image, seconds }
        if (image) cache.set(path, thumb)
        setState({ path, thumb })
      }
      const timer = setTimeout(() => end(null), TIMEOUT_MS)
      stop = () => end(null)
      video.onloadedmetadata = () => {
        if (Number.isFinite(video.duration)) seconds = video.duration
      }
      video.onloadeddata = () => end(capture(video))
      video.onerror = () => end(null)
      video.src = path
    })
    return () => {
      cancelled = true
      stop?.()
    }
  }, [path])
  if (!path) return EMPTY
  return cache.get(path) ?? (state?.path === path ? state.thumb : EMPTY)
}
