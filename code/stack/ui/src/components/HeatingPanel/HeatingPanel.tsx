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
} from './constants'
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
        {fields.map((field) => (
          <label key={field.id} className={compact ? FIELD_COMPACT_CLASS : FIELD_CLASS}>
            {field.label}
            <input
              type={INPUT_TYPES[field.kind].type}
              inputMode={INPUT_TYPES[field.kind].inputMode}
              className={compact ? INPUT_COMPACT_CLASS : INPUT_CLASS}
              value={field.value}
              onChange={(event) => field.onChange(event.target.value)}
            />
            {field.hint ? <span className={compact ? HINT_COMPACT_CLASS : HINT_CLASS}>{field.hint}</span> : null}
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
