import { CAPTION_CLASS, FIGURE_CLASS, LAST_CLASS, NAME_CLASS, SECTION_CLASS, WARNING_CLASS } from './constants'
import type { CameraCardProps } from './types'

/** La carte d'une caméra : son nom, un média légendé, le dernier événement, la frise. Les contenus viennent du parent. */
const CameraCard = ({ name, caption, warning = '', media, lastEventText, timeline }: CameraCardProps) => {
  return (
    <section className={SECTION_CLASS}>
      <h2 className={NAME_CLASS}>{name}</h2>
      <figure className={FIGURE_CLASS}>
        <figcaption className={CAPTION_CLASS}>{caption}</figcaption>
        {warning ? <p className={WARNING_CLASS}>{warning}</p> : null}
        {media}
      </figure>
      <p className={LAST_CLASS}>{lastEventText}</p>
      {timeline}
    </section>
  )
}

export default CameraCard
