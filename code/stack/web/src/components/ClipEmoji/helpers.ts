const segmenter = new Intl.Segmenter()

/** Le dernier symbole (emoji complet, avec ses variantes et ses liaisons) d'un texte tapé ; vide si le texte est vide. Taper par-dessus l'ancien emoji le remplace. */
export const lastSymbol = (text: string): string => {
  const symbols = [...segmenter.segment(text.trim())]
  return symbols.length === 0 ? '' : symbols[symbols.length - 1].segment
}
