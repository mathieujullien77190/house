export interface PageFrameProps {
  /** L'adresse de la page à montrer ; vide si elle n'est pas connue. */
  src: string
  title: string
  /** Une phrase au-dessus du cadre. */
  intro: string
  /** Texte montré quand l'adresse est vide. */
  emptyText: string
}

export type PageFrameUIProps = PageFrameProps
