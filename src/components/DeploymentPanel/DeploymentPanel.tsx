import DeploymentPanelUI from './UI'
import { ENTRIES, REMINDERS } from './constants'

/** Où joindre chaque équipement et service de la phase 0 : adresses, comptes (sans mot de passe) et rappels. */
const DeploymentPanel = () => {
  return <DeploymentPanelUI entries={ENTRIES} reminders={REMINDERS} />
}

export default DeploymentPanel
