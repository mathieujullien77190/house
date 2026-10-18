import PhaseSwitchUI from './UI'
import { buildCards } from './helpers'
import type { PhaseSwitchProps } from './types'

const PhaseSwitch = ({ phase, totals, onChange }: PhaseSwitchProps) => {
  return <PhaseSwitchUI cards={buildCards(phase, totals)} onSelect={onChange} />
}

export default PhaseSwitch
