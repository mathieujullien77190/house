// La pluie, pour le mode pluie des caméras : House Sync lit le temps qu'il fait chez soi sur Open-Meteo (sans clé) toutes les 10 minutes
// et en tire un niveau : aucune pluie, pluie, ou pluie forte. Si la lecture échoue, le dernier niveau reste.
import { messageOf, type Context } from './context.ts'

export type WeatherRain = 'none' | 'rain' | 'heavy'

/** On relit la météo à ce rythme (ms). */
export const WEATHER_POLL_MS = 10 * 60 * 1000

/** En dessous, une goutte ne compte pas. */
const RAIN_MILLIMETRES = 0.1

/**
 * Le niveau de pluie d'après le code météo (WMO, celui d'Open-Meteo, le même que dans la WebApp) et le cumul de l'heure (mm) : bruine (51 à 57), pluie (61 à 67), averses (80 à 82)
 * et orage (95 à 99) sont de la pluie, de même qu'un cumul d'au moins 0,1 mm ; forte pluie (65, 67), fortes averses (82) et orage sont de la pluie forte (le cumul n'y change rien :
 * 61 reste une pluie faible). La neige n'en est pas.
 */
export const rainLevelOf = (code: number, millimetres: number): WeatherRain => {
  if (code === 65 || code === 67 || code === 82 || (code >= 95 && code <= 99)) return 'heavy'
  const rain = (code >= 51 && code <= 57) || (code >= 61 && code <= 67) || (code >= 80 && code <= 82) || millimetres >= RAIN_MILLIMETRES
  return rain ? 'rain' : 'none'
}

export const weatherUrl = (latitude: number, longitude: number): string =>
  `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=weather_code,precipitation&timezone=auto`

const RAIN_TEXT: Record<WeatherRain, string> = { none: 'plus de pluie', rain: 'pluie', heavy: 'pluie forte' }

export const createWeather = (ctx: Context) => {
  const { config, settings } = ctx
  let last: WeatherRain = 'none'
  return {
    /** Lit la météo et donne le niveau de pluie aux réglages (qui en tirent le niveau de pluie de chaque caméra dont le mode pluie est allumé). */
    poll: async (): Promise<WeatherRain> => {
      try {
        const res = await ctx.fetch(weatherUrl(config.housePosition.latitude, config.housePosition.longitude), { signal: AbortSignal.timeout(10_000) })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const body = (await res.json()) as { current?: { weather_code?: number; precipitation?: number } }
        const code = body.current?.weather_code
        if (typeof code !== 'number') throw new Error('réponse inattendue')
        const level = rainLevelOf(code, typeof body.current?.precipitation === 'number' ? body.current.precipitation : 0)
        if (level !== last) ctx.log(`Météo : ${RAIN_TEXT[level]}`)
        last = level
        settings.setWeatherRain(level)
      } catch (error) {
        ctx.log(`Météo : ${messageOf(error)}`)
      }
      return last
    },
  }
}
