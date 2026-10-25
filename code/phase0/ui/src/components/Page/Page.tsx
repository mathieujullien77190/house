import { ACTIONS_CLASS, ERROR_CLASS, HEADER_CLASS, PAGE_CLASS, STATUS_CLASS, TITLE_CLASS } from './constants'
import type { PageHeaderProps, PageProps } from './types'

/** Le cadre d'une page : largeur bornée, marges. */
export const Page = ({ children }: PageProps) => <div className={PAGE_CLASS}>{children}</div>

/** L'en-tête d'une page : titre, état, boutons à droite. Le même dans les deux apps. */
export const PageHeader = ({ title, status, tone = 'muted', actions }: PageHeaderProps) => {
  return (
    <header className={HEADER_CLASS}>
      <h1 className={TITLE_CLASS}>{title}</h1>
      <p className={tone === 'error' ? ERROR_CLASS : STATUS_CLASS}>{status}</p>
      {actions ? <div className={ACTIONS_CLASS}>{actions}</div> : null}
    </header>
  )
}
