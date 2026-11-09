/** Un petit dessin (emoji) et un mot pour un code météo WMO (celui d'Open-Meteo) ; la nuit, le ciel dégagé est une lune. */
export const describeWeather = (code: number, isDay: boolean): { icon: string; label: string } => {
  if (code === 0) return isDay ? { icon: '☀️', label: 'Ensoleillé' } : { icon: '🌙', label: 'Ciel dégagé' }
  if (code === 1 || code === 2) return isDay ? { icon: '⛅', label: 'Éclaircies' } : { icon: '☁️', label: 'Nuageux' }
  if (code === 3) return { icon: '☁️', label: 'Couvert' }
  if (code === 45 || code === 48) return { icon: '🌫️', label: 'Brouillard' }
  if (code >= 51 && code <= 57) return { icon: '💧', label: 'Bruine' }
  if (code === 61 || code === 80) return { icon: '🌦️', label: 'Pluie faible' }
  if (code === 65 || code === 82) return { icon: '☔', label: 'Forte pluie' }
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return { icon: '🌧️', label: 'Pluie' }
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { icon: '❄️', label: 'Neige' }
  if (code >= 95) return { icon: '⛈️', label: 'Orage' }
  return { icon: '☁️', label: 'Nuageux' }
}

/** L'heure d'une prévision (« 2026-11-10T14:00 ») : « 14 h » ; à minuit, le jour d'abord (« mar. 0 h »). */
export const hourLabel = (time: string): string => {
  const hour = Number(time.slice(11, 13))
  if (hour !== 0) return `${hour} h`
  const day = new Date(`${time.slice(0, 10)}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'short' })
  return `${day} 0 h`
}

/** La chance de pluie d'une heure : « 70 % ». */
export const rainText = (chance: number): string => `${Math.round(chance)} %`
