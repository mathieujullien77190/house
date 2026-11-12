import AcUnitCard from '@/components/AcPanel/AcUnitCard'
import { useAcUnits } from '@/lib/useAcUnits'
import { LOADING_TEXT, UNKNOWN_TEXT, WRAP_CLASS, NOTE_CLASS, ON_BORDER_CLASS, OFF_BORDER_CLASS, UNKNOWN_BORDER_CLASS } from './constants'
import type { AcPreviewProps } from './types'

/**
 * L'aperçu d'une climatisation sur la carte (un clic sur son icône) : **le même bloc que dans l'onglet Clim** (nom, On / Off, état, mode, consigne, ventilateur, ailettes), avec la même lecture et les mêmes ordres
 * (`useAcUnits`, relue toutes les 10 s). Après un ordre, la réponse du module s'affiche tout de suite.
 */
const AcPreview = ({ apiKey, unitId }: AcPreviewProps) => {
  const { units, busy, failed, change } = useAcUnits(apiKey)
  const unit = units?.find((candidate) => candidate.id === unitId)
  return (
    <div className={`${WRAP_CLASS} ${unit ? (unit.power && unit.reachable ? ON_BORDER_CLASS : OFF_BORDER_CLASS) : UNKNOWN_BORDER_CLASS}`}>
      {unit ? (
        <AcUnitCard unit={unit} busy={busy === unitId} failed={failed === unitId} onChange={(patch) => change(unitId, patch)} />
      ) : (
        <span className={NOTE_CLASS}>{units === null ? LOADING_TEXT : UNKNOWN_TEXT}</span>
      )}
    </div>
  )
}

export default AcPreview
