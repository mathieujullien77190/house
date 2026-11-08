// Tests de la lecture des caméras de l'enregistreur.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createRecorder } from './recorder.ts'
import { testContext } from './testing.ts'

const CONFIG = {
  cameras: {
    'voliere-exterieur': { live: { go2rtc: 'http://go2rtc-a:1984/', streams: { main: 'ext_main', sub: 'ext_sub' } } },
    'voliere-interieur': {},
    'mauvais nom!': {},
  },
}

test('syncCameras : l\'image et le direct de chaque caméra, l\'enregistreur qui la gère', async () => {
  const ctx = testContext((url) => (url === 'http://rec1:8080/api/config' ? Response.json(CONFIG) : new Response('', { status: 404 })))
  const rec = createRecorder(ctx)
  const result = await rec.syncCameras()
  assert.deepEqual([...result], [['http://rec1:8080', ['voliere-exterieur', 'voliere-interieur']]])
  assert.equal(rec.recorderOf.get('voliere-interieur'), 'http://rec1:8080')
  assert.equal(rec.recorderOf.get('mauvais nom!'), undefined)
  const images = ctx.db.prepare('SELECT camera, url FROM last_images ORDER BY camera').all()
  assert.deepEqual(images.map((row) => row.url), ['http://rec1:8080/api/voliere-exterieur/latest.jpg', 'http://rec1:8080/api/voliere-interieur/latest.jpg'])
  const lives = ctx.db.prepare('SELECT url FROM live_streams ORDER BY camera').all().map((row) => row.url)
  assert.deepEqual(lives, ['http://go2rtc-a:1984/live?src=ext_main', 'http://rec1:8080/live?src=voliere-interieur'])
  // Un second tour met à jour les mêmes lignes.
  await rec.syncCameras()
  assert.equal(ctx.db.prepare('SELECT COUNT(*) AS n FROM last_images').get()?.n, 2)
})

test('syncCameras : un enregistreur qui ne répond pas est signalé sans bloquer les autres', async () => {
  const ctx = testContext(
    (url) => {
      if (url.startsWith('http://b:2')) return Response.json({ cameras: { cam: {} } })
      if (url.startsWith('http://a:1')) return new Response('', { status: 500 })
      throw 'réseau coupé'
    },
    { RECORDER_URLS: 'http://a:1,http://b:2,http://c:3' },
  )
  const rec = createRecorder(ctx)
  const result = await rec.syncCameras()
  assert.deepEqual([...result], [['http://b:2', ['cam']]])
  assert.deepEqual(ctx.logs, ['Enregistreur http://a:1 : config : HTTP 500', 'Enregistreur http://c:3 : réseau coupé'])
})

test('recorder : 503 pour une caméra inconnue, sinon la requête part chez son enregistreur avec un délai', async () => {
  const ctx = testContext(() => new Response('image', { status: 200 }))
  const rec = createRecorder(ctx)
  assert.equal((await rec.recorder('cam', '/x')).status, 503)
  assert.equal(ctx.calls.length, 0)
  rec.recorderOf.set('cam', 'http://rec1:8080')
  const res = await rec.recorder('cam', '/api/cam/latest.jpg', 5000)
  assert.equal(await res.text(), 'image')
  assert.equal(ctx.calls[0]?.url, 'http://rec1:8080/api/cam/latest.jpg')
  assert.equal((await rec.recorder('cam', '/y')).status, 200)
})
