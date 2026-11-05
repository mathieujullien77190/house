import { useState } from 'react'
import CodeBrowser from '@/components/CodeBrowser'
import DeploymentPanel from '@/components/DeploymentPanel'
import InterfacesMap from '@/components/InterfacesMap'
import ArchitectureUI from './UI'
import { ARCHITECTURE, DEFAULT_VIEW, VIEW_OPTIONS } from './constants'
import type { DiagramViewId, ViewId } from './types'

/** L'architecture du système tel qu'il est : le mini PC, ses conteneurs et l'accès distant par WireGuard. */
const Architecture = () => {
  const [view, setView] = useState<ViewId>(DEFAULT_VIEW)
  const diagram = view in ARCHITECTURE.views ? ARCHITECTURE.views[view as DiagramViewId] : null
  const intro = diagram ? diagram.intro : ARCHITECTURE.intros[view as Exclude<ViewId, DiagramViewId>]
  return (
    <ArchitectureUI title={ARCHITECTURE.title} viewId={view} view={diagram} intro={intro} options={VIEW_OPTIONS} onViewChange={setView}>
      {view === 'interfaces' ? <InterfacesMap /> : view === 'code' ? <CodeBrowser /> : view === 'deploy' ? <DeploymentPanel /> : null}
    </ArchitectureUI>
  )
}

export default Architecture
