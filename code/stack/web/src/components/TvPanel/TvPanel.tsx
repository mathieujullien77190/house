import { Button, Notice, SectionTitle, StatusFrame } from '@house/ui'
import type { TvKey } from '@/types'
import { useTv } from '@/lib/useTv'
import {
  CHANNELS,
  CHANNEL_DIGIT_MS,
  KEY_CLASS,
  KEY_TEXT_CLASS,
  BACK_LABEL,
  BACK_TEXT,
  DIGIT_KEYS,
  EMPTY_CLASS,
  ERROR_CLASS,
  GRID1_CLASS,
  GRID2_CLASS,
  GRID3_CLASS,
  GROUP_CLASS,
  GROUP_LABEL_CLASS,
  LOADING_TEXT,
  NOTE_CLASS,
  NOT_CONFIGURED_NOTE,
  NOT_CONFIGURED_TITLE,
  PAD_KEYS,
  PANEL_CLASS,
  STOP_KEYS,
  TOP_KEYS,
  PROGRAM_KEYS,
  PROGRAM_LABEL,
  REMOTE_CLASS,
  TITLE,
  UNAVAILABLE_TEXT,
  VOLUME_KEYS,
  VOLUME_LABEL,
  ZERO_ROW,
  type KeySpec,
} from './constants'
import Pairing from './Pairing'
import RemoteKey from './RemoteKey'
import type { TvPanelProps } from './types'

/**
 * L'onglet Box TV : l'état du Freebox Player (d'après la box, relu toutes les 10 s) et sa télécommande réseau, d'abord pour le téléphone : une colonne de 24 rem au plus, grosses touches.
 * Tant que le Player n'est pas associé, le parcours d'association (code affiché sur la TV) prend la place de la télécommande. Lecture, envoi et association sont ceux de `useTv`.
 */
const TvPanel = ({ apiKey, onBack }: TvPanelProps) => {
  const { tv, problem, error, send, pairPhase, pairError, startPairing, submitCode } = useTv(apiKey)
  const keys = (specs: (KeySpec | null)[]) =>
    specs.map((spec, index) =>
      spec ? (
        <RemoteKey
          key={spec.id}
          keyId={spec.id}
          label={spec.label}
          ariaLabel={spec.aria}
          onSend={send}
          variant={spec.id === 'power' ? 'danger' : 'default'}
        />
      ) : (
        <span key={index} className={EMPTY_CLASS} />
      ),
    )

  // Une chaîne : ses chiffres partent l'un après l'autre.
  const tune = (number: string) => {
    number.split('').forEach((digit, index) => setTimeout(() => send(digit as TvKey, false), index * CHANNEL_DIGIT_MS))
  }

  // Sur téléphone, « Retour » est une touche comme les autres, dans la première rangée avec marche/arrêt et muet.
  const backKey = onBack ? (
    <Button className={KEY_CLASS} aria-label={BACK_LABEL} onClick={onBack}>
      <span className={KEY_TEXT_CLASS}>{BACK_TEXT}</span>
    </Button>
  ) : null

  return (
    <section className={PANEL_CLASS}>
      {onBack ? null : <SectionTitle text={TITLE} />}
      {onBack && !tv ? backKey : null}
      {problem === 'loading' ? <Notice text={LOADING_TEXT} /> : null}
      {problem === 'off' ? <Notice text={UNAVAILABLE_TEXT} /> : null}
      {tv && !tv.configured ? (
        <StatusFrame tone="ok">
          <div className={REMOTE_CLASS}>
            {backKey}
            <strong>{NOT_CONFIGURED_TITLE}</strong>
            <p className={NOTE_CLASS}>{NOT_CONFIGURED_NOTE}</p>
          </div>
        </StatusFrame>
      ) : null}
      {tv?.configured && !tv.paired ? (
        <StatusFrame tone="ok">
          <div className={REMOTE_CLASS}>
            {backKey}
            <Pairing phase={pairPhase} error={pairError} onStart={startPairing} onSubmit={submitCode} />
          </div>
        </StatusFrame>
      ) : null}
      {tv?.configured && tv.paired ? (
        <StatusFrame tone="ok">
          <div className={REMOTE_CLASS}>
            <div className={onBack ? GRID2_CLASS : GRID1_CLASS}>
              {keys(STOP_KEYS)}
              {backKey}
            </div>
            <div className={GRID3_CLASS}>{keys(TOP_KEYS)}</div>
            <div className={GRID2_CLASS}>
              <div className={GROUP_CLASS}>
                <span className={GROUP_LABEL_CLASS}>{VOLUME_LABEL}</span>
                {keys(VOLUME_KEYS)}
              </div>
              <div className={GROUP_CLASS}>
                <span className={GROUP_LABEL_CLASS}>{PROGRAM_LABEL}</span>
                {keys(PROGRAM_KEYS)}
              </div>
            </div>
            <div className={GRID3_CLASS}>{keys(PAD_KEYS)}</div>
            <div className={GRID3_CLASS}>{keys([...DIGIT_KEYS, ...ZERO_ROW])}</div>
            <div className={GRID3_CLASS}>
              {CHANNELS.map((channel) => (
                <Button
                  key={channel.label}
                  className={KEY_CLASS}
                  aria-label={`${channel.label} (chaîne ${channel.number})`}
                  onClick={() => tune(channel.number)}
                >
                  <span className={KEY_TEXT_CLASS}>{channel.label}</span>
                </Button>
              ))}
            </div>
            {error ? (
              <p className={ERROR_CLASS} role="alert">
                {error}
              </p>
            ) : null}
          </div>
        </StatusFrame>
      ) : null}
    </section>
  )
}

export default TvPanel
