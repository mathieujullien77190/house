import { Button, Collapsible } from '@house/ui'
import {
  COMMANDS,
  ERROR_CLASS,
  FIELDS,
  FIELD_CLASS,
  GRID_CLASS,
  INPUT_CLASS,
  LABEL_CLASS,
  NAME_CLASS,
  ORIGIN_LABEL,
  ORDER_CLASS,
  SAVE_ERROR_TEXT,
  SHUTTERS,
  TEST_CELL_CLASS,
  TEST_ERROR_TEXT,
  TEST_LABEL,
  URL_INPUT_CLASS,
  URL_LABEL,
} from './constants'
import type { ServosSettingsUIProps } from './types'

const ServosSettingsUI = ({ settings, drafts, failed, testing, testFailed, onDraft, onCommit, onTest, onOrigin }: ServosSettingsUIProps) => (
  <div>
    {failed ? <span className={ERROR_CLASS}>{SAVE_ERROR_TEXT}</span> : null}
    <div className={ORDER_CLASS}>
      <label className={FIELD_CLASS}>
        <span className={LABEL_CLASS}>{URL_LABEL}</span>
        <input
          type="url"
          className={URL_INPUT_CLASS}
          value={drafts.url ?? settings.url}
          onChange={(event) => onDraft('url', event.target.value)}
          onBlur={() => onCommit('url')}
          onKeyDown={(event) => (event.key === 'Enter' ? onCommit('url') : undefined)}
        />
      </label>
    </div>
    {SHUTTERS.map((shutter) => (
      <Collapsible key={shutter.id} title={shutter.label}>
    {COMMANDS.map((command) => (
      <div key={command.id} className={ORDER_CLASS}>
        <span className={NAME_CLASS}>{command.label}</span>
        <div className={GRID_CLASS}>
          {FIELDS.map((field) => {
            const key = `${shutter.id}.${command.id}.${field.id}`
            return (
              <label key={field.id} className={FIELD_CLASS}>
                <span className={LABEL_CLASS}>{field.label}</span>
                <input
                  type="number"
                  className={INPUT_CLASS}
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  aria-label={`${shutter.label} · ${command.label} · ${field.label}`}
                  value={drafts[key] ?? String(settings.shutters[shutter.id][command.id][field.id])}
                  onChange={(event) => onDraft(key, event.target.value)}
                  onBlur={() => onCommit(key)}
                  onKeyDown={(event) => (event.key === 'Enter' ? onCommit(key) : undefined)}
                />
              </label>
            )
          })}
          <div className={TEST_CELL_CLASS}>
            <Button disabled={testing === `${shutter.id}.${command.id}`} onClick={() => onTest(shutter.id, command.id)}>
              {TEST_LABEL}
            </Button>
            <Button disabled={testing === `${shutter.id}.${command.id}`} onClick={() => onOrigin(shutter.id, command.id)}>
              {ORIGIN_LABEL}
            </Button>
          </div>
        </div>
        {testFailed === `${shutter.id}.${command.id}` ? <span className={ERROR_CLASS}>{TEST_ERROR_TEXT}</span> : null}
      </div>
    ))}
      </Collapsible>
    ))}
  </div>
)

export default ServosSettingsUI
