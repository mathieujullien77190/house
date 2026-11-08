import Button from '../Button'
import Checkbox from '../Checkbox'
import SectionTitle from '../SectionTitle'
import SimpleTable from '../SimpleTable'
import {
  ACTIONS_CLASS,
  BOX_CLASS,
  EMPTY_CLASS,
  ERROR_CLASS,
  FIELD_CLASS,
  FIELDS_CLASS,
  FORM_CLASS,
  HINT_CLASS,
  INPUT_CLASS,
  INPUT_TYPES,
  LOG_TITLE_CLASS,
  NOTE_CLASS,
  STATUS_CLASS,
  TOTAL_CLASS,
} from './constants'
import type { HeatingPanelProps } from './types'

/** La règle du chauffage automatique : la case, les champs, « Enregistrer », ce que la règle ferait maintenant et le journal des activations. Les valeurs et l'envoi sont au parent. */
const HeatingPanel = ({ title, enabledLabel, enabled, onEnabledChange, fields, saveLabel, saving, onSave, error, status, note, logTitle, columns, rows, emptyText, total }: HeatingPanelProps) => (
  <section className={BOX_CLASS}>
    <SectionTitle text={title} />
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
    {status ? <p className={STATUS_CLASS}>{status}</p> : null}
    {note ? <p className={NOTE_CLASS}>{note}</p> : null}
    <h3 className={LOG_TITLE_CLASS}>{logTitle}</h3>
    {rows.length === 0 ? (
      <p className={EMPTY_CLASS}>{emptyText}</p>
    ) : (
      <>
        <SimpleTable
          columns={[columns.when, columns.origin, columns.duration, columns.temperature, columns.cost]}
          rows={rows.map((row) => [row.when, row.origin, row.duration, row.temperature, row.cost])}
          keys={rows.map((row) => row.id)}
        />
        {total ? (
          <p className={TOTAL_CLASS}>
            {total.label} {total.value}
          </p>
        ) : null}
      </>
    )}
  </section>
)

export default HeatingPanel
