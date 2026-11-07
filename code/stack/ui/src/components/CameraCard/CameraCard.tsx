import {
  BACK_ARROW,
  BACK_CLASS,
  BIG_MEDIA_CLASS,
  CAPTION_CLASS,
  CAPTION_ROW_CLASS,
  CLOCK_CLASS,
  COLLAPSE_CLASS,
  COLLAPSE_LABEL,
  EXPAND_CLASS,
  EXPAND_LABEL,
  EXPANDED_CLASS,
  FIGURE_CLASS,
  HEAD_CLASS,
  NAME_CLASS,
  OVERLAY_DETAILS_CLASS,
  OVERLAY_TOP_CLASS,
  SCREEN_CLASS,
  SCREEN_EXPAND_CLASS,
  SCREEN_EXPAND_ICON,
  SCREEN_MEDIA_CLASS,
  SCREEN_TIMELINE_CLASS,
  SCREEN_VIDEO_CLASS,
  SCREEN_WARNING_CLASS,
  SECTION_CLASS,
  WARNING_CLASS,
  ZOOM_AREA_CLASS,
} from './constants'
import type { CameraCardProps } from './types'

/**
 * La carte d'une caméra : son nom (et ses actions), un média légendé, la frise. Les contenus viennent du parent.
 * Le média peut passer en grand : plein écran, en paysage ; le parent décide quand (`expanded`) et appelle le plein
 * écran du navigateur sur `figureRef`.
 */
const CameraCard = ({ screen = false, onBack, backLabel = '', name, caption, warning = '', actions, media, details, overlay, clock, timeline, figureRef, expanded = false, onExpand, onCollapse, mediaGesture }: CameraCardProps) => {
  // Le zoom au doigt existe en vue en grand et sur l'écran du téléphone (la vidéo du tiers du haut).
  const gesture = expanded || screen ? mediaGesture : undefined
  // L'écran du téléphone : la vidéo sur le tiers du haut (commandes dessus), la frise sur le reste, pas de titre ni de légende.
  if (screen) {
    return (
      <section className={SCREEN_CLASS}>
        {expanded || !onBack ? null : (
          <button type="button" className={BACK_CLASS} aria-label={backLabel} title={backLabel} onClick={onBack}>
            {BACK_ARROW}
          </button>
        )}
        <figure ref={figureRef} className={expanded ? EXPANDED_CLASS : SCREEN_VIDEO_CLASS}>
          <div className={expanded ? (gesture ? `${BIG_MEDIA_CLASS} ${ZOOM_AREA_CLASS}` : BIG_MEDIA_CLASS) : gesture ? `${SCREEN_MEDIA_CLASS} ${ZOOM_AREA_CLASS}` : SCREEN_MEDIA_CLASS} {...gesture?.handlers}>
            <div style={gesture?.style}>{media}</div>
          </div>
          {expanded && clock ? <div className={CLOCK_CLASS}>{clock}</div> : null}
          {expanded ? (
            onCollapse ? (
              <button type="button" className={COLLAPSE_CLASS} onClick={onCollapse}>
                {COLLAPSE_LABEL}
              </button>
            ) : null
          ) : (
            <>
              {actions ? <div className={OVERLAY_TOP_CLASS}>{actions}</div> : null}
              {details ? <div className={OVERLAY_DETAILS_CLASS}>{details}</div> : null}
              {warning ? <p className={SCREEN_WARNING_CLASS}>{warning}</p> : null}
              {onExpand ? (
                <button type="button" className={SCREEN_EXPAND_CLASS} aria-label={EXPAND_LABEL} title={EXPAND_LABEL} onClick={onExpand}>
                  {SCREEN_EXPAND_ICON}
                </button>
              ) : null}
            </>
          )}
        </figure>
        <div className={SCREEN_TIMELINE_CLASS}>{timeline}</div>
      </section>
    )
  }
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
        <div className={expanded ? (gesture ? `${BIG_MEDIA_CLASS} ${ZOOM_AREA_CLASS}` : BIG_MEDIA_CLASS) : undefined} {...gesture?.handlers}>
          <div style={gesture?.style}>{media}</div>
        </div>
        {overlay ? <div className={OVERLAY_DETAILS_CLASS}>{overlay}</div> : null}
        {expanded && clock ? <div className={CLOCK_CLASS}>{clock}</div> : null}
        {expanded && onCollapse ? (
          <button type="button" className={COLLAPSE_CLASS} onClick={onCollapse}>
            {COLLAPSE_LABEL}
          </button>
        ) : null}
      </figure>
      {details}
      {timeline}
    </section>
  )
}

export default CameraCard
