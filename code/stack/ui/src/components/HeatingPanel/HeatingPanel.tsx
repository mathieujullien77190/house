import Button from '../Button'
import Checkbox from '../Checkbox'
import {
  ACTIONS_CLASS,
  BOX_CLASS,
  ERROR_CLASS,
  FIELD_CLASS,
  FIELDS_CLASS,
  FORM_CLASS,
  HINT_CLASS,
  INPUT_CLASS,
  INPUT_TYPES,
} from './constants'
import type { HeatingPanelProps } from './types'

/** La règle du chauffage automatique : la case, les champs, « Enregistrer ». Les valeurs et l'envoi sont au parent. */
const HeatingPanel = ({ enabledLabel, enabled, onEnabledChange, fields, saveLabel, saving, onSave, error }: HeatingPanelProps) => (
  <section className={BOX_CLASS}>
    <form
      className={FORM_CLASS}
      onSubmit={(event) => {
        event.preventDefault()
        onSave()
      }}
    >
      <Checkbox label={enabledLabel} checked={enabled} onChange={onEnabledChange} />
      <div className={FIELDS_CLASS}>
        {fields.map((field) => (
          <label key={field.id} className={FIELD_CLASS}>
            {field.label}
            <input
              type={INPUT_TYPES[field.kind].type}
              inputMode={INPUT_TYPES[field.kind].inputMode}
              className={INPUT_CLASS}
              value={field.value}
              onChange={(event) => field.onChange(event.target.value)}
            />
            {field.hint ? <span className={HINT_CLASS}>{field.hint}</span> : null}
          </label>
        ))}
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
