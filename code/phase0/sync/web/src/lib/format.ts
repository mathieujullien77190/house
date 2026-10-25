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

/** Un horodatage de l'enregistreur (secondes) en date lisible. */
export const formatSeconds = (seconds: number): string => formatDateMs(seconds * 1000)
