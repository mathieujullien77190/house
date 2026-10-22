import { useState } from 'react'
import CodeBrowser from '@/components/CodeBrowser'
import Phase0ArchitectureUI from './UI'
import { CODE_INTRO, DEFAULT_VIEW, VIEWS, VIEW_OPTIONS } from './constants'
import type { ViewId } from './types'

const Phase0Architecture = () => {
  const [view, setView] = useState<ViewId>(DEFAULT_VIEW)
  const diagram = view === 'code' ? null : VIEWS[view]
  return (
    <Phase0ArchitectureUI viewId={view} view={diagram} intro={diagram ? diagram.intro : CODE_INTRO} options={VIEW_OPTIONS} onViewChange={setView}>
      {diagram ? null : <CodeBrowser />}
    </Phase0ArchitectureUI>
  )
}

export default Phase0Architecture
