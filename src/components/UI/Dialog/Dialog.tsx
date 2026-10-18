import { useEffect, useRef } from 'react'
import DialogUI from './UI'
import type { DialogProps } from './types'

const Dialog = ({ open, title, onClose, children }: DialogProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null)

  // Le <dialog> natif gère le focus, la touche Échap et le fond assombri.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <DialogUI dialogRef={dialogRef} title={title} onClose={onClose} onBackdropClick={onClose}>
      {open ? children : null}
    </DialogUI>
  )
}

export default Dialog
