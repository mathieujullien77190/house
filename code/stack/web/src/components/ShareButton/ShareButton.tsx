import { useRef, useState } from 'react'
import { Button } from '@house/ui'
import { loadClip, shareFile } from '@/lib/shareClip'
import { BUSY_LABEL, ERROR_CLASS, ERROR_TEXT, ICON_BUSY_CLASS, ICON_CLASS, ICON_PATHS, LABEL, READY_LABEL, WRAP_CLASS } from './constants'
import type { ShareButtonProps } from './types'

/**
 * Partager un clip : sur téléphone, le menu de partage du système (messageries, mail…) ; ailleurs, le téléchargement du fichier.
 * Si la vidéo a été trop longue à charger, le navigateur refuse le menu : le fichier est gardé et un second toucher le partage aussitôt.
 */
const ShareButton = ({ path, name, title }: ShareButtonProps) => {
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const [ready, setReady] = useState(false)
  const file = useRef<File | null>(null)

  const share = async () => {
    setBusy(true)
    setFailed(false)
    try {
      file.current ??= await loadClip(path, name)
      const outcome = await shareFile(file.current, title)
      // « ready » : le menu n'a pas pu s'ouvrir, le fichier reste chargé pour le prochain toucher.
      setReady(outcome === 'ready')
      if (outcome !== 'ready') file.current = null
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  // L'icône seule : son libellé (préparation, prêt, partager) est dans l'étiquette et l'info-bulle.
  const label = busy ? BUSY_LABEL : ready ? READY_LABEL : LABEL

  return (
    <div className={WRAP_CLASS}>
      <Button disabled={busy} variant={ready ? 'active' : 'default'} aria-label={label} title={label} onClick={() => void share()}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={busy ? ICON_BUSY_CLASS : ICON_CLASS} aria-hidden="true">
          {ICON_PATHS.map((d) => (
            <path key={d} d={d} />
          ))}
        </svg>
      </Button>
      {failed ? <span className={ERROR_CLASS}>{ERROR_TEXT}</span> : null}
    </div>
  )
}

export default ShareButton
