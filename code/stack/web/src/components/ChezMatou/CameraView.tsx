import { CameraCard, SnapshotImage as ImageBox } from '@house/ui'
import { useEffect, useRef, useState } from 'react'
import { HD_PRELOAD_CLASS } from '@/components/CameraCard/constants'
import RotatedMedia from '@/components/RotatedMedia'
import { useBigView } from '@/lib/useBigView'
import { useMobile } from '@/lib/useMobile'
import { usePinchZoom } from '@/lib/usePinchZoom'
import { NO_IMAGE_TEXT } from './constants'
import type { CameraViewProps } from './types'

/**
 * Une caméra agrandie, comme dans la WebApp : la même vue en grand (`useBigView` : plein écran, portrait conservé, bouton de fermeture, zoom au doigt) et le même `CameraCard` de `@house/ui`, sans frise ni commandes.
 * En grand, le direct passe en 4K (chargé caché, le léger reste dessous jusqu'à sa première image) ; refermer coupe le 4K.
 */
const CameraView = ({ camera, lightUrl, hdUrl, onStreamError, onClose }: CameraViewProps) => {
  const mobile = useMobile()
  const turned = camera.orientation === 'portrait'
  const bigView = useBigView(turned)
  const pinchZoom = usePinchZoom(bigView.big || mobile, bigView.big && !turned, `${camera.id}${bigView.big ? ':big' : ''}`, !mobile && bigView.big)
  const [hdReady, setHdReady] = useState(false)
  // La vue s'ouvre dès qu'elle est montée (le toucher de la vignette sert de geste pour le plein écran) ; quand elle se ferme (bouton, Échap, retour), la page referme la caméra.
  const { open } = bigView
  useEffect(() => open(), [open])
  const wasBig = useRef(false)
  useEffect(() => {
    if (wasBig.current && !bigView.big) onClose()
    wasBig.current = bigView.big
  }, [bigView.big, onClose])

  const light = <ImageBox src={lightUrl ?? ''} message={NO_IMAGE_TEXT} upright={turned} />
  const media = (
    <RotatedMedia turned={turned}>
      {hdUrl && bigView.big ? (
        <div className="relative">
          <div className={hdReady ? undefined : HD_PRELOAD_CLASS}>
            <ImageBox src={hdUrl} message={NO_IMAGE_TEXT} upright={turned} onSize={() => setHdReady(true)} />
          </div>
          {hdReady ? null : light}
        </div>
      ) : (
        light
      )}
    </RotatedMedia>
  )
  return (
    <div onErrorCapture={onStreamError}>
      <CameraCard
        screen={mobile}
        name={camera.name}
        media={media}
        timeline={null}
        figureRef={bigView.ref}
        expanded={bigView.big}
        onCollapse={bigView.close}
        mediaGesture={pinchZoom}
        portraitMedia={turned}
      />
    </div>
  )
}

export default CameraView
