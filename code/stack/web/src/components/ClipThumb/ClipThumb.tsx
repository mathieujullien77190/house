import { useEffect, useRef } from 'react'
import { useClipThumb } from '@/lib/useClipThumb'
import type { ClipThumbProps } from './types'

/**
 * La vignette d'un clip : une image fixe (la première image de la vidéo), pas une balise vidéo. Une vidéo par vignette gardait une
 * connexion ouverte vers l'API pour chaque clip, et le navigateur n'en a que six : le clip qu'on ouvrait ensuite ne se chargeait pas.
 */
const ClipThumb = ({ path, className, onDuration }: ClipThumbProps) => {
  const thumb = useClipThumb(path)
  const report = useRef(onDuration)
  useEffect(() => {
    report.current = onDuration
  })
  useEffect(() => {
    if (thumb.seconds !== null) report.current?.(thumb.seconds)
  }, [thumb.seconds])
  return thumb.image ? <img className={className} src={thumb.image} alt="" /> : <div className={className} />
}

export default ClipThumb
