/** L'adresse de l'aperçu : la page « Chez Matou » de la **même origine** que la WebApp (avec la clé de l'adresse reçue), pour que le cadre marche quel que soit le nom par lequel on a ouvert la WebApp. Null sans adresse. */
export const previewOf = (url: string | null, origin: string): string | null => {
  if (!url) return null
  try {
    const { search } = new URL(url)
    return `${origin}/chezmatou${search}`
  } catch {
    return null
  }
}
