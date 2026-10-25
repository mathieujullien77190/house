import ClipPlayer from '@/components/ClipPlayer'
import SnapshotImage from '@/components/SnapshotImage'
import Timeline from '@/components/Timeline'
import {
  CAPTION_CLASS,
  FIGURE_CLASS,
  IMAGE_ALT,
  IMAGE_CLASS,
  LAST_CLASS,
  NAME_CLASS,
  NO_CLIP_CLASS,
  NO_CLIP_TEXT,
  NO_IMAGE_TEXT,
  SECTION_CLASS,
  WARNING_CLASS,
} from './constants'
import type { CameraCardUIProps } from './types'

const CameraCardUI = ({
  apiKey,
  name,
  imageSrc,
  cursor,
  selected,
  caption,
  lastEventText,
  events,
  playhead,
  clipStart,
  onCursor,
  onEvent,
  onClipTime,
  onClipDuration,
  onBack,
  onImageError,
}: CameraCardUIProps) => {
  return (
    <section className={SECTION_CLASS}>
      <h2 className={NAME_CLASS}>{name}</h2>
      <figure className={FIGURE_CLASS}>
        <figcaption className={CAPTION_CLASS}>{caption}</figcaption>
        {selected ? (
          selected.clip ? (
            <ClipPlayer apiKey={apiKey} path={selected.clip} startAt={clipStart} onClose={onBack} onTime={onClipTime} onDuration={onClipDuration} />
          ) : (
            <div className={NO_CLIP_CLASS}>{NO_CLIP_TEXT}</div>
          )
        ) : cursor !== null ? (
          <SnapshotImage apiKey={apiKey} camera={name} at={cursor} />
        ) : imageSrc ? (
          <img className={IMAGE_CLASS} src={imageSrc} alt={IMAGE_ALT} onError={onImageError} />
        ) : (
          <p className={WARNING_CLASS}>{NO_IMAGE_TEXT}</p>
        )}
      </figure>
      <p className={LAST_CLASS}>{lastEventText}</p>
      <Timeline apiKey={apiKey} camera={name} events={events} onCursor={onCursor} onEvent={onEvent} playhead={playhead} />
    </section>
  )
}

export default CameraCardUI
