import { useEffect, useState } from 'react'
import { ClipPlayer as ClipPlayerUI } from '@house/ui'
import { fetchClip } from '@/lib/api'
import type { ClipPlayerProps } from './types'

const noop = () => undefined

// Le clip passe par l'API avec la clé : une balise <video src> ne peut pas envoyer l'en-tête,
// on télécharge donc le fichier puis on le donne au lecteur. L'adresse locale est libérée au démontage.
const ClipPlayer = ({ apiKey, path, onClose, onReady = noop, onTime = noop, onDuration = noop, startAt = 0, restart = 0 }: ClipPlayerProps) => {
  const [src, setSrc] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let url = ''
    let cancelled = false
    fetchClip(apiKey, path)
      .then((blob) => {
        if (cancelled) return
        url = URL.createObjectURL(blob)
        setSrc(url)
        onReady()
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : String(reason))
      })
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
    // onReady ne sert qu'à signaler la fin du téléchargement : le relancer ne doit pas retélécharger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey, path])

  return <ClipPlayerUI src={src} error={error} startAt={startAt} restart={restart} onClose={onClose} onTime={onTime} onDuration={onDuration} />
}

export default ClipPlayer
