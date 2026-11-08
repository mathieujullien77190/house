// Tests des images gardées toutes les minutes et de leur ménage.
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { test } from 'node:test'
import { createRecorder } from './recorder.ts'
import { createSnapshots } from './snapshots.ts'
import { testContext } from './testing.ts'

const setup = (answer: (path: string) => Response | Promise<Response>, cameras = ['cam']) => {
  const ctx = testContext((url) => answer(url.replace('http://rec1:8080', '')))
  const rec = createRecorder(ctx)
  for (const camera of cameras) rec.recorderOf.set(camera, 'http://rec1:8080')
  return { ctx, snapshot: createSnapshots(ctx, rec) }
}
const sec = (ms: number) => Math.floor(ms / 1000)

test('une image par caméra, au rythme de son réglage', async () => {
  const { ctx, snapshot } = setup(() => new Response('JPEG'))
  assert.equal(await snapshot(['cam']), 1)
  const at = sec(ctx.now())
  assert.equal(readFileSync(`${ctx.dir}/snapshots/cam/${at}.jpg`, 'utf8'), 'JPEG')
  assert.equal(ctx.calls[0]?.url, 'http://rec1:8080/api/cam/latest.jpg?h=720')
  assert.deepEqual(ctx.db.prepare('SELECT camera, taken_at, path FROM snapshots').all().map((r) => ({ ...r })), [{ camera: 'cam', taken_at: at, path: `snapshots/cam/${at}.jpg` }])
  ctx.time.advance(30_000)
  assert.equal(await snapshot(['cam']), 0)
  ctx.time.advance(30_000)
  assert.equal(await snapshot(['cam']), 1)
})

test('une caméra qui ne répond pas ne prive pas les autres de leur image', async () => {
  const { ctx, snapshot } = setup(
    (path) => {
      if (path.includes('/lente/')) throw new Error('délai')
      if (path.includes('/cassee/')) return new Response('', { status: 500 })
      return new Response('JPEG')
    },
    ['lente', 'cassee', 'bonne'],
  )
  assert.equal(await snapshot(['lente', 'cassee', 'bonne']), 1)
  assert.equal(existsSync(`${ctx.dir}/snapshots/bonne/${sec(ctx.now())}.jpg`), true)
  assert.equal(existsSync(`${ctx.dir}/snapshots/lente`), false)
})

test('le ménage retire les images de plus de 7 jours (fichiers et lignes), au plus une fois par minute', async () => {
  const { ctx, snapshot } = setup(() => new Response('JPEG'))
  const now = sec(ctx.now())
  mkdirSync(`${ctx.dir}/snapshots/cam`, { recursive: true })
  writeFileSync(`${ctx.dir}/snapshots/cam/vieille.jpg`, 'x')
  const insert = ctx.db.prepare('INSERT INTO snapshots (camera, taken_at, path) VALUES (?, ?, ?)')
  insert.run('cam', now - 8 * 86400, 'snapshots/cam/vieille.jpg')
  insert.run('cam', now - 9 * 86400, 'snapshots/cam/absente.jpg')
  insert.run('cam', now - 2 * 86400, 'snapshots/cam/recente.jpg')
  await snapshot([])
  assert.deepEqual(ctx.db.prepare('SELECT path FROM snapshots').all().map((r) => r.path), ['snapshots/cam/recente.jpg'])
  assert.equal(existsSync(`${ctx.dir}/snapshots/cam/vieille.jpg`), false)
  // Moins d'une minute plus tard, pas de nouveau ménage.
  insert.run('cam', now - 8 * 86400, 'snapshots/cam/encore.jpg')
  ctx.time.advance(30_000)
  await snapshot([])
  assert.equal(ctx.db.prepare('SELECT COUNT(*) AS n FROM snapshots').get()?.n, 2)
  ctx.time.advance(30_000)
  await snapshot([])
  assert.equal(ctx.db.prepare('SELECT COUNT(*) AS n FROM snapshots').get()?.n, 1)
})
