import { useEffect, useState } from 'react'
import { fetchSnapshot } from '@/lib/api'
import SnapshotImageUI from './UI'
import { LOADING_TEXT, MISSING_TEXT } from './constants'
import type { SnapshotImageProps } from './types'

/** Ce qu'on a obtenu pour un instant : l'adresse locale de l'image, ou rien s'il n'y en a pas. */
interface Loaded {
  at: number
  src: string
}

/** L'image gardée par House Sync la plus proche d'un instant, téléchargée via l'API avec la clé. */
const SnapshotImage = ({ apiKey, camera, at }: SnapshotImageProps) => {
  const [loaded, setLoaded] = useState<Loaded | null>(null)

  useEffect(() => {
    let url = ''
    let cancelled = false
    fetchSnapshot(apiKey, camera, at)
      .then((blob) => {
        if (cancelled) return
        url = URL.createObjectURL(blob)
        setLoaded({ at, src: url })
      })
      .catch(() => {
        if (!cancelled) setLoaded({ at, src: '' })
      })
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [apiKey, camera, at])

  // Tant que le résultat ne concerne pas l'instant demandé, on charge.
  const current = loaded?.at === at ? loaded : null
  return <SnapshotImageUI src={current?.src ?? ''} message={current ? MISSING_TEXT : LOADING_TEXT} />
}

export default SnapshotImage
