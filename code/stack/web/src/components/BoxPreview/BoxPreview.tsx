import BoxBlock from '@/components/BoxPanel/BoxBlock'
import { useBox } from '@/lib/useBox'
import { LOADING_TEXT, NOTE_CLASS, NOT_CONFIGURED_TEXT, UNAVAILABLE_TEXT } from './constants'
import type { BoxPreviewProps } from './types'

/**
 * L'aperçu de la box sur la carte (un clic sur son icône) : **le même bloc que dans l'onglet Box** (WiFi On / Off, ligne, appareils connectés), avec la même lecture (`useBox`, toutes les 12 s).
 * Le liseré est rouge quand la box ne répond pas.
 */
const BoxPreview = ({ apiKey }: BoxPreviewProps) => {
  const { box, problem, busy, failed, setWifi } = useBox(apiKey)
  return (
    <>
      {box?.configured ? (
        <BoxBlock box={box} busy={busy} failed={failed} compact onWifi={setWifi} />
      ) : (
        <span className={NOTE_CLASS}>{box ? NOT_CONFIGURED_TEXT : problem === 'off' ? UNAVAILABLE_TEXT : LOADING_TEXT}</span>
      )}
    </>
  )
}

export default BoxPreview
