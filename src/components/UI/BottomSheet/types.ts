import type { ReactNode } from 'react'

export interface BottomSheetProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}

export interface BottomSheetUIProps {
  open: boolean
  title: string
  className: string
  onClose: () => void
  children: ReactNode
}
