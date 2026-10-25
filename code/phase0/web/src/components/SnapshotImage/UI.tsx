import { ALT, BOX_CLASS, IMAGE_CLASS } from './constants'
import type { SnapshotImageUIProps } from './types'

const SnapshotImageUI = ({ src, message }: SnapshotImageUIProps) => {
  if (src) return <img className={IMAGE_CLASS} src={src} alt={ALT} />
  return <div className={BOX_CLASS}>{message}</div>
}

export default SnapshotImageUI
