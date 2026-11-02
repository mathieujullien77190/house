import Button from '../Button'
import { CLOSE_LABEL, HEAD_CLASS, IMAGE_ALT, MEDIA_CLASS, PANEL_CLASS, TITLE_CLASS } from './constants'
import type { MediaPanelProps } from './types'

/** Un clip ou une image dans un panneau collant : la vidéo démarre à l'ouverture, Fermer retire le panneau. */
const MediaPanel = ({ kind, title, src, onClose }: MediaPanelProps) => {
  return (
    <aside className={PANEL_CLASS}>
      <div className={HEAD_CLASS}>
        <span className={TITLE_CLASS}>{title}</span>
        <Button onClick={onClose}>{CLOSE_LABEL}</Button>
      </div>
      {kind === 'video' ? <video className={MEDIA_CLASS} src={src} controls autoPlay /> : <img className={MEDIA_CLASS} src={src} alt={IMAGE_ALT} />}
    </aside>
  )
}

export default MediaPanel
