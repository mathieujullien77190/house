import Timeline from '@/components/Timeline'
import { CAPTION_CLASS, FIGURE_CLASS, IMAGE_ALT, IMAGE_CAPTION, IMAGE_CLASS, LAST_CLASS, NAME_CLASS, NO_IMAGE_TEXT, SECTION_CLASS, WARNING_CLASS } from './constants'
import type { CameraCardUIProps } from './types'

const CameraCardUI = ({ apiKey, name, imageSrc, lastEventText, events, onImageError }: CameraCardUIProps) => {
  return (
    <section className={SECTION_CLASS}>
      <h2 className={NAME_CLASS}>{name}</h2>
      {imageSrc ? (
        <figure className={FIGURE_CLASS}>
          <figcaption className={CAPTION_CLASS}>{IMAGE_CAPTION}</figcaption>
          <img className={IMAGE_CLASS} src={imageSrc} alt={IMAGE_ALT} onError={onImageError} />
        </figure>
      ) : (
        <p className={WARNING_CLASS}>{NO_IMAGE_TEXT}</p>
      )}
      <p className={LAST_CLASS}>{lastEventText}</p>
      <Timeline apiKey={apiKey} events={events} />
    </section>
  )
}

export default CameraCardUI
