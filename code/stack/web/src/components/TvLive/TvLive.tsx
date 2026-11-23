import { useEffect } from 'react'
import { liveSrc } from '@/lib/live'
import TvLiveUI from './UI'
import type { TvLiveProps } from './types'

type BackWindow = Window & { houseTvBack?: () => boolean }

/**
 * Sur la télé : le direct d'une caméra en grand (4K, comme la vue en grand de la WebApp), rien d'autre. Retour (la télécommande) ou Échap ferme.
 * Pendant ce temps la navigation de la carte est suspendue (`data-tv-overlay` sur la page) et Retour est pris ici (`houseTvBack`).
 */
const TvLive = ({ camera, onClose }: TvLiveProps) => {
  useEffect(() => {
    const target = window as BackWindow
    const previous = target.houseTvBack
    document.body.dataset.tvOverlay = '1'
    target.houseTvBack = () => {
      onClose()
      return true
    }
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Backspace') {
        event.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', keydown, true)
    return () => {
      window.removeEventListener('keydown', keydown, true)
      delete document.body.dataset.tvOverlay
      target.houseTvBack = previous
    }
  }, [onClose])
  return <TvLiveUI src={liveSrc(camera.name, true)} turned={camera.orientation === 'portrait'} name={camera.name} />
}

export default TvLive
