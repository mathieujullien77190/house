// Tests du tour de polling (les morceaux sont simulés : seul l'enchaînement est vérifié).
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { messageOf } from './context.ts'
import { NOTHING_PURGED } from './clips.ts'
import { createPoller } from './poll.ts'
import { testContext } from './testing.ts'

type Parts = Parameters<typeof createPoller>[1]

const parts = (patch: { cameras?: Map<string, string[]>; events?: Partial<Parts['events']>; snapshots?: Parts['snapshots']; clips?: Partial<Parts['clips']> } = {}): { parts: Parts; order: string[] } => {
  const order: string[] = []
  const step = <T>(name: string, value: T) => async (): Promise<T> => {
    order.push(name)
    return value
  }
  return {
    order,
    parts: {
      rec: { syncCameras: step('cameras', patch.cameras ?? new Map([['http://a', ['cam1', 'cam2']]])) } as unknown as Parts['rec'],
      events: { syncEvents: step('events', 2), syncOngoingEvents: step('ongoing', 1), syncMerges: step('merges', 3), ...patch.events } as unknown as Parts['events'],
      clips: { retryMissingClips: step('retry', 1), syncWebClips: step('web', 1), syncAudioClips: step('audio', 1), syncShapesClips: step('shapes', 1), purgeOldClips: step('purge', { clips: 4, snapshots: 5, journal: 6, events: 7, merges: 8 }), ...patch.clips } as unknown as Parts['clips'],
      control: { syncDetection: step('detection', undefined), syncLiveFps: step('fps', undefined) } as unknown as Parts['control'],
      snapshots: patch.snapshots ?? step('snapshots', 2),
    },
  }
}

test('un tour enchaîne caméras, événements, réglages, clips, images et ménage, puis résume', async () => {
  const ctx = testContext()
  const { parts: p, order } = parts()
  await createPoller(ctx, p).poll()
  assert.deepEqual(order, ['cameras', 'events', 'ongoing', 'merges', 'detection', 'fps', 'retry', 'web', 'audio', 'shapes', 'snapshots', 'purge'])
  assert.deepEqual(ctx.logs, ['2 caméra(s), 2 nouvel(aux) événement(s), 1 en cours, 3 fusionné(s), 4 clip(s) récupéré(s), 2 image(s), 4 vieux clip(s) effacé(s), 5 vieille(s) image(s) effacée(s), 6 ligne(s) du journal des lampes effacée(s), 7 vieil(s) événement(s) effacé(s), 8 vieille(s) fusion(s) effacée(s)'])
})

test('un tour sans rien de nouveau ne dit que les caméras et les événements', async () => {
  const ctx = testContext()
  const zero = async () => 0
  const { parts: p } = parts({ events: { syncEvents: zero, syncOngoingEvents: zero, syncMerges: zero }, clips: { retryMissingClips: zero, syncWebClips: zero, syncAudioClips: zero, syncShapesClips: zero, purgeOldClips: async () => NOTHING_PURGED }, snapshots: zero })
  await createPoller(ctx, p).poll()
  assert.deepEqual(ctx.logs, ['2 caméra(s), 0 nouvel(aux) événement(s)'])
})

test('un enregistreur qui échoue ne bloque pas les autres', async () => {
  const ctx = testContext()
  const seen: string[] = []
  const { parts: p } = parts({
    cameras: new Map([['http://a', ['x']], ['http://b', ['y']]]),
    events: {
      syncEvents: async (base: string) => {
        seen.push(base)
        if (base === 'http://a') throw new Error('hors ligne')
        return 0
      },
    },
  })
  await createPoller(ctx, p).poll()
  assert.deepEqual(seen, ['http://a', 'http://b'])
  assert.equal(ctx.logs[0], 'Enregistreur http://a : hors ligne')
})

test('une erreur hors des enregistreurs est notée, et le tour suivant repart', async () => {
  const ctx = testContext()
  let fail = true
  const { parts: p } = parts({
    snapshots: async () => {
      if (fail) throw new Error('disque plein')
      return 0
    },
  })
  const poller = createPoller(ctx, p)
  await poller.poll()
  assert.equal(ctx.logs[0], 'Enregistreur : disque plein')
  assert.equal(poller.isBusy(), false)
  fail = false
  await poller.poll()
  assert.equal(ctx.logs.length, 2)
})

test('un tour déjà en cours, ou l\'arrêt demandé, empêche un nouveau tour', async () => {
  const ctx = testContext()
  let release: () => void = () => undefined
  const gate = new Promise<void>((resolve) => (release = resolve))
  const { parts: p, order } = parts({
    snapshots: async () => {
      await gate
      return 0
    },
  })
  const poller = createPoller(ctx, p)
  const first = poller.poll()
  assert.equal(poller.isBusy(), true)
  await poller.poll()
  release()
  await first
  assert.equal(order.filter((name) => name === 'cameras').length, 1)
  poller.stop()
  await poller.poll()
  assert.equal(order.filter((name) => name === 'cameras').length, 1)
})

test('messageOf : le message d\'une erreur, ou le texte d\'une autre valeur', () => {
  assert.equal(messageOf(new Error('x')), 'x')
  assert.equal(messageOf('texte'), 'texte')
})
