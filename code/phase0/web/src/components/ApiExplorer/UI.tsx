import {
  BADGE_CLASS,
  BODY_CLASS,
  BUSY_TEXT,
  CLIPS_NOTE,
  DESCRIPTION_CLASS,
  EMPTY_CLASS,
  EMPTY_TEXT,
  INTRO,
  INTRO_CLASS,
  KEY_BADGE,
  LAYOUT_CLASS,
  LIST_CLASS,
  NOTE_CLASS,
  PATH_CLASS,
  RESULT_CLASS,
  RESULT_HEAD_CLASS,
  RESULT_TITLE,
  SERVICE_ACTIVE_CLASS,
  SERVICE_CLASS,
  SERVICE_IDLE_CLASS,
  STATUS_KO_CLASS,
  STATUS_OK_CLASS,
} from './constants'
import { isOk } from './helpers'
import type { ApiExplorerUIProps } from './types'

const ApiExplorerUI = ({ services, selected, busy, result, onCall }: ApiExplorerUIProps) => {
  return (
    <div>
      <p className={INTRO_CLASS}>{INTRO}</p>
      <div className={LAYOUT_CLASS}>
        <div>
          <ul className={LIST_CLASS}>
            {services.map((service) => (
              <li key={service.path}>
                <button
                  type="button"
                  className={`${SERVICE_CLASS} ${service.path === selected ? SERVICE_ACTIVE_CLASS : SERVICE_IDLE_CLASS}`}
                  onClick={() => onCall(service.path)}
                >
                  <span className={PATH_CLASS}>GET {service.path}</span>
                  {service.secured ? <span className={BADGE_CLASS}>{KEY_BADGE}</span> : null}
                  <div className={DESCRIPTION_CLASS}>{service.description}</div>
                </button>
              </li>
            ))}
          </ul>
          <p className={NOTE_CLASS}>{CLIPS_NOTE}</p>
        </div>
        <div className={RESULT_CLASS}>
          {result ? (
            <>
              <div className={RESULT_HEAD_CLASS}>
                <span>
                  {RESULT_TITLE} · <span className={PATH_CLASS}>{result.path}</span>
                </span>
                <span className={isOk(result.status) ? STATUS_OK_CLASS : STATUS_KO_CLASS}>HTTP {result.status}</span>
              </div>
              <pre className={BODY_CLASS}>{result.body}</pre>
            </>
          ) : (
            <p className={EMPTY_CLASS}>{busy ? BUSY_TEXT : EMPTY_TEXT}</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default ApiExplorerUI
