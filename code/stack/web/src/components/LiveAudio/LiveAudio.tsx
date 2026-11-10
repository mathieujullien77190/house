import { useCallback, useEffect, useRef, useState } from 'react'
import { FiVolume2, FiVolumeX } from 'react-icons/fi'
import { audioSrc } from '@/lib/live'
import { BORDER_FAILED_CLASS, BORDER_IDLE_CLASS, BORDER_ON_CLASS, BUTTON_CLASS, FAILED_TEXT, GAIN, LABEL_OFF, LABEL_ON } from './constants'
import type { LiveAudioProps } from './types'

/** Ce qui tourne tant que le son est ouvert : le lecteur et le circuit d'amplification (s'il a pu être créé). */
interface Session {
  player: HTMLAudioElement
  context: AudioContext | null
}

/**
 * Le son du direct d'une caméra, **seulement sur demande** : une petite icône posée sur la vidéo (en bas à droite). Un clic ouvre le flux audio (House API le relaie depuis go2rtc,
 * la piste audio du flux léger), un second le coupe. Tant qu'on n'a pas cliqué, rien n'est demandé. Le micro des Reolink est très faible : le son passe par un gain (`GAIN`) et un
 * limiteur (Web Audio). **Tout est lancé dans le clic même** : hors d'un geste de l'utilisateur, un navigateur laisse le circuit audio en pause et le son reste muet sans erreur
 * (on le relance aussi quand la lecture démarre). Si Web Audio n'est pas disponible, le son est joué tel quel. Quitter la caméra ou en changer coupe le son. Si le flux ne démarre
 * pas, le cadre devient rouge (l'info-bulle dit pourquoi).
 */
const LiveAudio = ({ camera }: LiveAudioProps) => {
  const [on, setOn] = useState(false)
  const [failed, setFailed] = useState(false)
  const session = useRef<Session | null>(null)

  const end = useCallback(() => {
    const current = session.current
    if (!current) return
    session.current = null
    current.player.pause()
    // Le flux est libéré : sans cela, le navigateur garde la connexion ouverte vers House API.
    current.player.removeAttribute('src')
    current.player.load()
    void current.context?.close()
  }, [])

  // Quitter la caméra, ou en changer, coupe le son.
  useEffect(
    () => () => {
      end()
      setOn(false)
    },
    [camera, end],
  )

  const start = () => {
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
      setOn(false)
    }
    player.addEventListener('error', stop)
    // Au démarrage de la lecture, le circuit est relancé s'il était resté en pause.
    player.addEventListener('playing', () => void context?.resume())
    session.current = { player, context }
    player.play().catch(stop)
    setOn(true)
  }

  const toggle = () => {
    setFailed(false)
    if (session.current) {
      end()
      setOn(false)
    } else start()
  }

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
