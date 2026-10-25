import { useEffect, useRef } from 'react'
import Button from '../Button'
import { BOX_CLASS, CLOSE_CLASS, CLOSE_LABEL, ERROR_CLASS, LOADING_TEXT, PLAYER_CLASS, VIDEO_CLASS } from './constants'
import type { ClipPlayerProps } from './types'

/** Le lecteur d'un clip : démarre à `startAt`, remonte sa durée et sa position. Le téléchargement est au parent. */
const ClipPlayer = ({ src, error, startAt, onClose, onTime, onDuration }: ClipPlayerProps) => {
  const video = useRef<HTMLVideoElement>(null)

  // À chaque nouvelle position demandée, la lecture saute là, une fois la vidéo prête.
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
  }, [src, startAt])

  useEffect(() => {
    const element = video.current
    if (!element || !src) return
    const report = () => onDuration(element.duration)
    if (element.readyState >= 1) report()
    else element.addEventListener('loadedmetadata', report, { once: true })
    return () => element.removeEventListener('loadedmetadata', report)
  }, [src, onDuration])

  return (
    <div className={PLAYER_CLASS}>
      {error ? (
        <p className={ERROR_CLASS}>{error}</p>
      ) : src ? (
        <video ref={video} className={VIDEO_CLASS} src={src} controls onTimeUpdate={(event) => onTime(event.currentTarget.currentTime)} />
      ) : (
        <div className={BOX_CLASS}>{LOADING_TEXT}</div>
      )}
      {error ? (
        <Button className={CLOSE_CLASS} onClick={onClose}>
          {CLOSE_LABEL}
        </Button>
      ) : null}
    </div>
  )
}

export default ClipPlayer
