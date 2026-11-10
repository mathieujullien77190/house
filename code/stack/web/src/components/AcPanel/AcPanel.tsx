import { Notice, SectionTitle } from '@house/ui'
import { useAcUnits } from '@/lib/useAcUnits'
import AcUnitCard from './AcUnitCard'
import { BOX_CLASS, LIST_CLASS, LOADING_TEXT, NOT_CONFIGURED_TEXT, TITLE, UNAVAILABLE_TEXT } from './constants'
import type { AcPanelProps } from './types'

/** L'onglet Clim : un bloc par climatisation Mitsubishi, avec Allumer / Éteindre, le mode, la consigne (− / +), le ventilateur et les ailettes. La lecture et les ordres sont ceux de `useAcUnits`, les mêmes que l'aperçu de la carte. */
const AcPanel = ({ apiKey }: AcPanelProps) => {
  const { units, problem, busy, failed, change } = useAcUnits(apiKey)
  return (
    <section className={BOX_CLASS}>
      <SectionTitle text={TITLE} />
      {problem === 'loading' ? <Notice text={LOADING_TEXT} /> : null}
      {problem === 'none' ? <Notice text={NOT_CONFIGURED_TEXT} /> : null}
      {problem === 'off' ? <Notice text={UNAVAILABLE_TEXT} /> : null}
      {units && problem === null ? (
        <div className={LIST_CLASS}>
          {units.map((unit) => (
            <AcUnitCard
              key={unit.id}
              unit={unit}
              busy={busy === unit.id}
              failed={failed === unit.id}
              onChange={(patch) => change(unit.id, patch)}
            />
          ))}
        </div>
      ) : null}
    </section>
  )
}

export default AcPanel
