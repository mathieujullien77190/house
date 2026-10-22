import { useState } from 'react'
import Phase0ArchitectureUI from './UI'
import { DEFAULT_VIEW, VIEWS, VIEW_OPTIONS } from './constants'
import type { ViewId } from './types'

const Phase0Architecture = () => {
  const [view, setView] = useState<ViewId>(DEFAULT_VIEW)
  return <Phase0ArchitectureUI view={VIEWS[view]} options={VIEW_OPTIONS} onViewChange={setView} />
}

export default Phase0Architecture
