/** Le signal WiFi en mots : -50 dBm et mieux très bon, -75 dBm et moins faible. */
export const signalText = (rssi: number): string => {
  const quality = rssi >= -60 ? 'bon' : rssi >= -70 ? 'moyen' : 'faible'
  return `${quality} (${rssi} dBm)`
}

/** Depuis combien de temps la prise est allumée, avec les secondes : « 3 min 25 s » ; au-delà d'une heure « 1 h 14 min 5 s », au-delà d'un jour « 2 j 3 h ». */
export const elapsedText = (seconds: number): string => {
  const total = Math.max(0, Math.round(seconds))
  const days = Math.floor(total / 86400)
  const hours = Math.floor((total % 86400) / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const rest = total % 60
  if (days > 0) return `${days} j ${hours} h`
  if (hours > 0) return `${hours} h ${minutes} min ${rest} s`
  if (minutes > 0) return `${minutes} min ${rest} s`
  return `${rest} s`
}
/** Le décompte avant l'extinction, en minutes et secondes (« 12 min 34 s »), en secondes seules sous la minute. */
export const countdownText = (seconds: number): string => {
  const total = Math.max(0, Math.round(seconds))
  const minutes = Math.floor(total / 60)
  return minutes > 0 ? `${minutes} min ${total % 60} s` : `${total} s`
}
