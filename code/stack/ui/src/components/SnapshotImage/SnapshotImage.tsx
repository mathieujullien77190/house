import { useState } from 'react'
import { ALT, BOX_CLASS, FRAME_CLASS, IMAGE_CLASS, LABEL_CLASS, LOADING_CLASS, LOADING_TEXT, SPINNER_CLASS } from './constants'
import type { SnapshotImageProps } from './types'

/** Une image au format 16/9, ou un message dans le même cadre. Tant que l'image n'est pas arrivée, un voile « Chargement… » couvre le cadre noir. */
const SnapshotImage = ({ src, label, message, onSize }: SnapshotImageProps) => {
  // L'adresse dont l'image est arrivée (ou a échoué) : une nouvelle adresse remet le chargement.
  const [settled, setSettled] = useState('')
  if (src) {
    const done = () => setSettled(src)
    return (
      <div className={FRAME_CLASS}>
        <img
          className={IMAGE_CLASS}
          src={src}
          alt={ALT}
          onLoad={(event) => {
            done()
            onSize?.(event.currentTarget.naturalWidth, event.currentTarget.naturalHeight)
          }}
          onError={done}
        />
        {settled === src ? null : (
          <div className={LOADING_CLASS} role="status">
            <span className={SPINNER_CLASS} aria-hidden="true" />
            {LOADING_TEXT}
          </div>
        )}
        {label ? <span className={LABEL_CLASS}>{label}</span> : null}
      </div>
    )
  }
  return <div className={BOX_CLASS}>{message}</div>
}

export default SnapshotImage
