import { Tabs } from '@house/ui'
import { ERROR_CLASS, HINT_CLASS, LABEL_CLASS, NEXT_LABEL, NONE_TEXT, OFFSET_LABEL, OPTIONS, ROW_CLASS, SAVE_ERROR_TEXT, SWITCH_HINT, SWITCH_LABEL, VALUE_CLASS, WRAP_CLASS } from './constants'
import { nextRunText, offsetText } from './helpers'
import type { SunsetLightsUIProps } from './types'

const SunsetLightsUI = ({ settings, failed, onChange }: SunsetLightsUIProps) => (
  <div className={WRAP_CLASS}>
    {failed ? <span className={ERROR_CLASS}>{SAVE_ERROR_TEXT}</span> : null}
    <div className={ROW_CLASS}>
      <span className={LABEL_CLASS}>{SWITCH_LABEL}</span>
      <Tabs label={SWITCH_LABEL} options={[...OPTIONS]} value={settings.enabled ? 'on' : 'off'} onChange={(id) => onChange(id === 'on')} />
      <span className={HINT_CLASS}>{SWITCH_HINT}</span>
    </div>
    <div className={ROW_CLASS}>
      <span className={LABEL_CLASS}>{NEXT_LABEL}</span>
      <span className={VALUE_CLASS}>{nextRunText(settings.next_run) ?? NONE_TEXT}</span>
      <span className={HINT_CLASS}>{`${OFFSET_LABEL} : ${offsetText(settings.offset_minutes)}`}</span>
    </div>
  </div>
)

export default SunsetLightsUI
