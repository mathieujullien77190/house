import { RiLightbulbFill } from 'react-icons/ri'
import { LuHeater } from 'react-icons/lu'
import { ValueChips } from '@house/ui'
import MapIcon from '@/components/MapIcon'
import IndicatorHint from '@/components/IndicatorHint'
import { EYES_CHIP, EYES_HINT, RAIN_CHIP, RAIN_HINT, ROW_CLASS } from './constants'
import { lampColor, lampHint, lampLabel, plugHint, plugLabel, temperatureHint } from './helpers'
import type { CameraIndicatorsProps } from './types'

/** Ce qui se pose sur la vidéo d'une caméra : ses températures, le rond de sa lampe (le même que sur la carte : fond blanc, bordure noire, ampoule orange allumée, grise éteinte, rouge injoignable) et le dessin du mode pluie et l'œil de la recherche des yeux qui brillent (🌧️ pluie, ☔ pluie forte, quand la météo le dit et que le mode est allumé dans House Sync) et le rond de son chauffage (le même que sur la carte, avec sa pastille verte allumé, rouge éteint). */
const CameraIndicators = ({ temperatures, lamp, plug, rain = 'off', eyes = false }: CameraIndicatorsProps) => (
  <div className={ROW_CLASS}>
    {rain === 'off' ? null : (
      <IndicatorHint text={RAIN_HINT[rain]}>
        <ValueChips values={[RAIN_CHIP[rain]]} />
      </IndicatorHint>
    )}
    {eyes ? (
      <IndicatorHint text={EYES_HINT}>
        <ValueChips values={[EYES_CHIP]} />
      </IndicatorHint>
    ) : null}
    {temperatures.length > 0 ? (
      <IndicatorHint text={temperatureHint(temperatures)}>
        <ValueChips values={temperatures} />
      </IndicatorHint>
    ) : null}
    {lamp ? (
      <IndicatorHint text={lampHint(lamp)}>
        <MapIcon label={lampLabel(lamp)} color={lampColor(lamp)}>
          <RiLightbulbFill aria-hidden="true" />
        </MapIcon>
      </IndicatorHint>
    ) : null}
    {plug ? (
      <IndicatorHint text={plugHint(plug)}>
        <MapIcon label={plugLabel(plug)} dot={plug.on ? 'var(--color-green)' : 'var(--color-danger)'}>
          <LuHeater aria-hidden="true" />
        </MapIcon>
      </IndicatorHint>
    ) : null}
  </div>
)

export default CameraIndicators
