import { ALT, BOX_CLASS, FRAME_CLASS, IMAGE_CLASS, LABEL_CLASS } from './constants'
import type { SnapshotImageProps } from './types'

/** Une image au format 16/9, ou un message dans le même cadre. */
const SnapshotImage = ({ src, label, message, onSize }: SnapshotImageProps) => {
  if (src) {
    const image = <img className={IMAGE_CLASS} src={src} alt={ALT} onLoad={(event) => onSize?.(event.currentTarget.naturalWidth, event.currentTarget.naturalHeight)} />
    if (!label) return image
    return (
      <div className={FRAME_CLASS}>
        {image}
        <span className={LABEL_CLASS}>{label}</span>
      </div>
    )
  }
  return <div className={BOX_CLASS}>{message}</div>
}

export default SnapshotImage
