// Les durées réelles des clips (lues dans leur vidéo), gardées par identifiant d'événement : l'API ne les donne pas, et le clip déborde
// de l'événement (marges et segments). `describeEvent` s'en sert partout où un événement est décrit.
const durations = new Map<string, number>()

export const rememberClipDuration = (id: string, seconds: number): void => {
  if (Number.isFinite(seconds) && seconds > 0) durations.set(id, seconds)
}

export const clipDurationOf = (id: string): number | null => durations.get(id) ?? null
