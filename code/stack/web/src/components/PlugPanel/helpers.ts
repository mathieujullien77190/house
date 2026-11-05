/** Le signal WiFi en mots : -50 dBm et mieux très bon, -75 dBm et moins faible. */
export const signalText = (rssi: number): string => {
  const quality = rssi >= -60 ? 'bon' : rssi >= -70 ? 'moyen' : 'faible'
  return `${quality} (${rssi} dBm)`
}

/** Une durée en secondes, en jours, heures et minutes. */
export const durationText = (seconds: number): string => {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (days > 0) return `${days} j ${hours} h`
  if (hours > 0) return `${hours} h ${minutes} min`
  return `${minutes} min`
}
