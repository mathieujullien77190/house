import { CAPTION_CLASS, FIGURE_CLASS, HEAD_CLASS, NAME_CLASS, SECTION_CLASS, WARNING_CLASS } from './constants'
import type { CameraCardProps } from './types'

/** La carte d'une caméra : son nom (et ses actions), un média légendé, la frise. Les contenus viennent du parent. */
const CameraCard = ({ name, caption, warning = '', actions, media, timeline }: CameraCardProps) => {
  return (
    <section className={SECTION_CLASS}>
      <div className={HEAD_CLASS}>
        <h2 className={NAME_CLASS}>{name}</h2>
        {actions}
      </div>
      <figure className={FIGURE_CLASS}>
        <figcaption className={CAPTION_CLASS}>{caption}</figcaption>
        {warning ? <p className={WARNING_CLASS}>{warning}</p> : null}
        {media}
      </figure>
      {timeline}
    </section>
  )
}

export default CameraCard
