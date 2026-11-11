// Tests des événements : terminés avec clip, en cours, fusions.
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { test } from 'node:test'
import { createClips } from './clips.ts'
import { createEvents } from './events.ts'
import { createRecorder, type RecorderEvent } from './recorder.ts'
import { testContext, type TestContext } from './testing.ts'

const BASE = 'http://rec1:8080'

/** Un enregistreur simulé : `answer` reçoit le chemin (avec la requête) et rend la réponse. */
const setup = (answer: (path: string) => Response | Promise<Response>) => {
  const ctx = testContext((url) => answer(url.replace(BASE, '')))
  const rec = createRecorder(ctx)
  rec.recorderOf.set('cam', BASE)
  mkdirSync(`${ctx.dir}/clips/cam`, { recursive: true })
  const clips = createClips(ctx, rec)
  return { ctx, events: createEvents(ctx, rec, clips) }
}

const now = (ctx: TestContext) => Math.floor(ctx.now() / 1000)
const ev = (ctx: TestContext, id: string, patch: Partial<RecorderEvent> = {}): RecorderEvent => ({
  id,
  camera: 'cam',
  label: 'oiseau',
  start_time: now(ctx) - 1000,
  end_time: now(ctx) - 900,
  has_clip: true,
  ...patch,
})
const row = (ctx: TestContext, id: string) => ctx.db.prepare('SELECT * FROM events WHERE id = ?').get(id) as Record<string, unknown> | undefined
const seed = (ctx: TestContext, id: string, patch: Record<string, unknown> = {}) => {
  const r = { camera: 'cam', started_at: now(ctx) - 1000, ended_at: now(ctx) - 900 as number | null, ...patch }
  ctx.db.prepare('INSERT INTO events (id, camera, label, started_at, ended_at) VALUES (?, ?, ?, ?, ?)').run(id, r.camera as string, 'x', r.started_at as number, r.ended_at as number | null)
}

test('syncEvents : copie les événements terminés, du plus ancien au plus récent, et complète les connus en cours', async () => {
  const ref: { ctx?: TestContext } = {}
  const { ctx, events } = setup((path) => {
    if (path.includes('/clip.mp4')) return new Response('V', { headers: { 'X-Clip-Start': '5' } })
    return Response.json([ev(ref.ctx as TestContext, 'b'), ev(ref.ctx as TestContext, 'fini'), ev(ref.ctx as TestContext, 'a', { end_time: null, has_clip: false })])
  })
  ref.ctx = ctx
  seed(ctx, 'fini')
  seed(ctx, 'a', { ended_at: null })
  assert.equal(await events.syncEvents(BASE, ['cam']), 2)
  assert.equal(row(ctx, 'fini')?.clip_path, null)
  assert.equal(row(ctx, 'b')?.clip_path, 'clips/cam/b.mp4')
  assert.equal(row(ctx, 'b')?.clip_started_at, 5)
  assert.equal(row(ctx, 'a')?.ended_at, null)
  assert.equal(row(ctx, 'a')?.clip_path, 'clips/cam/a.mp4')
  assert.equal(ctx.calls[0]?.url, `${BASE}/api/events?after=${now(ctx) - 4600}&has_clip=1&in_progress=0&limit=50`)
})

test('syncEvents : repart une heure avant le dernier événement connu de cet enregistreur', async () => {
  const { ctx, events } = setup(() => Response.json([]))
  seed(ctx, 'cam1', { started_at: 100_000 })
  seed(ctx, 'ailleurs', { camera: 'autre', started_at: 500_000 })
  await events.syncEvents(BASE, ['cam'])
  assert.match(ctx.calls[0]?.url ?? '', /after=96400&/)
})

test('syncEvents : plusieurs pages de 50, puis le plus ancien attend au-delà de 20 pages', async () => {
  const page = (count: number, from: number) => Array.from({ length: count }, (_, i) => ({ id: `e ${from + i}`, camera: 'cam', label: 'x', start_time: 5000 - (from + i), end_time: null, has_clip: true }))
  const first = setup((path) => (path.includes('before=') ? Response.json(page(3, 50)) : Response.json(page(50, 0))))
  assert.equal(await first.events.syncEvents(BASE, ['cam']), 53)
  assert.match(first.ctx.calls[1]?.url ?? '', /before=4951/)
  const endless = setup(() => Response.json(page(50, 0)))
  await endless.events.syncEvents(BASE, ['cam'])
  assert.equal(endless.ctx.calls.length, 20)
  assert.deepEqual(endless.ctx.logs, ['Plus de 1000 événements à rattraper : les plus anciens attendront'])
})

test('syncEvents : un refus de l\'enregistreur remonte', async () => {
  const { events } = setup(() => new Response('', { status: 500 }))
  await assert.rejects(events.syncEvents(BASE, ['cam']), /events : HTTP 500/)
})

