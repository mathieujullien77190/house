import { useState } from 'react'
import CodeBrowser from '@/components/CodeBrowser'
import DeploymentPanel from '@/components/DeploymentPanel'
import PhaseArchitectureUI from './UI'
import { DEFAULT_VIEW, PHASE_CONFIGS, VIEW_OPTIONS } from './constants'
import type { PhaseArchitectureProps, ViewId } from './types'

/** L'architecture d'une phase sans cluster : la phase 0 (le PC) ou la phase 1 (deux Pi). */
const PhaseArchitecture = ({ phase }: PhaseArchitectureProps) => {
  const [view, setView] = useState<ViewId>(DEFAULT_VIEW)
  const config = PHASE_CONFIGS[phase]
  const diagram = view === 'code' || view === 'deploy' ? null : config.views[view]
  const intro = view === 'code' || view === 'deploy' ? config.intros[view] : config.views[view].intro
  return (
    <PhaseArchitectureUI title={config.title} viewId={view} view={diagram} intro={intro} options={VIEW_OPTIONS} onViewChange={setView}>
      {view === 'code' ? <CodeBrowser /> : view === 'deploy' ? <DeploymentPanel phase={phase} /> : null}
    </PhaseArchitectureUI>
  )
}

export default PhaseArchitecture
