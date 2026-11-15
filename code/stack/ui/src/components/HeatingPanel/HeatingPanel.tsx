import Button from '../Button'
import Checkbox from '../Checkbox'
import {
  ACTIONS_CLASS,
  BOX_CLASS,
  BOX_COMPACT_CLASS,
  ERROR_CLASS,
  FIELD_CLASS,
  FIELD_COMPACT_CLASS,
  FIELDS_CLASS,
  FIELDS_COMPACT_CLASS,
  FORM_CLASS,
  HINT_CLASS,
  HINT_COMPACT_CLASS,
  INPUT_CLASS,
  INPUT_COMPACT_CLASS,
  INPUT_TYPES,
  STEP_BUTTON_CLASS,
  STEP_BUTTON_COMPACT_CLASS,
  STEP_LABELS,
  STEP_SIGNS,
  STEPPER_CLASS,
} from './constants'
import { stepValue } from './helpers'
import type { HeatingPanelProps } from './types'

/** La règle du chauffage automatique : la case, les champs, « Enregistrer ». Les valeurs et l'envoi sont au parent. */
const HeatingPanel = ({ enabledLabel, enabled, onEnabledChange, fields, saveLabel, saving, onSave, error, compact = false }: HeatingPanelProps) => (
  <section className={compact ? BOX_COMPACT_CLASS : BOX_CLASS}>
    <form
      className={FORM_CLASS}
      onSubmit={(event) => {
        event.preventDefault()
        onSave()
      }}
    >
      <Checkbox label={enabledLabel} checked={enabled} onChange={onEnabledChange} />
      <div className={compact ? FIELDS_COMPACT_CLASS : FIELDS_CLASS}>
        {fields.map((field) => {
          const { kind } = field
          const input = (
            <input
              type={INPUT_TYPES[kind].type}
              inputMode={INPUT_TYPES[kind].inputMode}
              className={compact ? INPUT_COMPACT_CLASS : INPUT_CLASS}
              aria-label={field.label}
              value={field.value}
              onChange={(event) => field.onChange(event.target.value)}
            />
          )
          const stepClass = compact ? STEP_BUTTON_COMPACT_CLASS : STEP_BUTTON_CLASS
          return (
            <label key={field.id} className={compact ? FIELD_COMPACT_CLASS : FIELD_CLASS}>
              {field.label}
              {kind === 'time' ? (
                input
              ) : (
                <div className={STEPPER_CLASS}>
                  <button type="button" aria-label={`${STEP_LABELS.less} · ${field.label}`} className={stepClass} onClick={() => field.onChange(stepValue(field.value, kind, -1))}>
                    {STEP_SIGNS.less}
                  </button>
                  {input}
                  <button type="button" aria-label={`${STEP_LABELS.more} · ${field.label}`} className={stepClass} onClick={() => field.onChange(stepValue(field.value, kind, 1))}>
                    {STEP_SIGNS.more}
                  </button>
                </div>
              )}
              {field.hint ? <span className={compact ? HINT_COMPACT_CLASS : HINT_CLASS}>{field.hint}</span> : null}
            </label>
          )
        })}
      </div>
      <div className={ACTIONS_CLASS}>
        <Button type="submit" variant="active" disabled={saving}>
          {saveLabel}
        </Button>
        {error ? <span className={ERROR_CLASS}>{error}</span> : null}
      </div>
    </form>
  </section>
)

export default HeatingPanel
