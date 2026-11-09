import { LampDot, PlugSquare, ValueChips } from '@house/ui'
import IndicatorHint from '@/components/IndicatorHint'
import { RAIN_CHIP, RAIN_HINT, ROW_CLASS } from './constants'
import { lampHint, lampLabel, plugHint, plugLabel, temperatureHint } from './helpers'
import type { CameraIndicatorsProps } from './types'

/** Ce qui se pose sur la vidéo d'une caméra : ses températures, le rond de sa lampe (orange allumée, gris éteinte, contour rouge pâle injoignable) et le dessin du mode pluie (🌧️ pluie, ☔ pluie forte, quand la météo le dit et que le mode est allumé dans House Sync) et le carré de sa prise (vert allumée, rouge éteinte). */
const CameraIndicators = ({ temperatures, lamp, plug, rain = 'off' }: CameraIndicatorsProps) => (
  <div className={ROW_CLASS}>
    {rain === 'off' ? null : (
      <IndicatorHint text={RAIN_HINT[rain]}>
        <ValueChips values={[RAIN_CHIP[rain]]} />
      </IndicatorHint>
    )}
    {temperatures.length > 0 ? (
      <IndicatorHint text={temperatureHint(temperatures)}>
        <ValueChips values={temperatures} />
      </IndicatorHint>
    ) : null}
    {lamp ? (
      <IndicatorHint text={lampHint(lamp)}>
        <LampDot on={lamp.on} reachable={lamp.reachable} brightness={lamp.bri} label={lampLabel(lamp)} />
      </IndicatorHint>
    ) : null}
    {plug ? (
      <IndicatorHint text={plugHint(plug)}>
        <PlugSquare on={plug.on} label={plugLabel(plug)} />
      </IndicatorHint>
    ) : null}
  </div>
)

export default CameraIndicators
