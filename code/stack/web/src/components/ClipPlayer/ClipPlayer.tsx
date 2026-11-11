import { useEffect, useState } from 'react'
import { ClipPlayer as ClipPlayerUI } from '@house/ui'
import MotionShape, { shapesAt } from '@/components/MotionShape'
import { fetchClipShapes, type ClipShapes } from '@/lib/api'
import { FAILURE_TEXT } from './constants'
import type { ClipPlayerProps } from './types'

const noop = () => undefined

// Le clip se lit en continu depuis l'API : la balise <video src> envoie le cookie de session tout seule (plus besoin
// de télécharger les dizaines de Mo avant de voir quoi que ce soit) et l'API répond aux demandes de morceaux (Range),
// donc on peut aller n'importe où dans la vidéo. Si le téléphone ne sait pas la décoder (H.265, 4K), un message le dit.
const ClipPlayer = ({
  path,
  audioSrc,
  shapesSrc,
  apiKey = '',
  onClose,
  onReady = noop,
  onFailure = noop,
  onTime = noop,
  onDuration = noop,
  startAt = 0,
  restart = 0,
  controlsHost,
  barInset,
}: ClipPlayerProps) => {
  const [error, setError] = useState('')
  // Les contours du mouvement, chargés avec le clip (un clip sans contours : rien) et dessinés selon la position de lecture.
  const [shapes, setShapes] = useState<ClipShapes | null>(null)
  const [time, setTime] = useState(0)
  useEffect(() => {
    if (!shapesSrc) return
    let cancelled = false
    fetchClipShapes(apiKey, shapesSrc).then(
      (loaded) => !cancelled && setShapes(loaded),
      () => undefined,
    )
    return () => {
      cancelled = true
    }
  }, [apiKey, shapesSrc])
  return (
    <ClipPlayerUI
      src={path}
      audioSrc={audioSrc}
      error={error}
      startAt={startAt}
      restart={restart}
      controlsHost={controlsHost}
      barInset={barInset}
      overlay={<MotionShape shapes={shapesAt(shapesSrc ? shapes : null, time)} />}
      onClose={onClose}
      onReady={onReady}
      onFailure={(code) => {
        setError(FAILURE_TEXT[code] ?? FAILURE_TEXT[0])
        onFailure()
      }}
      onTime={(seconds) => {
        setTime(seconds)
        onTime(seconds)
      }}
      onDuration={onDuration}
    />
  )
}

export default ClipPlayer
