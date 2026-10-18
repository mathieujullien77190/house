import DiagramNodeUI from './UI'
import { ariaLabel, groupClass, rectClass } from './helpers'
import type { DiagramNodeProps } from './types'

const DiagramNode = ({ n, selected, mains, ghost, onPointerDown, onPointerMove, onPointerUp, onKeyDown }: DiagramNodeProps) => {
  return (
    <DiagramNodeUI
      n={n}
      mains={mains}
      ghost={ghost}
      groupClass={groupClass(ghost)}
      rectClass={rectClass(n.kind, selected)}
      ariaLabel={ariaLabel(n)}
      onPointerDown={(e) => onPointerDown(e, n)}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onKeyDown={(e) => onKeyDown(e, n)}
    />
  )
}

export default DiagramNode
