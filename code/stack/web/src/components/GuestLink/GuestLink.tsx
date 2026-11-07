import { useEffect, useState } from 'react'
import { fetchGuest } from '@/lib/api'
import { COPY_RESET_MS } from './constants'
import { guestLink } from './helpers'
import GuestLinkUI from './UI'
import type { CopyState, GuestInfo, GuestLinkProps } from './types'

/** Le lien vers la page invité (il s'ouvre dans un nouvel onglet) et un bouton « Copier le lien ». Rien ne s'affiche sans page invité configurée. */
const GuestLink = ({ apiKey }: GuestLinkProps) => {
  const [info, setInfo] = useState<GuestInfo | null>(null)
  const [copy, setCopy] = useState<CopyState>('idle')

  useEffect(() => {
    let cancelled = false
    fetchGuest(apiKey)
      .then((result) => {
        if (!cancelled) setInfo(result)
      })
      .catch(() => {
        if (!cancelled) setInfo(null)
      })
    return () => {
      cancelled = true
    }
  }, [apiKey])

  // Le message du bouton (« Lien copié ») revient à « Copier le lien » après un instant.
  useEffect(() => {
    if (copy === 'idle') return
    const timer = setTimeout(() => setCopy('idle'), COPY_RESET_MS)
    return () => clearTimeout(timer)
  }, [copy])

  if (!info) return null
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
