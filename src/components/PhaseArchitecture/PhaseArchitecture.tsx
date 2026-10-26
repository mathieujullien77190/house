import { useState } from 'react'
import CodeBrowser from '@/components/CodeBrowser'
import DeploymentPanel from '@/components/DeploymentPanel'
import InterfacesMap from '@/components/InterfacesMap'
import PhaseArchitectureUI from './UI'
import { DEFAULT_VIEW, PHASE_CONFIGS, VIEW_OPTIONS } from './constants'
import type { PhaseArchitectureProps, ViewId } from './types'

/** L'architecture d'une phase sans cluster : la phase 0 (le PC) ou la phase 1 (deux Pi). */
const PhaseArchitecture = ({ phase }: PhaseArchitectureProps) => {
  const [view, setView] = useState<ViewId>(DEFAULT_VIEW)
  const config = PHASE_CONFIGS[phase]
  const hasDiagram = view === 'hardware' || view === 'software'
  const diagram = hasDiagram ? config.views[view] : null
  const intro = hasDiagram ? config.views[view].intro : config.intros[view]
  return (
    <PhaseArchitectureUI title={config.title} viewId={view} view={diagram} intro={intro} options={VIEW_OPTIONS} onViewChange={setView}>
      {view === 'interfaces' ? <InterfacesMap /> : view === 'code' ? <CodeBrowser /> : view === 'deploy' ? <DeploymentPanel phase={phase} /> : null}
    </PhaseArchitectureUI>
  )
}

export default PhaseArchitecture
