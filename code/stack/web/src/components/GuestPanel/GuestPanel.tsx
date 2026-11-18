import { useEffect, useState } from 'react'
import { fetchGuestLan } from '@/lib/api'
import { COPY_RESET_MS } from './constants'
import { previewOf } from './helpers'
import GuestPanelUI from './UI'
import type { CopyState, GuestLanLink, GuestPanelProps } from './types'

/** L'onglet « Page invité » : le QR code et l'adresse de la page « Chez Matou » (clé comprise, rendue par l'API derrière la clé de la WebApp), l'état en lecture seule de ce qu'elle permet et un aperçu en direct dans un cadre. */
const GuestPanel = ({ apiKey }: GuestPanelProps) => {
  const [link, setLink] = useState<GuestLanLink | null>(null)
  const [problem, setProblem] = useState<'loading' | 'off' | null>('loading')
  const [copy, setCopy] = useState<CopyState>('idle')

  useEffect(() => {
    let cancelled = false
    fetchGuestLan(apiKey).then(
      (result) => {
        if (cancelled) return
        setLink(result)
        setProblem(null)
      },
      () => {
        if (!cancelled) setProblem('off')
      },
    )
    return () => {
      cancelled = true
    }
  }, [apiKey])

  // Le message du bouton (« Copié ») revient à « Copier » après un instant.
  useEffect(() => {
    if (copy === 'idle') return
    const timer = setTimeout(() => setCopy('idle'), COPY_RESET_MS)
    return () => clearTimeout(timer)
  }, [copy])

  const onCopy = (url: string) => {
    navigator.clipboard
      .writeText(url)
      .then(() => setCopy('copied'))
      .catch(() => setCopy('failed'))
  }
  return <GuestPanelUI link={link} problem={problem} previewUrl={previewOf(link?.url ?? null, window.location.origin)} copy={copy} onCopy={onCopy} />
}

export default GuestPanel
