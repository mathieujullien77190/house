import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { FiVolume2, FiVolumeX } from 'react-icons/fi'
import { audioSrc } from '@/lib/live'
import { BORDER_FAILED_CLASS, BORDER_IDLE_CLASS, BORDER_ON_CLASS, BUTTON_CLASS, FAILED_TEXT, GAIN, LABEL_OFF, LABEL_ON } from './constants'
import { claim, endLive, playingCamera, release, setLive, subscribe } from './session'
import type { LiveAudioProps } from './types'

/**
 * Le son du direct d'une caméra, **seulement sur demande** : une petite icône posée sur la vidéo (en bas à droite). Un clic ouvre le flux audio (House API le relaie depuis go2rtc,
 * la piste audio du flux léger), un second le coupe. Tant qu'on n'a pas cliqué, rien n'est demandé. Le micro des Reolink est très faible : le son passe par un gain (`GAIN`) et un
 * limiteur (Web Audio). **Tout est lancé dans le clic même** : hors d'un geste de l'utilisateur, un navigateur laisse le circuit audio en pause et le son reste muet sans erreur
 * (on le relance aussi quand la lecture démarre). Si Web Audio n'est pas disponible, le son est joué tel quel. Quitter la caméra ou en changer coupe le son. Si le flux ne démarre
 * pas, le cadre devient rouge (l'info-bulle dit pourquoi).
 */
const LiveAudio = ({ camera, initialOn = false, onChange }: LiveAudioProps) => {
  // Le son joue-t-il pour cette caméra ? Lu dans l'état tenu hors du composant : un bouton remplacé (vue en grand) retrouve le même son.
  const on = useSyncExternalStore(subscribe, () => playingCamera() === camera)
  const [failed, setFailed] = useState(false)

  const end = endLive

  // Quitter la caméra, ou en changer, coupe le son ; si un autre bouton le reprend aussitôt (vue en grand), il continue : le son est tenu hors du composant (`live`).
  useEffect(() => {
    claim(camera)
    return release
  }, [camera])

  const start = (remembered = false) => {
    const player = new Audio(audioSrc(camera))
    let context: AudioContext | null = null
    try {
      context = new AudioContext()
      void context.resume()
      const gain = context.createGain()
      gain.gain.value = GAIN
      // Le limiteur évite qu'un bruit fort, une fois amplifié, sature les enceintes.
      const limiter = context.createDynamicsCompressor()
      context.createMediaElementSource(player).connect(gain).connect(limiter).connect(context.destination)
    } catch {
      context = null
    }
    const stop = () => {
      end()
      setFailed(true)
      onChange?.(false)
    }
    player.addEventListener('error', stop)
    // Au démarrage de la lecture, le circuit est relancé s'il était resté en pause.
    player.addEventListener('playing', () => void context?.resume())
    setLive(camera, { player, context })
    player.play().catch(stop)
    // Ouvert de nouveau en arrivant sur la caméra (il l'était sur l'autre) : l'utilisateur n'a rien changé, il n'y a rien à retenir de nouveau.
    if (!remembered) onChange?.(true)
  }

  const toggle = () => {
    setFailed(false)
    if (playingCamera() !== null) {
      end()
      onChange?.(false)
    } else start()
  }

  // Le son était ouvert sur la caméra d'où l'on vient : il l'est ici dès l'arrivée (le clic sur son repère est le geste qui autorise la lecture).
  const resumed = useRef(false)
  useEffect(() => {
    // Un son déjà ouvert pour cette caméra (repris par l'effet ci-dessus quand le bouton a changé d'endroit) : rien à relancer.
    if (!initialOn || resumed.current || playingCamera() !== null) return
    resumed.current = true
    start(true)
    // Une seule fois, à l'arrivée.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const label = failed ? FAILED_TEXT : on ? LABEL_ON : LABEL_OFF
  return (
    <button
      type="button"
      className={`${BUTTON_CLASS} ${failed ? BORDER_FAILED_CLASS : on ? BORDER_ON_CLASS : BORDER_IDLE_CLASS}`}
      aria-label={label}
      aria-pressed={on}
      title={label}
      onClick={toggle}
    >
      {on ? <FiVolume2 aria-hidden="true" /> : <FiVolumeX aria-hidden="true" />}
    </button>
  )
}

export default LiveAudio
