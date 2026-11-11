import { useEffect, useRef, useState } from 'react'
import { SnapshotImage as SnapshotImageUI } from '@house/ui'
import { fetchSnapshot } from '@/lib/api'
import {
  DEFAULT_FADE_MS,
  FADE_CLASS,
  FRAME_CLASS,
  LABEL_CLASS,
  LABEL_FADE_IN_CLASS,
  LABEL_FADE_OUT_CLASS,
  MISSING_TEXT,
  UPRIGHT_LABEL_CLASS,
} from './constants'
import type { SnapshotImageProps } from './types'

/** Ce qu'on a obtenu pour un instant : l'adresse locale de l'image, ou rien s'il n'y en a pas. */
interface Loaded {
  at: number
  src: string
  /** Le code permanent de l'image (lettres, donné par l'API) ; vide tant qu'on ne le connaît pas. */
  code: string
}

/**
 * L'image gardée par House Sync la plus proche d'un instant, téléchargée via l'API avec la clé. Pendant qu'une image arrive, la précédente reste affichée ;
 * quand elle est là, elle apparaît en fondu par-dessus (le défilement des images de la frise ne clignote pas).
 */
const SnapshotImage = ({ apiKey, camera, at, upright, fade = DEFAULT_FADE_MS }: SnapshotImageProps) => {
  const [shown, setShown] = useState<{ current: Loaded | null; previous: Loaded | null }>({ current: null, previous: null })
  // Les adresses locales encore utiles : on libère celles qui ne sont plus ni l'image montrée ni la précédente.
  const urls = useRef<string[]>([])

  useEffect(() => {
    let cancelled = false
    fetchSnapshot(apiKey, camera, at)
      .then(({ blob, code }) => {
        if (cancelled) return
        const src = URL.createObjectURL(blob)
        urls.current.push(src)
        for (const old of urls.current.splice(0, urls.current.length - 2)) URL.revokeObjectURL(old)
        setShown((before) => ({ current: { at, src, code }, previous: before.current }))
      })
      .catch(() => {
        if (!cancelled) setShown((before) => ({ current: { at, src: '', code: '' }, previous: before.current }))
      })
    return () => {
      cancelled = true
    }
  }, [apiKey, camera, at])

  useEffect(
    () => () => {
      for (const old of urls.current) URL.revokeObjectURL(old)
    },
    [],
  )

  const { current, previous } = shown
  // Rien encore : le cadre noir (pas de texte, l'image arrive en fondu). Une image absente (hors des images gardées) : son message.
  if (!current) return <SnapshotImageUI quiet src="" message="" upright={upright} />
  if (!current.src) return <SnapshotImageUI quiet src="" message={MISSING_TEXT} upright={upright} />
  const label = current.code
  const previousLabel = previous?.code ?? ''
  const duration = { animationDuration: `${fade}ms` }
  const labelClass = upright ? UPRIGHT_LABEL_CLASS : LABEL_CLASS
  // Pas de précédente image : elle s'affiche seule ; sinon la précédente dessous et la nouvelle qui apparaît par-dessus (une nouvelle `key` relance le fondu).
  if (!previous?.src) return <SnapshotImageUI quiet src={current.src} label={label || undefined} message={MISSING_TEXT} upright={upright} />
  return (
    <div className={FRAME_CLASS}>
      <SnapshotImageUI quiet src={previous.src} message={MISSING_TEXT} upright={upright} />
      <div key={current.src} className={FADE_CLASS} style={duration}>
        <SnapshotImageUI quiet src={current.src} message={MISSING_TEXT} upright={upright} />
      </div>
      {previousLabel ? (
        <span key={`out-${previous.src}`} className={`${labelClass} ${LABEL_FADE_OUT_CLASS}`} style={duration}>
          {previousLabel}
        </span>
      ) : null}
      {label ? (
        <span key={`in-${current.src}`} className={`${labelClass} ${LABEL_FADE_IN_CLASS}`} style={duration}>
          {label}
        </span>
      ) : null}
    </div>
  )
}

export default SnapshotImage
