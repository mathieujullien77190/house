// « Afficher en grand » : le média d'une caméra passe en plein écran, en paysage. Le plein écran du navigateur et le
// verrouillage de l'orientation ne sont pas offerts partout (pas sur iPhone, pas toujours sur Android) : la vue en
// grand est donc d'abord un état de la page (la carte se pose sur tout l'écran, tournée si l'écran reste droit), et
// le plein écran réel et le verrou ne sont que des plus quand le navigateur les accepte.
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'

export interface BigView {
  ref: RefObject<HTMLElement | null>
  big: boolean
  open: () => void
  close: () => void
}

const unlockOrientation = () => {
  try {
    screen.orientation.unlock()
  } catch {
    // pas d'API d'orientation : rien n'était verrouillé
  }
}

/** `portrait` : le média est en portrait (caméra posée de côté) — l'écran se verrouille en portrait au lieu du paysage. */
export const useBigView = (portrait = false): BigView => {
  const ref = useRef<HTMLElement>(null)
  const [big, setBig] = useState(false)
  // Vrai tant que la vue est demandée : une fermeture pendant que le plein écran se négocie annule la suite.
  const wanted = useRef(false)

  const close = useCallback(() => {
    wanted.current = false
    setBig(false)
    unlockOrientation()
    if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined)
  }, [])

  const open = useCallback(() => {
    wanted.current = true
    setBig(true)
    const enter = async () => {
      try {
        await ref.current?.requestFullscreen()
      } catch {
        // iPhone, ou plein écran refusé : la vue en grand de la page suffit
      }
      if (!wanted.current) {
        // Fermée pendant l'attente : on défait ce qui vient de s'ouvrir.
        if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined)
        return
      }
      try {
        await screen.orientation.lock(portrait ? 'portrait' : 'landscape')
      } catch {
        // verrou refusé (hors plein écran, navigateur sans l'API) : la vue se tourne d'elle-même si l'écran reste droit
      }
    }
    enter()
  }, [portrait])

  // Retour, Échap ou geste système ferment le plein écran réel : la vue en grand se ferme avec lui.
  useEffect(() => {
    const onChange = () => {
      if (document.fullscreenElement) return
      setBig(false)
      unlockOrientation()
    }
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  return { ref, big, open, close }
}
