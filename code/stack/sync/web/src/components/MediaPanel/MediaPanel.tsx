import { useEffect, useState } from 'react'
import { MediaPanel as MediaPanelUI } from '@house/ui'
import { fetchSettings, fileUrl } from '@/lib/api'
import { cameraOfPath } from './helpers'
import type { MediaPanelProps } from './types'

/** Le clip ou l'image qu'on regarde : le fichier est servi par House Sync derrière la session ; une caméra en portrait est montrée droite (tournée d'un quart de tour horaire). */
const MediaPanel = ({ media, onClose }: MediaPanelProps) => {
  const [portrait, setPortrait] = useState<string[]>([])
  useEffect(() => {
    fetchSettings()
      .then((settings) => setPortrait(settings.filter((setting) => setting.orientation === 'portrait').map((setting) => setting.camera)))
      .catch(() => setPortrait([]))
  }, [])
  const camera = cameraOfPath(media.path)
  return <MediaPanelUI kind={media.kind} title={media.path} src={fileUrl(media.path)} rotated={camera !== null && portrait.includes(camera)} onClose={onClose} />
}

export default MediaPanel
