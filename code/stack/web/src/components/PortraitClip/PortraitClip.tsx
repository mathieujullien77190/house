import { useState } from 'react'
import ClipPlayer from '@/components/ClipPlayer'
import RotatedMedia from '@/components/RotatedMedia'
import { CONTROLS_CLASS } from './constants'
import type { PortraitClipProps } from './types'

/**
 * Le clip d'une caméra posée de côté, lu en portrait et droit : la vidéo est tournée d'un quart de tour horaire (`RotatedMedia`) et ses commandes (lecture, barre de temps) sont posées
 * dans la vidéo, en bas, droites, par le lecteur lui-même (`controlsHost`) : celles du navigateur tourneraient avec la vidéo.
 */
const PortraitClip = ({ apiKey, path, audioSrc, onClose }: PortraitClipProps) => {
  const [host, setHost] = useState<HTMLDivElement | null>(null)
  return (
    <>
      <RotatedMedia turned overlay={<div ref={setHost} className={CONTROLS_CLASS} />}>
        <ClipPlayer apiKey={apiKey} path={path} audioSrc={audioSrc} onClose={onClose} controlsHost={host} />
      </RotatedMedia>
    </>
  )
}

export default PortraitClip
