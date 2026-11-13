import Dialog from '@/components/UI/Dialog'
import SegmentedControl from '@/components/UI/SegmentedControl'
import { TABS_LABEL } from './constants'
import type { CameraDialogUIProps } from './types'

const CameraDialogUI = ({ open, title, view, tabs, onViewChange, onClose, schematic, model }: CameraDialogUIProps) => {
  return (
    <Dialog open={open} title={title} onClose={onClose}>
      <div className="mb-3">
        <SegmentedControl label={TABS_LABEL} options={tabs} value={view} onChange={onViewChange} />
      </div>
      {view === '2d' ? schematic : model}
    </Dialog>
  )
}

export default CameraDialogUI
