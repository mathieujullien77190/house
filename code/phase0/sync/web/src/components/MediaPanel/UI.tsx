import Button from '@/components/UI/Button'
import { CLOSE_LABEL, HEAD_CLASS, IMAGE_ALT, MEDIA_CLASS, PANEL_CLASS, PATH_CLASS } from './constants'
import type { MediaPanelUIProps } from './types'

const MediaPanelUI = ({ media, src, onClose }: MediaPanelUIProps) => {
  return (
    <aside className={PANEL_CLASS}>
      <div className={HEAD_CLASS}>
        <span className={PATH_CLASS}>{media.path}</span>
        <Button onClick={onClose}>{CLOSE_LABEL}</Button>
      </div>
      {media.kind === 'video' ? <video className={MEDIA_CLASS} src={src} controls autoPlay /> : <img className={MEDIA_CLASS} src={src} alt={IMAGE_ALT} />}
    </aside>
  )
}

export default MediaPanelUI
