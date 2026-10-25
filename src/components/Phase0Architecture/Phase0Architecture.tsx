import { useState } from 'react'
import CodeBrowser from '@/components/CodeBrowser'
import DeploymentPanel from '@/components/DeploymentPanel'
import Phase0ArchitectureUI from './UI'
import { DEFAULT_VIEW, INTROS, VIEWS, VIEW_OPTIONS } from './constants'
import type { ViewId } from './types'

const Phase0Architecture = () => {
  const [view, setView] = useState<ViewId>(DEFAULT_VIEW)
  const diagram = view === 'code' || view === 'deploy' ? null : VIEWS[view]
  const intro = view === 'code' || view === 'deploy' ? INTROS[view] : VIEWS[view].intro
  return (
    <Phase0ArchitectureUI viewId={view} view={diagram} intro={intro} options={VIEW_OPTIONS} onViewChange={setView}>
      {view === 'code' ? <CodeBrowser /> : view === 'deploy' ? <DeploymentPanel /> : null}
    </Phase0ArchitectureUI>
  )
}

export default Phase0Architecture
