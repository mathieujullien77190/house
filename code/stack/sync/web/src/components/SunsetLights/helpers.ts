/** La prochaine heure prévue, à l'heure de la maison (« mercredi 18 nov. à 17:12 ») ; null sans heure (l'heure de l'allumage du jour, déjà passée mais dans le rattrapage, s'affiche telle quelle). */
export const nextRunText = (iso: string | null): string | null => {
  if (iso === null) return null
  return new Date(iso).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' }).replace(',', ' à')
}

/** Le décalage en texte : « au coucher », « 10 min après », « 10 min avant ». */
export const offsetText = (minutes: number): string => (minutes === 0 ? 'au coucher du soleil' : minutes > 0 ? `${minutes} min après le coucher` : `${-minutes} min avant le coucher`)
