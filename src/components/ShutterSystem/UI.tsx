import ArchDiagram from '@/components/ArchDiagram'
import Card from '@/components/UI/Card'
import SegmentedControl from '@/components/UI/SegmentedControl'
import { TITLE, VIEW_GROUP_LABEL } from './constants'
import type { ShutterSystemUIProps } from './types'

const ShutterSystemUI = ({ viewId, view, options, onViewChange }: ShutterSystemUIProps) => {
  return (
    <Card as="section">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="m-0 text-[1.15rem] font-semibold">{TITLE}</h2>
        <SegmentedControl label={VIEW_GROUP_LABEL} options={options} value={viewId} onChange={onViewChange} />
      </div>
      <div className="mb-3 mt-1 space-y-1.5 text-[0.9rem] text-muted">
        {view.intro.map((paragraph) => (
          <p key={paragraph} className="m-0">
            {paragraph}
          </p>
        ))}
      </div>
      <ArchDiagram view={view} />
    </Card>
  )
}

export default ShutterSystemUI
