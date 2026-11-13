import { useEffect, useState } from 'react'

/** Une heure de la prévision : l'heure locale (« 2026-11-10T00:00 »), la température (°C), le code météo (WMO), s'il fait jour, la probabilité de pluie (%) et le cumul (mm). */
export interface HourForecast {
  time: string
  temperature: number
  code: number
  isDay: boolean
  rainChance: number
  rain: number
  /** Vent à 10 m (km/h). */
  wind: number
}

/** Le temps qu'il fait maintenant : la température (°C), le code météo (WMO), s'il fait jour et le vent (km/h), puis la prévision des 24 prochaines heures. */
export interface Weather {
  temperature: number
  wind: number
  code: number
  isDay: boolean
  hours: HourForecast[]
}

/** Combien d'heures de prévision on garde. */
export const FORECAST_HOURS = 24

/** Les heures de la réponse d'Open-Meteo (des tableaux parallèles) rangées une par une ; une heure incomplète est laissée de côté. */
export const parseHours = (hourly: Record<string, unknown> | undefined): HourForecast[] => {
  const list = (key: string): unknown[] => (Array.isArray(hourly?.[key]) ? (hourly[key] as unknown[]) : [])
  const time = list('time')
  const temperature = list('temperature_2m')
  const code = list('weather_code')
  const isDay = list('is_day')
  const chance = list('precipitation_probability')
  const rain = list('precipitation')
  const wind = list('wind_speed_10m')
  const hours: HourForecast[] = []
  time.forEach((at, index) => {
    if (typeof at !== 'string' || typeof temperature[index] !== 'number' || typeof code[index] !== 'number') return
    hours.push({
      time: at,
      temperature: temperature[index],
      code: code[index],
      isDay: isDay[index] !== 0,
      rainChance: typeof chance[index] === 'number' ? chance[index] : 0,
      rain: typeof rain[index] === 'number' ? rain[index] : 0,
      wind: typeof wind[index] === 'number' ? wind[index] : 0,
    })
  })
  return hours
}

/** La météo se relit à ce rythme (ms). */
export const WEATHER_REFRESH_MS = 15 * 60 * 1000

export const weatherUrl = (latitude: number, longitude: number): string =>
  `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,is_day,wind_speed_10m&hourly=temperature_2m,weather_code,is_day,precipitation_probability,precipitation,wind_speed_10m&wind_speed_unit=kmh&forecast_hours=${FORECAST_HOURS}&timezone=auto`

/**
 * Le temps qu'il fait chez soi, lu **par le navigateur** sur Open-Meteo (sans clé, rien ne passe par le mini PC). Rien tant qu'on ne l'a pas lu, et la dernière valeur reste
 * si une relecture échoue (pas de réseau, service coupé).
 */
export const useWeather = (latitude: number, longitude: number): Weather | null => {
  const [weather, setWeather] = useState<Weather | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = () =>
      fetch(weatherUrl(latitude, longitude))
        .then((response) => (response.ok ? response.json() : Promise.reject(new Error(`HTTP ${response.status}`))))
        .then((body: { current?: { temperature_2m?: number; weather_code?: number; is_day?: number; wind_speed_10m?: number }; hourly?: Record<string, unknown> }) => {
          const current = body.current
          if (cancelled || typeof current?.temperature_2m !== 'number' || typeof current.weather_code !== 'number') return
          setWeather({ temperature: current.temperature_2m, wind: current.wind_speed_10m ?? 0, code: current.weather_code, isDay: current.is_day !== 0, hours: parseHours(body.hourly) })
        })
        .catch(() => undefined)
    load()
    const timer = setInterval(load, WEATHER_REFRESH_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [latitude, longitude])

  return weather
}
