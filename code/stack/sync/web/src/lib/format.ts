const UNITS = ['o', 'Ko', 'Mo', 'Go']

export const formatSize = (bytes: number): string => {
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${unit === 0 ? value : value.toFixed(1)} ${UNITS[unit]}`
}

export const formatDateMs = (ms: number): string => new Date(ms).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'medium' })

/** Un horodatage de l'enregistreur (secondes) en deux textes : le jour, puis l'heure. */
export const splitSeconds = (seconds: number): { date: string; time: string } => splitMs(seconds * 1000)

/** Un instant (millisecondes) en deux textes : le jour, puis l'heure. */
export const splitMs = (ms: number): { date: string; time: string } => {
  const date = new Date(ms)
  return { date: date.toLocaleDateString('fr-FR', { dateStyle: 'short' }), time: date.toLocaleTimeString('fr-FR', { timeStyle: 'medium' }) }
}
