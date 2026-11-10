import { Button } from '@house/ui'
import { COPIED_LABEL, COPY_LABEL, FAILED_LABEL, LINK_CLASS, LINK_LABEL, WRAP_CLASS, WRAP_MENU_CLASS } from './constants'
import type { GuestLinkUIProps } from './types'

const GuestLinkUI = ({ link, copy, onCopy, menu = false }: GuestLinkUIProps) => (
  <div className={menu ? WRAP_MENU_CLASS : WRAP_CLASS}>
    {/* noreferrer : le lien porte la clé de la page invité, la page d’arrivée ne doit pas en recevoir l’adresse d’origine. */}
    <a className={LINK_CLASS} href={link} target="_blank" rel="noopener noreferrer">
      {LINK_LABEL}
    </a>
    <Button onClick={onCopy}>{copy === 'copied' ? COPIED_LABEL : copy === 'failed' ? FAILED_LABEL : COPY_LABEL}</Button>
  </div>
)

export default GuestLinkUI
