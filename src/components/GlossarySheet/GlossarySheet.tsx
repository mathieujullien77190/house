import GlossarySheetUI from './UI'
import { entryContent } from './helpers'
import type { GlossarySheetProps } from './types'

const GlossarySheet = ({ termId, open, onClose }: GlossarySheetProps) => {
  const { title, definition } = entryContent(termId)
  return <GlossarySheetUI open={open && definition !== ''} title={title} definition={definition} onClose={onClose} />
}

export default GlossarySheet