test('syncOngoingEvents : insère les événements en cours, termine ou efface ceux que l\'enregistreur ne donne plus', async () => {
  const ref: { ctx?: TestContext } = {}
  const c = () => ref.ctx as TestContext
  const { ctx, events } = setup((path) => {
    if (path.startsWith('/api/events?in_progress=1')) return Response.json([ev(c(), 'nouveau', { end_time: null }), ev(c(), 'connu', { end_time: null })])
    if (path === '/api/events/fini') return Response.json(ev(c(), 'fini'))
    if (path === '/api/events/fini-sans-clip') return Response.json(ev(c(), 'fini-sans-clip', { has_clip: false }))
    if (path === '/api/events/encore') return Response.json(ev(c(), 'encore', { end_time: null }))
    if (path === '/api/events/panne') return new Response('', { status: 500 })
    if (path.includes('/clip.mp4')) return new Response('V')
    return new Response('', { status: 404 })
  })
  ref.ctx = ctx
  for (const id of ['connu', 'fini', 'fini-sans-clip', 'encore', 'panne', 'disparu']) seed(ctx, id, { ended_at: null })
  seed(ctx, 'ailleurs', { camera: 'autre', ended_at: null })
  assert.equal(await events.syncOngoingEvents(BASE, ['cam']), 2)
  assert.equal(row(ctx, 'nouveau')?.ended_at, null)
  assert.equal(row(ctx, 'fini')?.clip_path, 'clips/cam/fini.mp4')
  assert.notEqual(row(ctx, 'fini')?.ended_at, null)
  assert.notEqual(row(ctx, 'fini-sans-clip')?.ended_at, null)
  assert.equal(row(ctx, 'fini-sans-clip')?.clip_path, null)
  assert.equal(row(ctx, 'encore')?.ended_at, null)
  assert.equal(row(ctx, 'panne')?.ended_at, null)
  assert.equal(row(ctx, 'disparu'), undefined)
  assert.equal(row(ctx, 'ailleurs')?.ended_at, null)
  assert.equal(ctx.calls.some((call) => call.url.endsWith('/api/events/ailleurs')), false)
})

test('syncOngoingEvents : un refus de l\'enregistreur remonte', async () => {
  const { events } = setup(() => new Response('', { status: 500 }))
  await assert.rejects(events.syncOngoingEvents(BASE, ['cam']), /events in progress : HTTP 500/)
})

test('syncMerges : l\'absorbé quitte la base et le disque, le survivant est recopié', async () => {
  const ref: { ctx?: TestContext } = {}
  const c = () => ref.ctx as TestContext
  const { ctx, events } = setup((path) => {
    if (path.startsWith('/api/events?merged_after=')) {
      return Response.json([
        ev(c(), 'absorbe', { merged_into: 'survivant', merged_at: 1234 }),
        ev(c(), 'absorbe2', { merged_into: 'survivant', end_time: null }),
        ev(c(), 'inconnu', { merged_into: 'survivant' }),
        ev(c(), 'survivant', { end_time: now(c()) - 500 }),
        ev(c(), 'complet', { end_time: now(c()) - 900 }),
        ev(c(), 'sans-clip', { has_clip: false }),
        ev(c(), 'en-cours', { end_time: null }),
        ev(c(), 'nouveau-fichier', { end_time: now(c()) - 300 }),
        ev(c(), 'indispo', { end_time: now(c()) - 300 }),
        ev(c(), '../louche'),
        ev(c(), 'ailleurs', { camera: 'autre', merged_into: 'x' }),
        ev(c(), 'jamais-vu'),
      ])
    }
    if (path.includes('/nouveau-fichier/clip.mp4')) return new Response('V', { headers: { 'X-Clip-Start': '9' } })
    if (path.includes('/survivant/clip.mp4')) return new Response('V', { headers: { 'X-Clip-Start': '9' } })
    return new Response('', { status: 503 })
  })
  ref.ctx = ctx
  seed(ctx, 'absorbe')
  seed(ctx, 'absorbe2')
  for (const suffix of ['.mp4', '.h264.mp4', '.aac']) writeFileSync(`${ctx.dir}/clips/cam/absorbe${suffix}`, 'x')
  seed(ctx, 'survivant')
  seed(ctx, 'complet')
  seed(ctx, 'sans-clip')
  seed(ctx, 'en-cours')
  seed(ctx, 'nouveau-fichier', { ended_at: null })
  seed(ctx, 'indispo')
  ctx.db.exec("UPDATE events SET clip_web_path = 'w', clip_audio_path = 'a', clip_shapes_path = 's' WHERE id = 'survivant'")
  assert.equal(await events.syncMerges(BASE, ['cam']), 4)
  assert.equal(row(ctx, 'absorbe'), undefined)
  assert.equal(existsSync(`${ctx.dir}/clips/cam/absorbe.mp4`), false)
  assert.equal(existsSync(`${ctx.dir}/clips/cam/absorbe.aac`), false)
  const merges = ctx.db.prepare('SELECT absorbed_id, kept_id, merged_at, absorbed_ended_at FROM merges ORDER BY absorbed_id').all()
  assert.deepEqual(merges.map((m) => [m.absorbed_id, m.kept_id, m.merged_at === 1234 || m.absorbed_id === 'absorbe2' ? 'ok' : 'x', m.absorbed_ended_at === null]), [
    ['absorbe', 'survivant', 'ok', false],
    ['absorbe2', 'survivant', 'ok', true],
  ])
  assert.equal(row(ctx, 'survivant')?.clip_path, 'clips/cam/survivant.mp4')
  assert.equal(row(ctx, 'survivant')?.clip_web_path, null)
  assert.equal(row(ctx, 'survivant')?.clip_audio_path, null)
  assert.equal(row(ctx, 'survivant')?.clip_shapes_path, null)
  assert.equal(row(ctx, 'complet')?.clip_path, null)
  assert.equal(row(ctx, 'nouveau-fichier')?.clip_path, 'clips/cam/nouveau-fichier.mp4')
  assert.equal(row(ctx, 'indispo')?.clip_path, null)
  assert.equal(row(ctx, 'jamais-vu'), undefined)
})

test('syncMerges : un refus de l\'enregistreur remonte', async () => {
  const { events } = setup(() => new Response('', { status: 500 }))
  await assert.rejects(events.syncMerges(BASE, ['cam']), /events fusionnés : HTTP 500/)
})
