import BottomSheet from '@/components/UI/BottomSheet'
import RichText from '@/components/UI/RichText'
import type { GlossarySheetUIProps } from './types'

const GlossarySheetUI = ({ open, title, definition, onClose }: GlossarySheetUIProps) => {
  return (
    <BottomSheet open={open} title={title} onClose={onClose}>
      <p className="m-0 leading-relaxed">
        <RichText text={definition} />
      </p>
    </BottomSheet>
  )
}

export default GlossarySheetUI
