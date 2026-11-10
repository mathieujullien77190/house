import ClipPlayer from '@/components/ClipPlayer'
import PortraitClip from '@/components/PortraitClip'
import { captionOf, playablePath } from '@/components/SavedClips/helpers'
import { CAPTION_CLASS, EMOJI_CLASS, NOTE_CLASS, OPEN_TITLE, TITLE_CLASS, UNAVAILABLE_TEXT, WRAP_CLASS } from './constants'
import type { ClipPreviewProps } from './types'

const noop = () => undefined

/**
 * L'aperçu d'un clip sur la carte de la maison (un clic sur son emoji) : sa vidéo avec ses commandes, une ligne « 🦊 caméra · date » (un clic dessus ouvre le clip dans l'onglet Caméras, comme le
 * double clic sur l'emoji) et sa note. Un clip en portrait est lu droit.
 */
const ClipPreview = ({ apiKey, event, onOpen }: ClipPreviewProps) => {
  const path = playablePath(event)
  return (
    <div className={WRAP_CLASS}>
      <button type="button" className={TITLE_CLASS} title={OPEN_TITLE} onClick={onOpen}>
        <span className={EMOJI_CLASS}>{event.emoji}</span>
        <span className={CAPTION_CLASS}>
          {event.camera} · {captionOf(event)}
        </span>
      </button>
      {event.note ? <span className={NOTE_CLASS}>{event.note}</span> : null}
      {path ? (
        event.orientation === 'portrait' ? (
          <PortraitClip key={path} apiKey={apiKey} path={path} onClose={noop} audioSrc={event.clip_audio ?? undefined} />
        ) : (
          <ClipPlayer key={path} apiKey={apiKey} path={path} onClose={noop} audioSrc={event.clip_audio ?? undefined} />
        )
      ) : (
        <span className={NOTE_CLASS}>{UNAVAILABLE_TEXT}</span>
      )}
    </div>
  )
}

export default ClipPreview
