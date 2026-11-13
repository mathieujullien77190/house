import Button from '@/components/UI/Button'
import { CLOSE_LABEL } from './constants'
import type { BottomSheetUIProps } from './types'

const BottomSheetUI = ({ open, title, className, onClose, children }: BottomSheetUIProps) => {
  return (
    <aside className={className} role="dialog" aria-label={title} aria-hidden={!open}>
      <div className="flex items-start justify-between gap-4">
        <h2 className="m-0 text-[1.05rem] font-semibold">{title}</h2>
        <Button tabIndex={open ? 0 : -1} onClick={onClose}>
          {CLOSE_LABEL}
        </Button>
      </div>
      <div className="mt-2 text-[0.95rem]">{children}</div>
    </aside>
  )
}

export default BottomSheetUI
