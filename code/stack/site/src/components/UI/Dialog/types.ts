import type { ReactNode, RefObject } from 'react'

export interface DialogProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}

export interface DialogUIProps {
  dialogRef: RefObject<HTMLDialogElement | null>
  title: string
  onClose: () => void
  onBackdropClick: () => void
  children: ReactNode
}
