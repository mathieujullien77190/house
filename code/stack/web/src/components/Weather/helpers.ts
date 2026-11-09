/** Un petit dessin (emoji) et un mot pour un code météo WMO (celui d'Open-Meteo) ; la nuit, le ciel dégagé est une lune. */
export const describeWeather = (code: number, isDay: boolean): { icon: string; label: string } => {
  if (code === 0) return isDay ? { icon: '☀️', label: 'Ensoleillé' } : { icon: '🌙', label: 'Ciel dégagé' }
  if (code === 1 || code === 2) return isDay ? { icon: '⛅', label: 'Éclaircies' } : { icon: '☁️', label: 'Nuageux' }
  if (code === 3) return { icon: '☁️', label: 'Couvert' }
  if (code === 45 || code === 48) return { icon: '🌫️', label: 'Brouillard' }
  if (code >= 51 && code <= 57) return { icon: '🌦️', label: 'Bruine' }
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return { icon: '🌧️', label: 'Pluie' }
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { icon: '❄️', label: 'Neige' }
  if (code >= 95) return { icon: '⛈️', label: 'Orage' }
  return { icon: '☁️', label: 'Nuageux' }
}
