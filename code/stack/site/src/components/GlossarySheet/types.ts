export interface GlossarySheetProps {
  /** Dernier terme choisi : il reste affiché pendant que le bloc redescend. */
  termId: string | null
  open: boolean
  onClose: () => void
}

export interface GlossarySheetUIProps {
  open: boolean
  title: string
  definition: string
  onClose: () => void
}
