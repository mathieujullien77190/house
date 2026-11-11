/** Ce qui tourne tant que le son est ouvert : le lecteur et le circuit d'amplification (s'il a pu être créé). */
export interface Session {
  player: HTMLAudioElement
  context: AudioContext | null
}

/** Combien de temps le son survit à la disparition de son bouton : celui qui le remplace (vue en grand) le reprend sans coupure. */
export const END_DELAY_MS = 400

/**
 * Le son qui joue, tenu **hors du composant** : en vue en grand le bouton change d'endroit (il est démonté puis remonté), et le son ne doit pas s'interrompre. Le bouton qui disparaît
 * ne coupe pas tout de suite : celui qui le remplace, pour la même caméra, reprend le même son.
 */
let live: { camera: string; session: Session } | null = null
let pendingEnd: ReturnType<typeof setTimeout> | undefined
const listeners = new Set<() => void>()

export const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Prévient les boutons que le son a commencé ou fini. */
const changed = () => listeners.forEach((listener) => listener())

/** La caméra dont le son joue, ou null. */
export const playingCamera = (): string | null => live?.camera ?? null

/** Le son d'une caméra démarre. */
export const setLive = (camera: string, session: Session) => {
  live = { camera, session }
  changed()
}

const cancelEnd = () => {
  if (pendingEnd) clearTimeout(pendingEnd)
  pendingEnd = undefined
}

/** Coupe le son qui joue : le lecteur est libéré (sinon le navigateur garde la connexion ouverte vers House API). Sert aussi à tout remettre à zéro dans les essais. */
export const endLive = () => {
  cancelEnd()
  const current = live
  live = null
  changed()
  if (!current) return
  current.session.player.pause()
  current.session.player.removeAttribute('src')
  current.session.player.load()
  void current.session.context?.close()
}

/** Un bouton arrive pour `camera` : le son d'une autre caméra est coupé, celui de cette caméra (en attente de coupure) est repris. */
export const claim = (camera: string) => {
  if (live && live.camera !== camera) endLive()
  cancelEnd()
}

/** Le bouton disparaît : le son se coupe dans un instant, sauf si un autre bouton le reprend. */
export const release = () => {
  const doomed = live
  cancelEnd()
  pendingEnd = setTimeout(() => {
    if (live === doomed) endLive()
  }, END_DELAY_MS)
}
