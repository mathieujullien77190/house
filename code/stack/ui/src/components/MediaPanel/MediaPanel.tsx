import { useRef, useState } from 'react'
import Button from '../Button'
import {
  BAR_CLASS,
  CLOSE_LABEL,
  HEAD_CLASS,
  IMAGE_ALT,
  MEDIA_CLASS,
  PANEL_CLASS,
  PAUSE_ICON,
  PAUSE_LABEL,
  PLAY_BUTTON_CLASS,
  PLAY_ICON,
  PLAY_LABEL,
  ROTATED_FRAME_CLASS,
  ROTATED_MEDIA_CLASS,
  SEEK_CLASS,
  SEEK_LABEL,
  TITLE_CLASS,
} from './constants'
import type { MediaPanelProps } from './types'

/** Un clip ou une image dans un panneau collant : la vidéo démarre à l'ouverture, Fermer retire le panneau. Une vidéo tournée n'a pas les commandes natives (elles tourneraient avec elle) : les siennes sont droites, sous le cadre. */
const MediaPanel = ({ kind, title, src, rotated = false, onClose }: MediaPanelProps) => {
  const video = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(true)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const ownControls = rotated && kind === 'video'
  const mediaClass = rotated ? ROTATED_MEDIA_CLASS : MEDIA_CLASS
  const toggle = () => {
    const element = video.current!
    if (element.paused) element.play().catch(() => undefined)
    else element.pause()
  }
  const media =
    kind === 'video' ? (
      <video
        ref={video}
        className={mediaClass}
        src={src}
        controls={!ownControls}
        autoPlay
        muted
        playsInline
        onClick={ownControls ? toggle : undefined}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)}
        onDurationChange={(event) => setDuration(event.currentTarget.duration)}
      />
    ) : (
      <img className={mediaClass} src={src} alt={IMAGE_ALT} />
    )
  return (
    <aside className={PANEL_CLASS}>
      <div className={HEAD_CLASS}>
        <span className={TITLE_CLASS}>{title}</span>
        <Button onClick={onClose}>{CLOSE_LABEL}</Button>
      </div>
      {rotated ? <div className={ROTATED_FRAME_CLASS}>{media}</div> : media}
      {ownControls ? (
        <div className={BAR_CLASS}>
          <button type="button" className={PLAY_BUTTON_CLASS} aria-label={playing ? PAUSE_LABEL : PLAY_LABEL} title={playing ? PAUSE_LABEL : PLAY_LABEL} onClick={toggle}>
            {playing ? PAUSE_ICON : PLAY_ICON}
          </button>
          <input
            type="range"
            className={SEEK_CLASS}
            aria-label={SEEK_LABEL}
            min={0}
            max={Number.isFinite(duration) ? duration : 0}
            step={0.1}
            value={Math.min(time, Number.isFinite(duration) ? duration : 0)}
            onChange={(event) => {
              video.current!.currentTime = Number(event.currentTarget.value)
            }}
          />
        </div>
      ) : null}
    </aside>
  )
}

export default MediaPanel
