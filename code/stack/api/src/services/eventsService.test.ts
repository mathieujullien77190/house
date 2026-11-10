import assert from 'node:assert/strict'
import { join } from 'node:path'
import { test } from 'node:test'
import { createClipEmojisStore } from '../lib/clipEmojisStore.ts'
import { createClipNotesStore } from '../lib/clipNotesStore.ts'
import { createSavedClipsStore } from '../lib/savedClipsStore.ts'
import { createEventsRepository } from '../repositories/eventsRepository.ts'
import { openFixture, withTempDir } from '../testing/helpers.ts'
import { createEventsService } from './eventsService.ts'

const setup = async (
  work: (
    service: ReturnType<typeof createEventsService>,
    saved: ReturnType<typeof createSavedClipsStore>,
    notes: ReturnType<typeof createClipNotesStore>,
    emojis: ReturnType<typeof createClipEmojisStore>,
  ) => void,
): Promise<void> => {
  await withTempDir((dir) => {
    const db = openFixture(dir)
    try {
      const saved = createSavedClipsStore(join(dir, 'saved.json'))
      const notes = createClipNotesStore(join(dir, 'notes.json'))
      const emojis = createClipEmojisStore(join(dir, 'emojis.json'))
      work(createEventsService(createEventsRepository(db), saved, notes, emojis), saved, notes, emojis)
    } finally {
      db.close()
    }
  })
}

const ids = (events: { id: string }[]) => events.map((event) => event.id)

test('un événement devient une réponse avec les adresses de ses clips', async () => {
  await setup((service, saved, notes, emojis) => {
    saved.set('e1', true)
    notes.set('e1', 'renard')
    emojis.set('e1', '🦊')
    const [e2, e3, e1] = service.list({ lastOnly: false })
    assert.deepEqual(e1, {
      id: 'e1',
      camera: 'cam-a',
      label: 'mouvement',
      started_at: 100,
      ended_at: 200,
      clip: '/clips/e1',
      clip_h264: '/clips/e1/h264',
      clip_audio: '/clips/e1/audio',
      clip_started_at: 90,
      saved: true,
      note: 'renard',
      emoji: '🦊',
      orientation: 'portrait',
    })
    // pas de clip, orientation inconnue : paysage
    assert.deepEqual([e2.clip, e2.clip_h264, e2.clip_audio, e2.saved, e2.note, e2.orientation], [null, null, null, false, '', 'landscape'])
    assert.deepEqual([e3.clip, e3.clip_h264, e3.clip_audio, e3.orientation], ['/clips/e3', null, null, 'landscape'])
  })
})

test('les modes de liste : sauvegardés, derniers par caméra, fenêtre, 200 derniers', async () => {
  await setup((service, saved) => {
    saved.set('e1', true)
    saved.set('absent', true)
    assert.deepEqual(ids(service.list({ lastOnly: false, savedOnly: true })), ['e1'])
    assert.deepEqual(ids(service.list({ lastOnly: true })), ['e2', 'e3'])
    assert.deepEqual(ids(service.list({ lastOnly: false })), ['e2', 'e3', 'e1'])
    assert.deepEqual(ids(service.list({ lastOnly: false, camera: 'cam-b' })), ['e3'])
    assert.deepEqual(ids(service.list({ lastOnly: false, from: 250 })), ['e2'])
    assert.deepEqual(ids(service.list({ lastOnly: false, to: 120 })), ['e1'])
  })
})

test('la limite est bornée de 1 à 1000', async () => {
  await setup((service) => {
    assert.equal(service.list({ lastOnly: false, camera: 'cam-a', limit: 0 }).length, 1)
    assert.equal(service.list({ lastOnly: false, camera: 'cam-a', limit: 1 }).length, 1)
    assert.equal(service.list({ lastOnly: false, camera: 'cam-a', limit: 5000 }).length, 2)
  })
})

test('les chemins des clips et la sauvegarde', async () => {
  await setup((service, saved) => {
    assert.equal(service.clipPath('e1'), 'clips/e1.mp4')
    assert.equal(service.clipPath('e1', true), 'clips/e1.h264.mp4')
    assert.equal(service.clipAudioPath('e1'), 'clips/e1.aac')
    assert.equal(service.setSaved('e1', true), true)
    assert.equal(saved.ids().has('e1'), true)
    assert.equal(service.setSaved('e1', false), true)
    assert.equal(saved.ids().has('e1'), false)
    // sans clip (ou inconnu) : rien n'est sauvegardé
    assert.equal(service.setSaved('e2', true), false)
    assert.equal(service.setSaved('absent', true), false)
    assert.equal(saved.ids().size, 0)
  })
})

test('la note d’un clip : posée, vidée, refusée sans clip', async () => {
  await setup((service, _saved, notes) => {
    assert.equal(service.setNote('e1', ' renard '), true)
    assert.equal(notes.all().e1, 'renard')
    assert.equal(service.setNote('e1', ''), true)
    assert.deepEqual(notes.all(), {})
    assert.equal(service.setNote('e2', 'x'), false)
    assert.equal(service.setNote('absent', 'x'), false)
    assert.deepEqual(notes.all(), {})
  })
})

test('l’emoji d’un clip : posé, retiré, refusé sans clip', async () => {
  await setup((service, _saved, _notes, emojis) => {
    assert.equal(service.setEmoji('e1', '🦊'), true)
    assert.equal(emojis.all().e1, '🦊')
    assert.equal(service.list({ lastOnly: false }).find((event) => event.id === 'e1')?.emoji, '🦊')
    assert.equal(service.setEmoji('e1', null), true)
    assert.deepEqual(emojis.all(), {})
    assert.equal(service.setEmoji('e2', '🦊'), false)
    assert.equal(service.setEmoji('absent', '🦊'), false)
    assert.deepEqual(emojis.all(), {})
  })
})
