// Tests de la recherche des yeux qui brillent : node --test.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createEyes } from './eyes.ts'
import { createRecorder } from './recorder.ts'
import { createSnapshots, purgeSnapshots } from './snapshots.ts'
import { testContext, type TestContext } from './testing.ts'

const NIGHT = Date.UTC(2026, 10, 9, 23, 0, 0)
const found = { found: true, pair: true, distance: 10, eyes: [{ x: 100, y: 50, size: 5, peak: 255, contrast: 190 }] }

const setup = (answer: (path: string, init?: RequestInit) => Response | Promise<Response>, mode = 'on') => {
  const ctx = testContext((url, init) => answer(url.replace('http://rec1:8080', ''), init))
  ctx.time.set(NIGHT)
  ctx.settings.saveCameraSettings({ camera: 'cam', mode: 'always', fps: 10, light: 5, fpsMobile: 4, lightMobile: 3, sensitivity: 3, seconds: 5, orientation: 'landscape', eyes: mode })
  const rec = createRecorder(ctx)
  rec.recorderOf.set('cam', 'http://rec1:8080')
  return { ctx, rec, eyes: createEyes(ctx, rec) }
}
const rows = (ctx: TestContext) => ctx.db.prepare('SELECT camera, taken_at, path, x, y, size, peak, contrast, pair, distance FROM eye_detections ORDER BY taken_at').all().map((row) => ({ ...row }))
const sec = (ctx: TestContext) => Math.floor(ctx.now() / 1000)

test('une image où l’enregistreur trouve un œil : une ligne et une ligne de journal', async () => {
  const { ctx, eyes } = setup(() => Response.json(found))
  await eyes.look('cam', sec(ctx), 'snapshots/cam/1.jpg', Buffer.from('JPEG'))
  assert.deepEqual(rows(ctx), [{ camera: 'cam', taken_at: sec(ctx), path: 'snapshots/cam/1.jpg', x: 100, y: 50, size: 5, peak: 255, contrast: 190, pair: 1, distance: 10 }])
  assert.equal(ctx.calls[0]?.url, 'http://rec1:8080/api/eyes')
  assert.equal(ctx.calls[0]?.method, 'POST')
  // un œil lance un événement de mouvement de la caméra
  assert.deepEqual([ctx.calls[1]?.url, ctx.calls[1]?.method], ['http://rec1:8080/api/cameras/cam/trigger?reason=eyes', 'POST'])
  assert.match(ctx.logs.at(-1) ?? '', /Yeux qui brillent sur cam en \(100, 50\), une paire : snapshots\/cam\/1\.jpg/)
})

test('au plus une détection par caméra et par minute', async () => {
  const { ctx, eyes } = setup(() => Response.json({ ...found, pair: false, distance: 0 }))
  const t = sec(ctx)
  await eyes.look('cam', t, 'a.jpg', Buffer.from('J'))
  await eyes.look('cam', t + 30, 'b.jpg', Buffer.from('J'))
  await eyes.look('cam', t + 60, 'c.jpg', Buffer.from('J'))
  assert.deepEqual(rows(ctx).map((row) => [row.path, row.pair]), [['a.jpg', 0], ['c.jpg', 0]])
})

test('rien n’est envoyé en mode off ni en plein jour ; rien n’est écrit sans œil', async () => {
  const off = setup(() => Response.json(found), 'off')
  await off.eyes.look('cam', sec(off.ctx), 'a.jpg', Buffer.from('J'))
  assert.equal(off.ctx.calls.length, 0)
  const day = setup(() => Response.json(found))
  day.ctx.time.set(Date.UTC(2026, 10, 9, 12, 0, 0))
  await day.eyes.look('cam', sec(day.ctx), 'a.jpg', Buffer.from('J'))
  assert.equal(day.ctx.calls.length, 0)
  const none = setup(() => Response.json({ found: false, pair: false, distance: 0, eyes: [] }))
  await none.eyes.look('cam', sec(none.ctx), 'a.jpg', Buffer.from('J'))
  assert.equal(none.ctx.calls.length, 1)
  assert.deepEqual(rows(none.ctx), [])
  const bare = setup(() => Response.json({ found: true, eyes: [{ x: 1, y: 2, size: 3, peak: 255, contrast: 100 }] }))
  await bare.eyes.look('cam', sec(bare.ctx), 'a.jpg', Buffer.from('J'))
  assert.deepEqual(rows(bare.ctx).map((row) => [row.pair, row.distance]), [[0, 0]])
  const empty = setup(() => Response.json({ found: true }))
  await empty.eyes.look('cam', sec(empty.ctx), 'a.jpg', Buffer.from('J'))
  assert.deepEqual(rows(empty.ctx), [])
})

