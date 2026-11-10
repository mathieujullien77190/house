import { useState } from 'react'
import {
  ALT,
  BOX_CLASS,
  UPRIGHT_BOX_CLASS,
  UPRIGHT_CLASS,
  UPRIGHT_LABEL_CLASS,
  UPRIGHT_LOADING_CLASS,
  LOADING_ROW_CLASS,
  FRAME_CLASS,
  IMAGE_CLASS,
  LABEL_CLASS,
  LOADING_CLASS,
  LOADING_TEXT,
  SPINNER_CLASS,
} from './constants'
import { releaseImage } from './helpers'
import type { SnapshotImageProps } from './types'

/**
 * Une image au format 16/9, ou un message dans le même cadre. Tant que l'image n'est pas arrivée, un voile « Chargement… » couvre le cadre noir.
 * Quand l'image quitte la page, sa requête est coupée : un flux du direct (MJPEG) est une connexion qui ne se termine jamais, et un navigateur ne l'abandonne pas
 * tout seul quand on retire l'image ; il n'en ouvre que 6 à la fois vers un même hôte, donc les flux oubliés finissaient par bloquer toutes les autres requêtes.
 */
const SnapshotImage = ({ src, label, message, onSize, upright = false, quiet = false }: SnapshotImageProps) => {
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
          ref={releaseImage}
        />
        {settled === src || quiet ? null : (
          <div className={LOADING_CLASS} role="status">
            <span className={upright ? UPRIGHT_LOADING_CLASS : LOADING_ROW_CLASS}>
              <span className={SPINNER_CLASS} aria-hidden="true" />
              {LOADING_TEXT}
            </span>
          </div>
        )}
        {label ? <span className={upright ? UPRIGHT_LABEL_CLASS : LABEL_CLASS}>{label}</span> : null}
      </div>
    )
  }
  return (
    <div className={upright ? UPRIGHT_BOX_CLASS : BOX_CLASS}>{upright ? <span className={UPRIGHT_CLASS}>{message}</span> : message}</div>
  )
}

export default SnapshotImage
