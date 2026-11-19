import Toggle from '../Toggle'
import { NO_TEXT, WRAP_CLASS, YES_TEXT } from './constants'
import type { ToggleFieldProps } from './types'

/** Un choix oui / non et son texte : le texte à gauche, l'interrupteur en onglets (le même composant que les autres) à droite, alignés d'un champ à l'autre. Le choix reste au parent. */
const ToggleField = ({ label, checked, onChange, disabled = false }: ToggleFieldProps) => (
  <div className={WRAP_CLASS}>
    <span>{label}</span>
    <Toggle label={label} checked={checked} onChange={onChange} disabled={disabled} onText={YES_TEXT} offText={NO_TEXT} />
  </div>
)

export default ToggleField
