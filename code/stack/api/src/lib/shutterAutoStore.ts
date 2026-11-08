// Les volets qui s'ouvrent au lever du soleil et/ou se ferment à son coucher : ce qui est activé (deux options séparées), gardé dans STATE_DIR/shutters-auto.json
// (écriture dans un fichier temporaire puis renommé). `since` est l'instant (secondes) jusqu'où les lever et coucher ont déjà été traités :
// il évite de rejouer un ordre après un redémarrage, et d'agir sur un lever passé au moment où on active la règle.
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

export interface AutoState {
  /** Ouvrir au lever du soleil. */
  open: boolean
  /** Fermer au coucher du soleil. */
  close: boolean
  since: number
}

export type AutoStates = Record<string, AutoState>

export const createShutterAutoStore = (file: string) => ({
  /** Les réglages gardés ; vide si le fichier manque ou est abîmé (rien n'est activé). */
  get: (): AutoStates => {
    try {
      const raw: unknown = JSON.parse(readFileSync(file, 'utf8'))
      if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return {}
      const states: AutoStates = {}
      for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
        const state = value as (Partial<AutoState> & { enabled?: unknown }) | null
        if (!state || typeof state.since !== 'number' || !Number.isFinite(state.since)) continue
        // L'ancien format n'avait qu'une case `enabled` pour les deux ordres : elle vaut pour les deux.
        const legacy = state.enabled === true
        states[id] = { open: typeof state.open === 'boolean' ? state.open : legacy, close: typeof state.close === 'boolean' ? state.close : legacy, since: state.since }
      }
      return states
    } catch {
      return {}
    }
  },
  set: (states: AutoStates): void => {
    mkdirSync(dirname(file), { recursive: true })
    const partial = `${file}.tmp`
    writeFileSync(partial, JSON.stringify(states, null, 2))
    renameSync(partial, file)
  },
})

export type ShutterAutoStore = ReturnType<typeof createShutterAutoStore>
