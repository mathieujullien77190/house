import { useState } from 'react'
import { ClipPlayer as ClipPlayerUI } from '@house/ui'
import { FAILURE_TEXT } from './constants'
import type { ClipPlayerProps } from './types'

const noop = () => undefined

// Le clip se lit en continu depuis l'API : la balise <video src> envoie le cookie de session tout seule (plus besoin
// de télécharger les dizaines de Mo avant de voir quoi que ce soit) et l'API répond aux demandes de morceaux (Range),
// donc on peut aller n'importe où dans la vidéo. Si le téléphone ne sait pas la décoder (H.265, 4K), un message le dit.
const ClipPlayer = ({ path, onClose, onReady = noop, onFailure = noop, onTime = noop, onDuration = noop, startAt = 0, restart = 0 }: ClipPlayerProps) => {
  const [error, setError] = useState('')
  return (
    <ClipPlayerUI
      src={path}
      error={error}
      startAt={startAt}
      restart={restart}
      onClose={onClose}
      onReady={onReady}
      onFailure={(code) => {
        setError(FAILURE_TEXT[code] ?? FAILURE_TEXT[0])
        onFailure()
      }}
      onTime={onTime}
      onDuration={onDuration}
    />
  )
}

export default ClipPlayer
