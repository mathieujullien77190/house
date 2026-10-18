import { useEffect } from 'react'
import BottomSheetUI from './UI'
import { sheetClass } from './helpers'
import type { BottomSheetProps } from './types'

const BottomSheet = ({ open, title, onClose, children }: BottomSheetProps) => {
  // Échap ferme le bloc tant qu'il est ouvert.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <BottomSheetUI open={open} title={title} className={sheetClass(open)} onClose={onClose}>
      {children}
    </BottomSheetUI>
  )
}

export default BottomSheet
