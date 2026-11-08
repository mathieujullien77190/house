import { useEffect, useState } from 'react'
import { SnapshotImage as SnapshotImageUI } from '@house/ui'
import { fetchSnapshot } from '@/lib/api'
import { ID_PREFIX, LOADING_TEXT, MISSING_TEXT } from './constants'
import type { SnapshotImageProps } from './types'

/** Ce qu'on a obtenu pour un instant : l'adresse locale de l'image, ou rien s'il n'y en a pas. */
interface Loaded {
  at: number
  src: string
  /** L'identifiant de l'image : l'instant exact où House Sync l'a gardée. */
  id: number | null
}

/** L'image gardée par House Sync la plus proche d'un instant, téléchargée via l'API avec la clé. */
const SnapshotImage = ({ apiKey, camera, at, upright }: SnapshotImageProps) => {
  const [loaded, setLoaded] = useState<Loaded | null>(null)

  useEffect(() => {
    let url = ''
    let cancelled = false
    fetchSnapshot(apiKey, camera, at)
      .then(({ blob, takenAt }) => {
        if (cancelled) return
        url = URL.createObjectURL(blob)
        setLoaded({ at, src: url, id: takenAt })
      })
      .catch(() => {
        if (!cancelled) setLoaded({ at, src: '', id: null })
      })
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [apiKey, camera, at])

  // Tant que le résultat ne concerne pas l'instant demandé, on charge.
  const current = loaded?.at === at ? loaded : null
  return (
    <SnapshotImageUI
      src={current?.src ?? ''}
      label={current?.src && current.id !== null ? `${ID_PREFIX}${current.id}` : undefined}
      message={current ? MISSING_TEXT : LOADING_TEXT}
      upright={upright}
    />
  )
}

export default SnapshotImage
