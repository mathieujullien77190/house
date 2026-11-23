import { IMAGE_CLASS, OVERLAY_CLASS, TURNED_CLASS } from './constants'
import type { TvLiveUIProps } from './types'

const TvLiveUI = ({ src, turned, name }: TvLiveUIProps) => (
  <div className={OVERLAY_CLASS} role="img" aria-label={name}>
    {turned ? (
      <div className={TURNED_CLASS}>
        <img className={IMAGE_CLASS} src={src} alt="" />
      </div>
    ) : (
      <img className={IMAGE_CLASS} src={src} alt="" />
    )}
  </div>
)

export default TvLiveUI
