import { useEffect, useState } from 'react'

/** Le temps qu'il fait maintenant : la température (°C), le code météo (WMO) et s'il fait jour. */
export interface Weather {
  temperature: number
  code: number
  isDay: boolean
}

/** La météo se relit à ce rythme (ms). */
export const WEATHER_REFRESH_MS = 15 * 60 * 1000

export const weatherUrl = (latitude: number, longitude: number): string =>
  `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,is_day&timezone=auto`

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
        .then((body: { current?: { temperature_2m?: number; weather_code?: number; is_day?: number } }) => {
          const current = body.current
          if (cancelled || typeof current?.temperature_2m !== 'number' || typeof current.weather_code !== 'number') return
          setWeather({ temperature: current.temperature_2m, code: current.weather_code, isDay: current.is_day !== 0 })
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
