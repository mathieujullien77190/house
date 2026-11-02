import {
  BADGE_CLASS,
  BODY_CLASS,
  BUSY_TEXT,
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
  STATUS_KO_CLASS,
  STATUS_OK_CLASS,
} from './constants'
import { isOk, serviceClass } from './helpers'
import type { ApiExplorerProps } from './types'

/** La liste des services d'une API et la réponse de celui qu'on a appelé ; l'appel est au parent. */
const ApiExplorer = ({ services, selected, busy, result, note, onCall }: ApiExplorerProps) => {
  return (
    <div>
      <p className={INTRO_CLASS}>{INTRO}</p>
      <div className={LAYOUT_CLASS}>
        <div>
          <ul className={LIST_CLASS}>
            {services.map((service) => (
              <li key={service.path}>
                <button type="button" className={serviceClass(service.path === selected)} onClick={() => onCall(service.path)}>
                  <span className={PATH_CLASS}>GET {service.path}</span>
                  {service.secured ? <span className={BADGE_CLASS}>{KEY_BADGE}</span> : null}
                  <div className={DESCRIPTION_CLASS}>{service.description}</div>
                </button>
              </li>
            ))}
          </ul>
          {note ? <p className={NOTE_CLASS}>{note}</p> : null}
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

export default ApiExplorer
