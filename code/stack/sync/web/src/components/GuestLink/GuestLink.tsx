import { useEffect, useState } from 'react'
import { COPY_RESET_MS } from './constants'
import { guestLink } from './helpers'
import GuestLinkUI from './UI'
import type { CopyState, GuestLinkProps } from './types'

/** Le lien vers la page invité (il s'ouvre dans un nouvel onglet) et un bouton « Copier le lien ». */
const GuestLink = ({ info }: GuestLinkProps) => {
  const [copy, setCopy] = useState<CopyState>('idle')

  // Le message du bouton (« Lien copié ») revient à « Copier le lien » après un instant.
  useEffect(() => {
    if (copy === 'idle') return
    const timer = setTimeout(() => setCopy('idle'), COPY_RESET_MS)
    return () => clearTimeout(timer)
  }, [copy])

  const link = guestLink(info, window.location.hostname)
  const onCopy = () => {
    navigator.clipboard
      .writeText(link)
      .then(() => setCopy('copied'))
      .catch(() => setCopy('failed'))
  }
  return <GuestLinkUI link={link} copy={copy} onCopy={onCopy} />
}

export default GuestLink
