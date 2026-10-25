/** La prose de la page docs, en français puis en anglais, importée en ?raw depuis les deux .md du dossier. */
export const prose = ({ fr, en }: { fr: string; en: string }) => ({
  docs: { description: { component: `${fr.trim()}\n\n---\n\n${en.trim()}` } },
})
