// La pause des analyses de l'enregistreur (motion) tant que le zoom optique d'une caméra n'est pas au grand angle : l'objectif qui bouge décale toute l'image (l'enregistreur y verrait
// un mouvement et ferait un clip), et une image zoomée ne correspond plus à la zone surveillée ni à la recherche des yeux. La pause est levée seule au retour au grand angle.
// - Après un réglage du zoom (`onSet`) : au-dessus du grand angle, pause tout de suite ; au grand angle, la pause n'est levée qu'après GRACE_MS (trajet de l'objectif et mise au point),
//   et un nouveau zoom avant annule cette levée.
// - Un tour au démarrage puis chaque minute (`start`) : relit la vraie position de chaque caméra et redit l'état à l'enregistreur (il l'oublie en redémarrant, l'API aussi, et le zoom peut
//   avoir été changé depuis l'appli Reolink). Pendant le délai qui suit un réglage, la caméra n'est pas relue (elle rendrait une position de passage) : l'état voulu est seulement redit.
// Une caméra ou un enregistreur muet ne fait jamais échouer personne : une ligne de journal quand la panne commence, une quand elle finit, à texte fixe (jamais l'erreur, qui pourrait citer une adresse).
import type { ZoomState } from '../lib/reolinkClient.ts'

/** Le temps laissé à l'objectif pour revenir au grand angle et refaire la mise au point avant de reprendre les analyses. */
export const GRACE_MS = 20_000
const TICK_MS = 60_000
/** L'enregistreur est sur le réseau Docker : il répond tout de suite, ou pas du tout. */
const TIMEOUT_MS = 5000

/** Dit à l'enregistreur de mettre en pause, ou de reprendre, les analyses d'une caméra (`PUT /api/cameras/<caméra>/pause?enabled=0|1`, sans clé : son API n'est pas publiée). */
export const createRecorderPause =
  (recorderUrl: string, fetcher: typeof fetch = fetch) =>
  async (camera: string, paused: boolean): Promise<void> => {
    const response = await fetcher(`${recorderUrl}/api/cameras/${encodeURIComponent(camera)}/pause?enabled=${paused ? 1 : 0}`, {
      method: 'PUT',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    await response.arrayBuffer()
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
  }

interface Options<C extends { camera: string }> {
  /** Les caméras à zoom optique : leur nom, et ce qu'il faut à `read` pour leur parler. */
  cameras: C[]
  /** La position réelle du zoom d'une caméra et sa plage, lues sur la caméra. */
  read: (camera: C) => Promise<ZoomState>
  /** Envoie l'état de la pause à l'enregistreur. */
  push: (camera: string, paused: boolean) => Promise<void>
  log?: (message: string) => void
  now?: () => number
}

interface CameraPause<C> {
  config: C
  paused: boolean
  /** Jusqu'à cet instant (un réglage vient d'être fait), la position lue sur la caméra n'est pas crue. */
  holdUntil: number
  /** La levée de la pause en attente, après un retour au grand angle. */
  lift: NodeJS.Timeout | null
  reachable: boolean
}

export const createZoomPause = <C extends { camera: string }>({ cameras, read, push, log = console.log, now = Date.now }: Options<C>) => {
  const states = new Map<string, CameraPause<C>>(cameras.map((config) => [config.camera, { config, paused: false, holdUntil: 0, lift: null, reachable: true }]))
  let recorderOk = true

  const setPaused = (camera: string, state: CameraPause<C>, paused: boolean): boolean => {
    if (state.paused === paused) return false
    state.paused = paused
    log(`zoom ${camera} : ${paused ? 'analyses de l’enregistreur en pause' : 'grand angle, analyses de l’enregistreur reprises'}`)
    return true
  }

  /** Redit l'état voulu à l'enregistreur ; ne lève jamais. */
  const send = async (camera: string, state: CameraPause<C>): Promise<void> => {
    let ok = true
    try {
      await push(camera, state.paused)
    } catch {
      ok = false
    }
    if (ok !== recorderOk) log(ok ? 'zoom : l’enregistreur répond de nouveau' : 'zoom : l’enregistreur ne répond pas, pause des analyses non transmise')
    recorderOk = ok
  }

  /** Vrai tant qu'un réglage récent fait foi : la position lue sur la caméra ne change alors rien. */
  const held = (state: CameraPause<C>): boolean => state.lift !== null || now() < state.holdUntil

  const reconcileOne = async (camera: string, state: CameraPause<C>): Promise<void> => {
    if (!held(state)) {
      let zoom: ZoomState | null = null
      try {
        zoom = await read(state.config)
      } catch {
        // Caméra muette (PoE coupé, API HTTP fermée) : l'état connu est gardé.
      }
      const reachable = zoom !== null
      if (reachable !== state.reachable) log(`zoom ${camera} : ${reachable ? 'la caméra répond de nouveau' : 'la caméra ne répond pas, pause des analyses inchangée'}`)
      state.reachable = reachable
      // Un réglage arrivé pendant la lecture l'emporte.
      if (zoom && !held(state)) setPaused(camera, state, zoom.pos > zoom.min)
    }
    await send(camera, state)
  }

  /** Un tour : la position réelle de chaque caméra, puis l'état redit à l'enregistreur. Ne lève jamais. */
  const reconcile = async (): Promise<void> => {
    await Promise.all([...states].map(([camera, state]) => reconcileOne(camera, state)))
  }

  return {
    /** Vrai tant que les analyses de la caméra sont (ou doivent être) en pause : l'état de l'API, sans appel réseau. */
    paused: (camera: string): boolean => states.get(camera)?.paused ?? false,
    /** Après un réglage réussi du zoom à la position `pos` (`min` = grand angle). L'envoi à l'enregistreur part sans être attendu. */
    onSet: (camera: string, pos: number, min: number): void => {
      const state = states.get(camera)
      if (!state) return
      if (state.lift) clearTimeout(state.lift)
      state.lift = null
      state.holdUntil = now() + GRACE_MS
      if (pos > min) {
        setPaused(camera, state, true)
        void send(camera, state)
        return
      }
      // Retour au grand angle : rien à lever si les analyses tournent ; sinon la pause tient le temps que l'objectif arrive.
      if (!state.paused) return
      state.lift = setTimeout(() => {
        state.lift = null
        setPaused(camera, state, false)
        void send(camera, state)
      }, GRACE_MS)
      state.lift.unref()
    },
    /** Une position qui vient d'être lue sur la caméra (GET du zoom) : elle met l'état à jour comme le ferait le tour, sauf pendant le délai d'un réglage. */
    observe: (camera: string, zoom: ZoomState): void => {
      const state = states.get(camera)
      if (!state || held(state)) return
      if (setPaused(camera, state, zoom.pos > zoom.min)) void send(camera, state)
    },
    reconcile,
    /** Lance le tour, tout de suite puis chaque minute ; rend de quoi tout arrêter (le tour et les levées en attente). Les minuteurs ne retiennent pas le processus. */
    start: (): (() => void) => {
      void reconcile()
      const timer = setInterval(() => void reconcile(), TICK_MS)
      timer.unref()
      return () => {
        clearInterval(timer)
        for (const state of states.values()) {
          if (state.lift) clearTimeout(state.lift)
          state.lift = null
        }
      }
    },
  }
}

export type ZoomPause = ReturnType<typeof createZoomPause>
