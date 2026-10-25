import { EMPTY_CLASS, FRAME_CLASS, INTRO_CLASS, LINK_CLASS, OPEN_LABEL } from './constants'
import type { PageFrameProps } from './types'

/** Une autre page dans une iframe, avec un lien pour l'ouvrir à part. */
const PageFrame = ({ src, title, intro, emptyText }: PageFrameProps) => {
  if (!src) return <p className={EMPTY_CLASS}>{emptyText}</p>
  return (
    <div>
      <p className={INTRO_CLASS}>
        <span>{intro}</span>
        <a href={src} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
          {OPEN_LABEL}
        </a>
      </p>
      <iframe src={src} title={title} className={FRAME_CLASS} allow="autoplay; fullscreen" />
    </div>
  )
}

export default PageFrame
