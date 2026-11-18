import { Tabs } from '@house/ui'
import { ADDRESS_CLASS, ADDRESS_LABEL, ERROR_CLASS, HINT_CLASS, KEY_NOTE, LABEL_CLASS, OPTIONS, ROW_CLASS, SAVE_ERROR_TEXT, SWITCHES, WRAP_CLASS } from './constants'
import type { LanAccessUIProps } from './types'

const LanAccessUI = ({ settings, failed, onChange }: LanAccessUIProps) => (
  <div className={WRAP_CLASS}>
    {failed ? <span className={ERROR_CLASS}>{SAVE_ERROR_TEXT}</span> : null}
    {SWITCHES.map(({ key, label, hint }) => (
      <div key={key} className={ROW_CLASS}>
        <span className={LABEL_CLASS}>{label}</span>
        <Tabs label={label} options={[...OPTIONS]} value={settings[key] ? 'on' : 'off'} onChange={(id) => onChange(key, id === 'on')} />
        <span className={HINT_CLASS}>{hint}</span>
      </div>
    ))}
    <div className={ROW_CLASS}>
      <span className={LABEL_CLASS}>{ADDRESS_LABEL}</span>
      <span className={ADDRESS_CLASS}>{settings.address}</span>
      <span className={HINT_CLASS}>{KEY_NOTE}</span>
    </div>
  </div>
)

export default LanAccessUI
