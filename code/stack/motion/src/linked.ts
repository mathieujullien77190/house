// Les caméras liées : quand l'une voit un mouvement, les autres du groupe ont aussi un événement (donc un clip) sur la même
// durée. Un événement d'une caméra est ouvert tant que sa propre détection voit du mouvement ou qu'une caméra liée en voit.

/** Les caméras liées à celle-ci (les autres du groupe), ou aucune si elle n'en fait pas partie. */
export const mirrorsOf = (camera: string, linked: string[]): string[] => (linked.includes(camera) ? linked.filter((other) => other !== camera) : [])

/**
 * La caméra doit-elle avoir un événement ouvert ? Oui si son propre mouvement est en cours ; sinon, si une caméra liée en voit
 * et que la détection de celle-ci n'est pas éteinte (éteinte par House Sync : clips non gardés, le lien suit ce réglage).
 */
export const wantsEvent = (camera: string, active: ReadonlySet<string>, linked: string[], detecting: ReadonlyMap<string, boolean>): boolean =>
  active.has(camera) || (detecting.get(camera) !== false && mirrorsOf(camera, linked).some((other) => active.has(other)))
