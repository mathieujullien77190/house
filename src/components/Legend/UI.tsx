import RichText from '@/components/UI/RichText'
import { LIST_CLASS } from './constants'
import type { LegendUIProps } from './types'

const LegendUI = ({ swatches }: LegendUIProps) => {
  return (
    <ul className={LIST_CLASS}>
      {swatches.map((s) => (
        <li key={s.type} className="flex items-center gap-2">
          <svg width="36" height="8" aria-hidden="true">
            <line x1="0" y1="4" x2="36" y2="4" className={s.className} />
          </svg>
          <RichText text={s.label} />
        </li>
      ))}
      <li className="flex items-center gap-2">
        <svg width="18" height="18" viewBox="-9 -9 18 18" aria-hidden="true">
          <circle r="8" className="fill-backup" />
          <path d="M 1 -6 L -4 1 H -0.5 L -1 6 L 4 -1 H 0.5 Z" className="fill-white" />
        </svg>
        Branché au secteur 230 V
      </li>
    </ul>
  )
}

export default LegendUI
