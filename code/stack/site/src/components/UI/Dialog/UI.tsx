import Button from '@/components/UI/Button'
import { CLOSE_LABEL, DIALOG_CLASS } from './constants'
import { isBackdropClick } from './helpers'
import type { DialogUIProps } from './types'

const DialogUI = ({ dialogRef, title, onClose, onBackdropClick, children }: DialogUIProps) => {
  return (
    <dialog
      ref={dialogRef}
      className={DIALOG_CLASS}
      aria-label={title}
      onClose={onClose}
      onClick={(e) => {
        const dialog = dialogRef.current
        if (dialog && isBackdropClick(e.target, dialog)) onBackdropClick()
      }}
    >
      <div className="p-4">
        <div className="mb-3 flex items-start justify-between gap-4">
          <h2 className="m-0 text-[1.15rem] font-semibold">{title}</h2>
          <Button onClick={onClose}>{CLOSE_LABEL}</Button>
        </div>
        {children}
      </div>
    </dialog>
  )
}

export default DialogUI
