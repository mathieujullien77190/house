import assert from 'node:assert/strict'
import { mock, test } from 'node:test'
import type { BackupFiles } from '../lib/backupFiles.ts'
import type { EventsQuery, EventsService } from '../services/eventsService.ts'
import { call, routerApp, withServer } from '../testing/helpers.ts'
import { eventsRouter } from './events.ts'

const setup = () => {
  const queries: EventsQuery[] = []
  const saves: [string, boolean][] = []
  const state = { clip: 'clips/a.mp4' as string | null, audio: 'clips/a.aac' as string | null, saved: true, fail: false }
  const events = {
    list: (query: EventsQuery) => {
      queries.push(query)
      return [{ id: 'e1' }]
    },
    clipPath: (_id: string, h264: boolean) => (state.clip === null ? null : h264 ? `${state.clip}.h264` : state.clip),
    clipAudioPath: () => state.audio,
    setSaved: (id: string, saved: boolean) => {
      if (state.fail) throw new Error('disque plein')
      saves.push([id, saved])
      return state.saved
    },
  } as unknown as EventsService
  const files = { send: (res, path, type) => void res.send(`${path}|${type}`) } as BackupFiles
  return { app: routerApp(eventsRouter(events, files)), queries, saves, state }
}

test('GET /events : les paramètres sont lus et la limite arrondie vers le bas', async () => {
  const { app, queries } = setup()
  await withServer(app, async (url) => {
    assert.deepEqual((await call(`${url}/events`)).body, [{ id: 'e1' }])
    await call(`${url}/events?last=1&saved=1&camera=voliere-1&from=10&to=20.5&limit=3.9`)
    assert.deepEqual(queries, [
      { lastOnly: false, savedOnly: false, camera: undefined, from: undefined, to: undefined, limit: undefined },
      { lastOnly: true, savedOnly: true, camera: 'voliere-1', from: 10, to: 20.5, limit: 3 },
    ])
  })
})

test('GET /events : un paramètre invalide donne 400', async () => {
  const { app, queries } = setup()
  await withServer(app, async (url) => {
    for (const query of ['from=abc', 'to=abc', 'limit=abc', 'camera=a%20b', 'camera=a&camera=b', 'from=Infinity']) {
      const reply = await call(`${url}/events?${query}`)
      assert.deepEqual([reply.status, reply.body], [400, { error: 'bad query' }], query)
    }
    assert.equal(queries.length, 0)
  })
})

test('les clips : original, copie H.264 et son, 404 sans fichier ou avec un identifiant invalide', async () => {
  const { app, state } = setup()
  await withServer(app, async (url) => {
    assert.equal((await call(`${url}/clips/e1`)).body, 'clips/a.mp4|video/mp4')
    assert.equal((await call(`${url}/clips/e1/h264`)).body, 'clips/a.mp4.h264|video/mp4')
    assert.equal((await call(`${url}/clips/e1/audio`)).body, 'clips/a.aac|audio/aac')
    assert.equal((await call(`${url}/clips/a%20b`)).status, 404)
    assert.deepEqual((await call(`${url}/clips/a%20b/audio`)).body, { error: 'sound not found' })
    state.clip = null
    state.audio = null
    assert.deepEqual((await call(`${url}/clips/e1`)).body, { error: 'clip not found' })
    assert.deepEqual((await call(`${url}/clips/e1/audio`)).body, { error: 'sound not found' })
  })
})

test('PUT /clips/:id/saved : sauvegarder ou libérer', async () => {
  const { app, saves, state } = setup()
  await withServer(app, async (url) => {
    assert.deepEqual((await call(`${url}/clips/e1/saved`, 'PUT', { saved: true })).body, { id: 'e1', saved: true })
    assert.deepEqual((await call(`${url}/clips/e1/saved`, 'PUT', { saved: false })).body, { id: 'e1', saved: false })
    assert.deepEqual(saves, [
      ['e1', true],
      ['e1', false],
    ])
    for (const body of [{ saved: 'oui' }, {}, []]) assert.equal((await call(`${url}/clips/e1/saved`, 'PUT', body)).status, 400)
    // sans corps du tout
    assert.equal((await call(`${url}/clips/e1/saved`, 'PUT')).status, 400)
    assert.equal((await call(`${url}/clips/a%20b/saved`, 'PUT', { saved: true })).status, 400)
    assert.equal((await call(`${url}/clips/e1/saved`, 'PUT', '{pas du json')).status, 400)
    state.saved = false
    assert.deepEqual((await call(`${url}/clips/e1/saved`, 'PUT', { saved: true })).body, { error: 'clip not found' })
    state.fail = true
    const log = mock.method(console, 'error', () => undefined)
    try {
      assert.equal((await call(`${url}/clips/e1/saved`, 'PUT', { saved: true })).status, 500)
    } finally {
      log.mock.restore()
    }
  })
})