test('une panne de l’enregistreur est écrite une fois, jamais bloquante, et le retour à la normale la réarme', async () => {
  let mode: 'down' | 'error' | 'ok' = 'down'
  const { ctx, eyes } = setup(() => {
    if (mode === 'down') throw new Error('délai')
    return mode === 'error' ? new Response('', { status: 500 }) : Response.json(found)
  })
  const t = sec(ctx)
  await eyes.look('cam', t, 'a.jpg', Buffer.from('J'))
  await eyes.look('cam', t + 5, 'b.jpg', Buffer.from('J'))
  assert.equal(ctx.logs.filter((line) => line.includes('recherche impossible')).length, 1)
  mode = 'ok'
  await eyes.look('cam', t + 10, 'c.jpg', Buffer.from('J'))
  mode = 'error'
  await eyes.look('cam', t + 80, 'd.jpg', Buffer.from('J'))
  assert.equal(ctx.logs.filter((line) => line.includes('recherche impossible')).length, 2)
  assert.match(ctx.logs.filter((line) => line.includes('recherche impossible')).at(-1) ?? '', /HTTP 500/)
  assert.equal(rows(ctx).length, 1)
  // une caméra dont l'enregistreur est inconnu
  await eyes.look('cam', t + 200, 'e.jpg', Buffer.from('J'))
  const unknown = setup(() => Response.json(found))
  unknown.rec.recorderOf.delete('cam')
  await unknown.eyes.look('cam', sec(unknown.ctx), 'a.jpg', Buffer.from('J'))
  assert.match(unknown.ctx.logs.at(-1) ?? '', /enregistreur inconnu/)
})

test('les images prises la nuit passent par la recherche, et le ménage garde celles où l’on a vu des yeux', async () => {
  const { ctx, rec } = setup((path) => (path.startsWith('/api/eyes') ? Response.json(found) : new Response('JPEG')))
  const snapshot = createSnapshots(ctx, rec)
  assert.equal(await snapshot(['cam']), 1)
  const at = sec(ctx)
  assert.equal(rows(ctx).length, 1)
  assert.equal(rows(ctx)[0].path, `snapshots/cam/${at}.jpg`)
  // même durée de garde : l'image des yeux et sa ligne partent ensemble au ménage, la récente reste
  const insert = ctx.db.prepare('INSERT INTO snapshots (camera, taken_at, path) VALUES (?, ?, ?)')
  insert.run('cam', at - 20 * 86400, 'snapshots/cam/old.jpg')
  ctx.db.prepare('INSERT INTO snapshots (camera, taken_at, path) VALUES (?, ?, ?)').run('cam', at - 10 * 86400, 'snapshots/cam/yeux.jpg')
  ctx.db.prepare('INSERT INTO eye_detections (camera, taken_at, path, x, y, size, peak, contrast) VALUES (?, ?, ?, 1, 1, 3, 255, 100)').run('cam', at - 10 * 86400, 'snapshots/cam/yeux.jpg')
  assert.equal(await purgeSnapshots(ctx, at - 7 * 86400), 2)
  assert.deepEqual(ctx.db.prepare('SELECT path FROM snapshots').all().map((r) => r.path), [`snapshots/cam/${at}.jpg`])
  assert.equal(rows(ctx).length, 1)
})

test('l’événement de mouvement est déclenché au plus toutes les 30 s par caméra, même quand la ligne de détection est déjà écrite', async () => {
  const { ctx, eyes } = setup(() => Response.json(found))
  const triggers = () => ctx.calls.filter((call) => call.url.includes('/trigger')).length
  const t = sec(ctx)
  await eyes.look('cam', t, 'a.jpg', Buffer.from('J'))
  await eyes.look('cam', t + 10, 'b.jpg', Buffer.from('J'))
  await eyes.look('cam', t + 29, 'c.jpg', Buffer.from('J'))
  assert.equal(triggers(), 1)
  await eyes.look('cam', t + 30, 'd.jpg', Buffer.from('J'))
  assert.equal(triggers(), 2)
})

test('un déclenchement qui échoue est toléré, écrit une fois, et la ligne de détection est quand même gardée', async () => {
  let triggerAnswer: 'error' | 'down' | 'ok' = 'error'
  const { ctx, eyes } = setup((path) => {
    if (!path.includes('/trigger')) return Response.json(found)
    if (triggerAnswer === 'down') throw new Error('coupé')
    return triggerAnswer === 'error' ? new Response('', { status: 500 }) : Response.json({})
  })
  const t = sec(ctx)
  await eyes.look('cam', t, 'a.jpg', Buffer.from('J'))
  await eyes.look('cam', t + 40, 'b.jpg', Buffer.from('J'))
  const failures = () => ctx.logs.filter((line) => line.includes('événement non déclenché'))
  assert.equal(failures().length, 1)
  assert.match(failures()[0], /HTTP 500/)
  assert.equal(rows(ctx).length, 1)
  triggerAnswer = 'ok'
  await eyes.look('cam', t + 80, 'c.jpg', Buffer.from('J'))
  triggerAnswer = 'down'
  await eyes.look('cam', t + 120, 'd.jpg', Buffer.from('J'))
  assert.equal(failures().length, 2)
  assert.match(failures()[1], /coupé/)
  assert.equal(rows(ctx).length, 2)
})
