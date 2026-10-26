import DeploymentPanelUI from './UI'
import { ENTRIES, ENTRIES_PHASE1, REMINDERS, REMINDERS_PHASE1 } from './constants'
import type { DeploymentPanelProps } from './types'

/** Où joindre chaque équipement et service de la phase 0 (le PC) ou 1 (le mini PC) : adresses, comptes (sans mot de passe) et rappels. */
const DeploymentPanel = ({ phase }: DeploymentPanelProps) => {
  return phase === 1 ? <DeploymentPanelUI entries={ENTRIES_PHASE1} reminders={REMINDERS_PHASE1} /> : <DeploymentPanelUI entries={ENTRIES} reminders={REMINDERS} />
}

export default DeploymentPanel
