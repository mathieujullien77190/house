import { Notice, SectionTitle } from '@house/ui'
import { failureOf, useShutters } from '@/lib/useShutters'
import { BOX_CLASS, LIST_CLASS, LOADING_TEXT, MOCK_TEXT, NOT_CONFIGURED_TEXT, TITLE, UNAVAILABLE_TEXT } from './constants'
import ShutterCard from './ShutterCard'
import type { ShuttersPanelProps } from './types'

/** L'onglet Volet : un bloc par volet roulant avec Monter, Stop et Descendre. Sens unique (Somfy RTS) : on affiche le dernier ordre, jamais une position. La lecture et les ordres sont ceux de `useShutters`, les mêmes que l'aperçu de la carte. */
const ShuttersPanel = ({ apiKey }: ShuttersPanelProps) => {
  const { state, problem, busy, failed, send, half, changeAuto } = useShutters(apiKey)
  return (
    <section className={BOX_CLASS}>
      <SectionTitle text={TITLE} />
      {problem === 'loading' ? <Notice text={LOADING_TEXT} /> : null}
      {problem === 'none' ? <Notice text={NOT_CONFIGURED_TEXT} /> : null}
      {problem === 'off' ? <Notice text={UNAVAILABLE_TEXT} /> : null}
      {state && problem === null ? (
        <>
          {state.mock ? <Notice text={MOCK_TEXT} /> : null}
          <div className={LIST_CLASS}>
            {state.shutters.map((shutter) => (
              <ShutterCard
                key={shutter.id}
                shutter={shutter}
                busy={busy === shutter.id}
                failed={failureOf(failed, shutter.id)}
                onSend={(command) => send(shutter.id, command)}
                onHalf={() => half(shutter.id)}
                onAuto={(option, value) => changeAuto(shutter.id, option, value)}
              />
            ))}
          </div>
        </>
      ) : null}
    </section>
  )
}

export default ShuttersPanel
