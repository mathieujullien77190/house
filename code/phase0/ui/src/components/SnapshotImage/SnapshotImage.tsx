import { ALT, BOX_CLASS, IMAGE_CLASS } from './constants'
import type { SnapshotImageProps } from './types'

/** Une image au format 16/9, ou un message dans le même cadre. */
const SnapshotImage = ({ src, message }: SnapshotImageProps) => {
  if (src) return <img className={IMAGE_CLASS} src={src} alt={ALT} />
  return <div className={BOX_CLASS}>{message}</div>
}

export default SnapshotImage
