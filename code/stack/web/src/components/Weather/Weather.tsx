import { useWeather } from '@/lib/useWeather'
import { CLASS, HOUSE_LATITUDE, HOUSE_LONGITUDE, HOUSE_PLACE, ICON_CLASS, PLACE_CLASS, TEMPERATURE_CLASS } from './constants'
import { describeWeather } from './helpers'

/**
 * Le temps qu'il fait chez soi, dans la barre du haut : un petit dessin (soleil, nuage, pluie…) et la température. Lu par le navigateur sur Open-Meteo
 * (`lib/useWeather.ts`) ; rien ne s'affiche tant qu'on ne l'a pas lu.
 */
const Weather = () => {
  const weather = useWeather(HOUSE_LATITUDE, HOUSE_LONGITUDE)
  if (!weather) return null
  const { icon, label } = describeWeather(weather.code, weather.isDay)
  const degrees = Math.round(weather.temperature)
  return (
    <span
      className={CLASS}
      title={`${HOUSE_PLACE} : ${label}, ${degrees} °C`}
      role="img"
      aria-label={`${HOUSE_PLACE} : ${label}, ${degrees} degrés`}
    >
      <span className={ICON_CLASS} aria-hidden="true">
        {icon}
      </span>
      <span className={TEMPERATURE_CLASS} aria-hidden="true">
        {degrees}°
      </span>
      <span className={PLACE_CLASS} aria-hidden="true">
        {HOUSE_PLACE}
      </span>
    </span>
  )
}

export default Weather
