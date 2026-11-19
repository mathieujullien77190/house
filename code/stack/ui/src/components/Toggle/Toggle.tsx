import Tabs from '../Tabs'
import { DEFAULT_OFF_TEXT, DEFAULT_ON_TEXT } from './constants'
import { toggleOptions } from './helpers'
import type { ToggleProps } from './types'

/** Un interrupteur marche / arrêt : deux onglets en bloc (le même composant que les onglets), l'état reste au parent. */
const Toggle = ({ label, checked, onChange, disabled = false, onText = DEFAULT_ON_TEXT, offText = DEFAULT_OFF_TEXT }: ToggleProps) => (
  <Tabs
    block
    label={label}
    options={toggleOptions(onText, offText)}
    value={checked ? 'on' : 'off'}
    disabled={disabled}
    onChange={(id) => {
      if ((id === 'on') !== checked) onChange(id === 'on')
    }}
  />
)

export default Toggle
