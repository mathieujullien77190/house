import {
  BIG_MEDIA_CLASS,
  CAPTION_CLASS,
  CAPTION_ROW_CLASS,
  COLLAPSE_CLASS,
  COLLAPSE_LABEL,
  EXPAND_CLASS,
  EXPAND_LABEL,
  EXPANDED_CLASS,
  FIGURE_CLASS,
  HEAD_CLASS,
  NAME_CLASS,
  SECTION_CLASS,
  WARNING_CLASS,
} from './constants'
import type { CameraCardProps } from './types'

/**
 * La carte d'une caméra : son nom (et ses actions), un média légendé, la frise. Les contenus viennent du parent.
 * Le média peut passer en grand : plein écran, en paysage ; le parent décide quand (`expanded`) et appelle le plein
 * écran du navigateur sur `figureRef`.
 */
const CameraCard = ({ name, caption, warning = '', actions, media, timeline, figureRef, expanded = false, onExpand, onCollapse }: CameraCardProps) => {
  return (
    <section className={SECTION_CLASS}>
      <div className={HEAD_CLASS}>
        <h2 className={NAME_CLASS}>{name}</h2>
        {actions}
      </div>
      <figure ref={figureRef} className={expanded ? EXPANDED_CLASS : FIGURE_CLASS}>
        {expanded ? null : (
          <figcaption className={`${CAPTION_ROW_CLASS} ${CAPTION_CLASS}`}>
            <span>{caption}</span>
            {onExpand ? (
              <button type="button" className={EXPAND_CLASS} onClick={onExpand}>
                {EXPAND_LABEL}
              </button>
            ) : null}
          </figcaption>
        )}
        {warning && !expanded ? <p className={WARNING_CLASS}>{warning}</p> : null}
        <div className={expanded ? BIG_MEDIA_CLASS : undefined}>{media}</div>
        {expanded && onCollapse ? (
          <button type="button" className={COLLAPSE_CLASS} onClick={onCollapse}>
            {COLLAPSE_LABEL}
          </button>
        ) : null}
      </figure>
      {timeline}
    </section>
  )
}

export default CameraCard
