import ArchDiagram from '@/components/ArchDiagram'
import Card from '@/components/UI/Card'
import SegmentedControl from '@/components/UI/SegmentedControl'
import { VIEW_GROUP_LABEL } from './constants'
import type { ArchitectureUIProps } from './types'

const ArchitectureUI = ({ title, viewId, view, intro, options, onViewChange, children }: ArchitectureUIProps) => {
  return (
    <Card as="section" className="mt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="m-0 text-[1.15rem] font-semibold">{title}</h2>
        <SegmentedControl label={VIEW_GROUP_LABEL} options={options} value={viewId} onChange={onViewChange} />
      </div>
      <div className="mb-3 mt-1 space-y-1.5 text-[0.9rem] text-muted">
        {intro.map((paragraph) => (
          <p key={paragraph} className="m-0">
            {paragraph}
          </p>
        ))}
      </div>
      {view ? <ArchDiagram view={view} /> : children}
    </Card>
  )
}

export default ArchitectureUI
