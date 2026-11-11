import {
  BACK_CLASS,
  BACK_ICON_CLASS,
  BACK_ICON_PATH,
  BIG_MEDIA_CLASS,
  CLOCK_CLASS,
  COLLAPSE_CLASS,
  COLLAPSE_ICON,
  COLLAPSE_LABEL,
  EXPAND_OVERLAY_CLASS,
  MEDIA_BLOCK_CLASS,
  MEDIA_BLOCK_PORTRAIT_CLASS,
  EXPAND_LABEL,
  EXPANDED_CLASS,
  EXPANDED_UPRIGHT_CLASS,
  FIGURE_CLASS,
  HEAD_CLASS,
  NAME_CLASS,
  OVERLAY_DETAILS_CLASS,
  LAYER_CLASS,
  OVERLAY_TOP_CLASS,
  OVERLAY_TOP_LEFT_CLASS,
  OVERLAY_TOP_LEFT_PHONE_CLASS,
  SOUND_CLASS,
  SOUND_EXPANDED_CLASS,
  SOUND_SCREEN_CLASS,
  SCREEN_CLASS,
  SCREEN_EXPAND_CLASS,
  SCREEN_EXPAND_ICON,
  SCREEN_MEDIA_CLASS,
  SCREEN_MEDIA_WIDE_CLASS,
  SCREEN_TIMELINE_CLASS,
  SCREEN_VIDEO_CLASS,
  SCREEN_VIDEO_WIDE_CLASS,
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
const CameraCard = ({
  screen = false,
  onBack,
  backLabel = '',
  name,
  warning = '',
  actions,
  media,
  details,
  overlay,
  clock,
  sound,
  layer,
  videoActions,
  topLeft,
  timeline,
  figureRef,
  expanded = false,
  onExpand,
  onCollapse,
  mediaGesture,
  portraitMedia = false,
}: CameraCardProps) => {
  // Un média en portrait garde l'écran tel quel en vue en grand.
  const expandedClass = portraitMedia ? EXPANDED_UPRIGHT_CLASS : EXPANDED_CLASS
  // Le zoom : au doigt en vue en grand et sur l'écran du téléphone, à la molette partout (le parent décide de ce qu'il passe).
  const gesture = mediaGesture
  const screenMediaClass = portraitMedia ? SCREEN_MEDIA_CLASS : SCREEN_MEDIA_WIDE_CLASS
  // L'écran du téléphone : la vidéo sur la moitié du haut (commandes dessus), la frise sur le reste, pas de titre ni de légende.
  if (screen) {
    return (
      <section className={SCREEN_CLASS}>
        {expanded || !onBack ? null : (
          <button type="button" className={BACK_CLASS} aria-label={backLabel} title={backLabel} onClick={onBack}>
            <svg viewBox="0 0 10 10" className={BACK_ICON_CLASS} aria-hidden="true">
              <path d={BACK_ICON_PATH} />
            </svg>
          </button>
        )}
        <figure ref={figureRef} className={expanded ? expandedClass : portraitMedia ? SCREEN_VIDEO_CLASS : SCREEN_VIDEO_WIDE_CLASS}>
          <div
            className={
              expanded
                ? gesture
                  ? `${BIG_MEDIA_CLASS} ${ZOOM_AREA_CLASS}`
                  : BIG_MEDIA_CLASS
                : gesture
                  ? `${screenMediaClass} ${ZOOM_AREA_CLASS}`
                  : screenMediaClass
            }
            {...gesture?.handlers}
          >
            <div style={gesture?.style}>{media}</div>
          </div>
          {expanded && details ? <div className={OVERLAY_DETAILS_CLASS}>{details}</div> : null}
          {expanded && clock ? <div className={CLOCK_CLASS}>{clock}</div> : null}
          {expanded && sound ? <div className={SOUND_EXPANDED_CLASS}>{sound}</div> : null}
          {expanded ? (
            onCollapse ? (
              <button type="button" className={COLLAPSE_CLASS} aria-label={COLLAPSE_LABEL} title={COLLAPSE_LABEL} onClick={onCollapse}>
                {COLLAPSE_ICON}
              </button>
            ) : null
          ) : (
            <>
              {topLeft ? <div className={OVERLAY_TOP_LEFT_PHONE_CLASS}>{topLeft}</div> : null}
              {actions ? <div className={OVERLAY_TOP_CLASS}>{actions}</div> : null}
              {details ? <div className={OVERLAY_DETAILS_CLASS}>{details}</div> : null}
              {sound ? <div className={SOUND_SCREEN_CLASS}>{sound}</div> : null}
              {layer ? <div className={LAYER_CLASS}>{layer}</div> : null}
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
      <figure ref={figureRef} className={expanded ? expandedClass : FIGURE_CLASS}>
        {warning && !expanded ? <p className={WARNING_CLASS}>{warning}</p> : null}
        <div className={expanded ? undefined : portraitMedia ? MEDIA_BLOCK_PORTRAIT_CLASS : MEDIA_BLOCK_CLASS}>
          <div
            className={expanded ? (gesture ? `${BIG_MEDIA_CLASS} ${ZOOM_AREA_CLASS}` : BIG_MEDIA_CLASS) : undefined}
            {...gesture?.handlers}
          >
            <div style={gesture?.style}>{media}</div>
          </div>
          {expanded ? null : (
            <>
              {topLeft ? <div className={OVERLAY_TOP_LEFT_CLASS}>{topLeft}</div> : null}
              {videoActions ? <div className={OVERLAY_TOP_CLASS}>{videoActions}</div> : null}
              {onExpand ? (
                <button type="button" className={EXPAND_OVERLAY_CLASS} aria-label={EXPAND_LABEL} title={EXPAND_LABEL} onClick={onExpand}>
                  {SCREEN_EXPAND_ICON}
                </button>
              ) : null}
              {overlay ? <div className={OVERLAY_DETAILS_CLASS}>{overlay}</div> : null}
              {sound ? <div className={SOUND_CLASS}>{sound}</div> : null}
              {layer ? <div className={LAYER_CLASS}>{layer}</div> : null}
            </>
          )}
        </div>
        {expanded && overlay ? <div className={OVERLAY_DETAILS_CLASS}>{overlay}</div> : null}
        {expanded && clock ? <div className={CLOCK_CLASS}>{clock}</div> : null}
        {expanded && sound ? <div className={SOUND_EXPANDED_CLASS}>{sound}</div> : null}
        {expanded && onCollapse ? (
          <button type="button" className={COLLAPSE_CLASS} aria-label={COLLAPSE_LABEL} title={COLLAPSE_LABEL} onClick={onCollapse}>
            {COLLAPSE_ICON}
          </button>
        ) : null}
      </figure>
      {details}
      {timeline}
    </section>
  )
}

export default CameraCard
