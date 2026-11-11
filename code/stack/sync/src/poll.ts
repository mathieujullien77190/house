// Le tour de polling : à chaque passage, tout ce que House Sync recopie ou règle chez les enregistreurs.
import { messageOf, type Context } from './context.ts'
import type { Clips } from './clips.ts'
import type { Control } from './control.ts'
import type { createEvents } from './events.ts'
import type { Recorder } from './recorder.ts'

export interface Poller {
  /** Un tour ; sans effet si le précédent n'est pas fini ou si l'arrêt est demandé. */
  poll: () => Promise<void>
  /** Demande l'arrêt : plus aucun tour ne démarre. */
  stop: () => void
  /** Un tour est-il en cours ? */
  isBusy: () => boolean
}

export const createPoller = (
  ctx: Context,
  parts: {
    rec: Recorder
    events: ReturnType<typeof createEvents>
    clips: Clips
    control: Control
    snapshots: (cameras: string[]) => Promise<number>
  },
): Poller => {
  const { rec, events, clips, control, snapshots } = parts
  let busy = false
  let stopping = false
  const poll = async (): Promise<void> => {
    if (busy || stopping) return
    busy = true
    try {
      const byRecorder = await rec.syncCameras()
      const cameras = [...byRecorder.values()].flat()
      let copied = 0
      let ongoing = 0
      let merged = 0
      for (const [base, own] of byRecorder) {
        // Un enregistreur qui échoue ne bloque pas les autres.
        try {
          copied += await events.syncEvents(base, own)
          ongoing += await events.syncOngoingEvents(base, own)
          merged += await events.syncMerges(base, own)
          await control.syncDetection(base, own)
          await control.syncLiveFps(own)
        } catch (error) {
          ctx.log(`Enregistreur ${base} : ${messageOf(error)}`)
        }
      }
      const repaired = (await clips.retryMissingClips()) + (await clips.syncWebClips()) + (await clips.syncAudioClips()) + (await clips.syncShapesClips())
      const taken = await snapshots(cameras)
      const purged = await clips.purgeOldClips()
      const removed = [
        purged.clips ? `, ${purged.clips} vieux clip(s) effacé(s)` : '',
        purged.snapshots ? `, ${purged.snapshots} vieille(s) image(s) effacée(s)` : '',
        purged.journal ? `, ${purged.journal} ligne(s) du journal des lampes effacée(s)` : '',
        purged.events ? `, ${purged.events} vieil(s) événement(s) effacé(s)` : '',
        purged.merges ? `, ${purged.merges} vieille(s) fusion(s) effacée(s)` : '',
      ].join('')
      ctx.log(
        `${cameras.length} caméra(s), ${copied} nouvel(aux) événement(s)${ongoing ? `, ${ongoing} en cours` : ''}${merged ? `, ${merged} fusionné(s)` : ''}${repaired ? `, ${repaired} clip(s) récupéré(s)` : ''}${taken ? `, ${taken} image(s)` : ''}${removed}`,
      )
    } catch (error) {
      ctx.log(`Enregistreur : ${messageOf(error)}`)
    } finally {
      busy = false
    }
  }
  return { poll, stop: () => void (stopping = true), isBusy: () => busy }
}
