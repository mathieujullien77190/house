import { useEffect, useRef, useState } from 'react'
import { Button } from '@house/ui'
import { FLASH_MS, KEY_CLASS, KEY_TEXT_CLASS, LONG_PRESS_MS } from './constants'
import type { RemoteKeyProps } from './types'

/**
 * Une touche de la télécommande. L'appui bref part au relâchement, l'appui maintenu 600 ms part en `long` sans attendre le relâchement (événements de pointeur : doigt et souris).
 * Pas de menu contextuel au long appui ; au clavier, Entrée ou Espace envoient la touche. Retour visuel bref (la touche passe en `active`).
 */
const RemoteKey = ({ keyId, label, ariaLabel, onSend, variant = 'default' }: RemoteKeyProps) => {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [flash, setFlash] = useState(false)

  const cancel = () => {
    if (timer.current !== null) clearTimeout(timer.current)
    timer.current = null
  }
  useEffect(() => cancel, [])
  useEffect(() => {
    if (!flash) return
    const id = setTimeout(() => setFlash(false), FLASH_MS)
    return () => clearTimeout(id)
  }, [flash])

  const start = (button: number) => {
    if (button !== 0) return
    cancel()
    timer.current = setTimeout(() => {
      timer.current = null
      setFlash(true)
      onSend(keyId, true)
    }, LONG_PRESS_MS)
  }
  const release = () => {
    if (timer.current === null) return
    cancel()
    setFlash(true)
    onSend(keyId, false)
  }

  return (
    <Button
      variant={flash ? 'active' : variant}
      className={KEY_CLASS}
      aria-label={ariaLabel}
      onPointerDown={(event) => start(event.button)}
      onPointerUp={release}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onContextMenu={(event) => event.preventDefault()}
      onClick={(event) => {
        if (event.detail !== 0) return
        setFlash(true)
        onSend(keyId, false)
      }}
    >
      <span className={KEY_TEXT_CLASS}>{label}</span>
    </Button>
  )
}

export default RemoteKey
