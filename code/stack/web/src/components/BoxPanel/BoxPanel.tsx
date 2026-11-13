import { Notice, SectionTitle } from '@house/ui'
import GuestWifi from '@/components/GuestWifi'
import { useBox } from '@/lib/useBox'
import { useBoxGuests } from '@/lib/useBoxGuests'
import BoxBlock from './BoxBlock'
import GuestsBlock from './GuestsBlock'
import { BOX_CLASS, LOADING_TEXT, NOT_CONFIGURED_TEXT, TITLE, UNAVAILABLE_TEXT } from './constants'
import type { BoxPanelProps } from './types'

/** L'onglet Box : la Freebox (ligne, interrupteur du WiFi, appareils connectés), relue toutes les 12 s. Lecture et ordre sont ceux de `useBox`, les mêmes que l'aperçu de la carte. */
const BoxPanel = ({ apiKey }: BoxPanelProps) => {
  const { box, problem, busy, failed, setWifi } = useBox(apiKey)
  const { guests, busy: guestBusy, error: guestError, setExcluded } = useBoxGuests(apiKey, box?.configured === true)
  return (
    <section className={BOX_CLASS}>
      <SectionTitle text={TITLE} />
      {problem === 'loading' ? <Notice text={LOADING_TEXT} /> : null}
      {problem === 'off' ? <Notice text={UNAVAILABLE_TEXT} /> : null}
      {box && !box.configured ? <Notice text={NOT_CONFIGURED_TEXT} /> : null}
      {box?.configured ? <BoxBlock box={box} busy={busy} failed={failed} onWifi={setWifi} wifiExtra={<GuestWifi apiKey={apiKey} />} /> : null}
      {box?.configured && guests ? <GuestsBlock guests={guests} busy={guestBusy} error={guestError} onExclude={setExcluded} /> : null}
    </section>
  )
}

export default BoxPanel
