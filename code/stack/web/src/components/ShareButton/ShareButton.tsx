import { useState } from 'react'
import { Button } from '@house/ui'
import { shareClip } from '@/lib/shareClip'
import { BUSY_LABEL, ERROR_CLASS, ERROR_TEXT, LABEL, WRAP_CLASS } from './constants'
import type { ShareButtonProps } from './types'

/** Partager un clip : sur téléphone, le menu de partage du système (messageries, mail…) ; ailleurs, le téléchargement du fichier. */
const ShareButton = ({ path, name, title }: ShareButtonProps) => {
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  const share = () => {
    setBusy(true)
    setFailed(false)
    shareClip(path, name, title)
      .catch(() => setFailed(true))
      .finally(() => setBusy(false))
  }

  return (
    <div className={WRAP_CLASS}>
      <Button disabled={busy} onClick={share}>
        {busy ? BUSY_LABEL : LABEL}
      </Button>
      {failed ? <span className={ERROR_CLASS}>{ERROR_TEXT}</span> : null}
    </div>
  )
}

export default ShareButton
