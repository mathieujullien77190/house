import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Button from '../Button'
import {
  BAR_OVERLAY_CLASS,
  BOX_CLASS,
  CLOSE_CLASS,
  CLOSE_LABEL,
  CONTROLS_CLASS,
  DRIFT_SECONDS,
  ERROR_CLASS,
  LOADING_TEXT,
  PAUSE_ICON,
  PAUSE_LABEL,
  PLAY_ICON,
  PLAY_LABEL,
  PLAYER_CLASS,
  VIDEO_BOX_CLASS,
  SEEK_CLASS,
  SEEK_LABEL,
  SOUND_CLASS,
  SOUND_LABEL,
  TIME_CLASS,
  VIDEO_CLASS,
} from './constants'
import { formatClock } from './helpers'
import type { ClipPlayerProps } from './types'

/** Le lecteur d'un clip : démarre à `startAt`, remonte sa durée et sa position, et joue le son du clip (un fichier à part) avec la vidéo. Le téléchargement est au parent. */
const ClipPlayer = ({
  src,
  audioSrc,
  error,
  startAt,
  restart = 0,
  onClose,
  onReady,
  onFailure,
  onTime,
  onDuration,
  controlsHost = null,
}: ClipPlayerProps) => {
  const video = useRef<HTMLVideoElement>(null)
  const audio = useRef<HTMLAudioElement>(null)
  // Le navigateur a refusé de lancer le son tout seul (téléphone) : un bouton le lance d'un toucher.
  const [soundBlocked, setSoundBlocked] = useState(false)
  // Pour les commandes maison : la vidéo joue-t-elle, où en est-elle, combien dure-t-elle.
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)

  // À chaque nouvelle position demandée (ou nouveau clic : restart change), la lecture saute là, une fois la vidéo prête.
  useEffect(() => {
    const element = video.current
    if (!element || !src) return
    const seek = () => {
      element.currentTime = startAt
      element.play().catch(() => undefined)
    }
    if (element.readyState >= 1) seek()
    else element.addEventListener('loadedmetadata', seek, { once: true })
    return () => element.removeEventListener('loadedmetadata', seek)
  }, [src, startAt, restart])

  useEffect(() => {
    const element = video.current
    if (!element || !src) return
    const report = () => onDuration(element.duration)
    if (element.readyState >= 1) report()
    else element.addEventListener('loadedmetadata', report, { once: true })
    return () => element.removeEventListener('loadedmetadata', report)
  }, [src, onDuration])

  // Le son est un fichier à part : il suit la vidéo (lecture, pause, déplacement, vitesse). Un écart de moins de DRIFT_SECONDS n'est pas corrigé :
  // un petit décalage entre l'image et le son n'a pas d'importance, et recaler sans cesse hacherait le son.
  useEffect(() => {
    const movie = video.current
    const sound = audio.current
    if (!movie || !sound || !audioSrc || !src) return
    const align = () => {
      if (Math.abs(sound.currentTime - movie.currentTime) > DRIFT_SECONDS) sound.currentTime = movie.currentTime
    }
    const play = () => {
      align()
      sound.playbackRate = movie.playbackRate
      sound.play().then(
        () => setSoundBlocked(false),
        () => setSoundBlocked(true),
      )
    }
    const pause = () => sound.pause()
    const jump = () => {
      sound.currentTime = movie.currentTime
    }
    const rate = () => {
      sound.playbackRate = movie.playbackRate
    }
    movie.addEventListener('playing', play)
    movie.addEventListener('pause', pause)
    movie.addEventListener('waiting', pause)
    movie.addEventListener('ended', pause)
    movie.addEventListener('seeked', jump)
    movie.addEventListener('timeupdate', align)
    movie.addEventListener('ratechange', rate)
    if (!movie.paused && movie.readyState >= 3) play()
    return () => {
      movie.removeEventListener('playing', play)
      movie.removeEventListener('pause', pause)
      movie.removeEventListener('waiting', pause)
      movie.removeEventListener('ended', pause)
      movie.removeEventListener('seeked', jump)
      movie.removeEventListener('timeupdate', align)
      movie.removeEventListener('ratechange', rate)
      sound.pause()
    }
  }, [audioSrc, src])

  useEffect(() => {
    const element = video.current
    if (!element || !src) return
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onLength = () => setDuration(element.duration)
    element.addEventListener('play', onPlay)
    element.addEventListener('pause', onPause)
    element.addEventListener('ended', onPause)
    element.addEventListener('durationchange', onLength)
    setPlaying(!element.paused)
    onLength()
    return () => {
      element.removeEventListener('play', onPlay)
      element.removeEventListener('pause', onPause)
      element.removeEventListener('ended', onPause)
      element.removeEventListener('durationchange', onLength)
    }
  }, [src])

  const togglePlay = () => {
    const element = video.current
    if (!element) return
    if (element.paused) element.play().catch(() => undefined)
    else element.pause()
  }
  const seek = (seconds: number) => {
    const element = video.current
    if (!element) return
    element.currentTime = seconds
    setTime(seconds)
  }
  // Les commandes maison, posées dans l'élément donné par le parent (hors du lecteur, donc droites même si la vidéo est tournée).
  const bar =
    src && !error ? (
      <div className={CONTROLS_CLASS}>
        <Button aria-label={playing ? PAUSE_LABEL : PLAY_LABEL} title={playing ? PAUSE_LABEL : PLAY_LABEL} onClick={togglePlay}>
          {playing ? PAUSE_ICON : PLAY_ICON}
        </Button>
        <input
          type="range"
          className={SEEK_CLASS}
          aria-label={SEEK_LABEL}
          min={0}
          max={duration || 0}
          step={0.1}
          value={Math.min(time, duration || 0)}
          onChange={(event) => seek(Number(event.currentTarget.value))}
        />
        <span className={TIME_CLASS}>
          {formatClock(time)} / {formatClock(duration)}
        </span>
      </div>
    ) : null
  // Dans l'élément du parent s'il en donne un (une vidéo tournée : les commandes restent droites), sinon posées dans l'image, en bas.
  const controls = bar && controlsHost ? createPortal(bar, controlsHost) : bar ? <div className={BAR_OVERLAY_CLASS}>{bar}</div> : null

  const enableSound = () => {
    const sound = audio.current
    if (!sound) return
    sound.currentTime = video.current?.currentTime ?? 0
    sound.play().then(
      () => setSoundBlocked(false),
      () => undefined,
    )
  }

  return (
    <div className={PLAYER_CLASS}>
      <div className={VIDEO_BOX_CLASS}>
        {error ? (
          <p className={ERROR_CLASS}>{error}</p>
        ) : src ? (
          <video
            ref={video}
            className={VIDEO_CLASS}
            src={src}
            onClick={togglePlay}
            // Ni agrandir, ni télécharger, ni vitesse, ni diffusion, ni image dans l'image : les commandes ne gardent que lecture et barre de temps (voir VIDEO_CLASS).
            controlsList="nofullscreen nodownload noremoteplayback noplaybackrate"
            disablePictureInPicture
            // La vidéo n'a pas de son (il est dans un fichier à part, joué avec elle) : démarrer en sourdine est la seule façon que les téléphones acceptent de lancer la lecture tout seuls.
            muted
            playsInline
            preload="metadata"
            onLoadedData={onReady}
            onError={(event) => onFailure?.(event.currentTarget.error?.code ?? 0)}
            onTimeUpdate={(event) => {
              setTime(event.currentTarget.currentTime)
              onTime(event.currentTarget.currentTime)
            }}
          />
        ) : (
          <div className={BOX_CLASS}>{LOADING_TEXT}</div>
        )}
        {controls}
      </div>
      {audioSrc && src && !error ? <audio ref={audio} src={audioSrc} preload="auto" /> : null}
      {soundBlocked ? (
        <Button className={SOUND_CLASS} onClick={enableSound}>
          {SOUND_LABEL}
        </Button>
      ) : null}
      {error ? (
        <Button className={CLOSE_CLASS} onClick={onClose}>
          {CLOSE_LABEL}
        </Button>
      ) : null}
    </div>
  )
}

export default ClipPlayer
