// Tests de la copie des clips et du ménage.
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { test } from 'node:test'
import { createClips, NOTHING_PURGED, parisNow, PURGE_DONE_KEY, saveResponse } from './clips.ts'
import { createRecorder } from './recorder.ts'
import type { RecorderEvent } from './recorder.ts'
import { testContext, type TestContext } from './testing.ts'

type Route = Response | (() => Response | Promise<Response>)

/** Un enregistreur simulé : les chemins connus répondent, le reste est introuvable. */
const setup = (routes: Record<string, Route> = {}, env: Record<string, string> = {}) => {
  const ctx = testContext((url) => {
    const route = routes[url.replace('http://rec1:8080', '')]
    if (route === undefined) return new Response('', { status: 404 })
    return typeof route === 'function' ? route() : route.clone()
  }, env)
  const rec = createRecorder(ctx)
  rec.recorderOf.set('cam', 'http://rec1:8080')
  mkdirSync(`${ctx.dir}/clips/cam`, { recursive: true })
  return { ctx, rec, clips: createClips(ctx, rec) }
}

const seconds = (ctx: TestContext) => Math.floor(ctx.now() / 1000)
const event = (ctx: TestContext, patch: Partial<RecorderEvent> = {}): RecorderEvent => ({
  id: 'ev1',
  camera: 'cam',
  label: 'oiseau',
  start_time: seconds(ctx) - 200,
  end_time: seconds(ctx) - 100,
  has_clip: true,
  ...patch,
})
const clipFile = (ctx: TestContext, name: string) => `${ctx.dir}/clips/cam/${name}`
const insertEvent = (ctx: TestContext, patch: Record<string, unknown> = {}) => {
  const row = { id: 'ev1', camera: 'cam', label: 'x', started_at: seconds(ctx) - 200, ended_at: seconds(ctx) - 100, clip_path: null, clip_web_path: null, clip_audio_path: null, clip_shapes_path: null, ...patch }
  ctx.db
    .prepare('INSERT INTO events (id, camera, label, started_at, ended_at, clip_path, clip_web_path, clip_audio_path, clip_shapes_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(row.id as string, row.camera as string, row.label as string, row.started_at as number, row.ended_at as number | null, row.clip_path as string | null, row.clip_web_path as string | null, row.clip_audio_path as string | null, row.clip_shapes_path as string | null)
}
const eventRow = (ctx: TestContext, id = 'ev1') => ctx.db.prepare('SELECT * FROM events WHERE id = ?').get(id)
const video = (start?: string) => new Response('VIDEO', { headers: start === undefined ? {} : { 'X-Clip-Start': start } })

test('saveResponse : écrit en flux dans un fichier renommé à la fin', async () => {
  const { ctx } = setup()
  await saveResponse(new Response('contenu'), `${ctx.dir}/a.mp4`)
  assert.equal(readFileSync(`${ctx.dir}/a.mp4`, 'utf8'), 'contenu')
  assert.equal(existsSync(`${ctx.dir}/a.mp4.part`), false)
})

test('saveResponse : sans corps, ou flux coupé, rien ne reste sous le vrai nom', async () => {
  const { ctx } = setup()
  await assert.rejects(saveResponse(new Response(null, { status: 200 }), `${ctx.dir}/b.mp4`), /sans corps/)
  const broken = new Response(new ReadableStream({ start: (controller) => controller.error(new Error('coupé')) }))
  await assert.rejects(saveResponse(broken, `${ctx.dir}/c.mp4`), /coupé/)
  assert.equal(existsSync(`${ctx.dir}/c.mp4`), false)
  assert.equal(existsSync(`${ctx.dir}/c.mp4.part`), false)
})

test('copyClip : copie le clip et rend son chemin et son début réel', async () => {
  const { ctx, clips } = setup({ '/api/events/ev1/clip.mp4': video('1234.5') })
  assert.deepEqual(await clips.copyClip(event(ctx)), { path: 'clips/cam/ev1.mp4', start: 1234.5 })
  assert.equal(readFileSync(clipFile(ctx, 'ev1.mp4'), 'utf8'), 'VIDEO')
})

test('copyClip : un début absent ou absurde donne null ; un événement en cours (sans fin) se copie', async () => {
  const { ctx, clips } = setup({ '/api/events/ev1/clip.mp4': video(), '/api/events/ev2/clip.mp4': video('0'), '/api/events/ev3/clip.mp4': video('abc') })
  assert.equal((await clips.copyClip(event(ctx)))?.start, null)
  assert.equal((await clips.copyClip(event(ctx, { id: 'ev2' })))?.start, null)
  assert.equal((await clips.copyClip(event(ctx, { id: 'ev3', end_time: null })))?.start, null)
})

test('copyClip : identifiant ou caméra suspects, réglage « jamais », fin trop récente : pas de copie', async () => {
  const { ctx, clips } = setup({ '/api/events/ev1/clip.mp4': video() })
  assert.equal(await clips.copyClip(event(ctx, { id: '../x' })), null)
  assert.equal(await clips.copyClip(event(ctx, { camera: 'a/b' })), null)
  assert.equal(await clips.copyClip(event(ctx, { end_time: seconds(ctx) - 5 })), null)
  assert.equal(ctx.calls.length, 0)
  ctx.settings.saveCameraSettings({ camera: 'cam', mode: 'off', fps: 25, light: 25, fpsMobile: 25, lightMobile: 25, sensitivity: 3, seconds: 60, orientation: 'landscape' })
  assert.equal(await clips.copyClip(event(ctx, { manual: false })), null)
  assert.equal(ctx.calls.length, 0)
})

test('copyClip : un clip lancé à la main est copié même si la caméra ne garde rien', async () => {
  const { ctx, clips } = setup({
    '/api/events/ev1/clip.mp4': video(),
    '/api/events/ev2': Response.json({ manual: true }),
    '/api/events/ev3': Response.json({ manual: false }),
    '/api/events/ev4': new Response('', { status: 500 }),
    '/api/events/ev5': () => {
      throw new Error('coupé')
    },
    '/api/events/ev2/clip.mp4': video(),
  })
  ctx.settings.saveCameraSettings({ camera: 'cam', mode: 'off', fps: 25, light: 25, fpsMobile: 25, lightMobile: 25, sensitivity: 3, seconds: 60, orientation: 'landscape' })
  assert.ok(await clips.copyClip(event(ctx, { manual: true })))
  // Le champ vient de la base : on le demande une fois à l'enregistreur, puis on s'en souvient.
  assert.ok(await clips.copyClip(event(ctx, { id: 'ev2' })))
  assert.ok(await clips.copyClip(event(ctx, { id: 'ev2' })))
  assert.equal(ctx.calls.filter((call) => call.url.endsWith('/api/events/ev2')).length, 1)
  assert.equal(await clips.copyClip(event(ctx, { id: 'ev3' })), null)
  assert.equal(await clips.copyClip(event(ctx, { id: 'ev4' })), null)
  assert.equal(await clips.copyClip(event(ctx, { id: 'ev5' })), null)
})

test('copyClip : indisponible, sans corps ou en échec, il est sauté et noté', async () => {
  const { ctx, clips } = setup({
    '/api/events/ev1/clip.mp4': new Response('', { status: 503 }),
    '/api/events/ev2/clip.mp4': new Response(null, { status: 200 }),
    '/api/events/ev3/clip.mp4': () => {
      throw 'réseau'
    },
  })
  assert.equal(await clips.copyClip(event(ctx)), null)
  assert.equal(await clips.copyClip(event(ctx, { id: 'ev2' })), null)
  assert.equal(await clips.copyClip(event(ctx, { id: 'ev3' })), null)
  assert.deepEqual(ctx.logs, ['Clip ev1 indisponible (HTTP 503)', 'Clip ev2 non copié : réponse sans corps', 'Clip ev3 non copié : réseau'])
})

test('retryMissingClips : retente les clips manquants de moins de 6 h, terminés depuis plus de 20 s', async () => {
  const { ctx, clips } = setup({ '/api/events/ok/clip.mp4': video('77'), '/api/events/ko/clip.mp4': new Response('', { status: 503 }) })
  const now = seconds(ctx)
  insertEvent(ctx, { id: 'ok' })
  insertEvent(ctx, { id: 'ko' })
  insertEvent(ctx, { id: 'recent', ended_at: now - 5 })
  insertEvent(ctx, { id: 'vieux', started_at: now - 7 * 3600, ended_at: now - 7 * 3600 + 10 })
  insertEvent(ctx, { id: 'copie', clip_path: 'clips/cam/copie.mp4' })
  assert.equal(await clips.retryMissingClips(), 1)
  assert.equal((eventRow(ctx, 'ok') as { clip_path: string }).clip_path, 'clips/cam/ok.mp4')
  assert.equal((eventRow(ctx, 'ok') as { clip_started_at: number }).clip_started_at, 77)
  assert.equal((eventRow(ctx, 'ko') as { clip_path: null }).clip_path, null)
})

test('syncWebClips : la copie légère de chaque clip copié', async () => {
  const { ctx, clips } = setup({
    '/api/events/ok/clip.h264.mp4': new Response('LEGER'),
    '/api/events/ko/clip.h264.mp4': new Response('', { status: 404 }),
    '/api/events/boom/clip.h264.mp4': new Response(null, { status: 200 }),
    '/api/events/exc/clip.h264.mp4': () => {
      throw 'chaîne'
    },
  })
  for (const id of ['ok', 'ko', 'boom', 'exc']) insertEvent(ctx, { id, clip_path: `clips/cam/${id}.mp4` })
  insertEvent(ctx, { id: '../mauvais', clip_path: 'clips/cam/x.mp4' })
  insertEvent(ctx, { id: 'cam2', camera: 'a/b', clip_path: 'clips/cam/y.mp4' })
  assert.equal(await clips.syncWebClips(), 1)
  assert.equal(readFileSync(clipFile(ctx, 'ok.h264.mp4'), 'utf8'), 'LEGER')
  assert.equal((eventRow(ctx, 'ok') as { clip_web_path: string }).clip_web_path, 'clips/cam/ok.h264.mp4')
  assert.deepEqual(ctx.logs, ['Copie légère boom non copiée : réponse sans corps', 'Copie légère exc non copiée : chaîne'])
})

test('syncAudioClips : le son, une fois la copie légère faite ; un 404 n\'est plus redemandé', async () => {
  const { ctx, clips } = setup({
    '/api/events/ok/clip.aac': new Response('AAC'),
    '/api/events/muet/clip.aac': new Response(null, { status: 404 }),
    '/api/events/muet2/clip.aac': new Response('', { status: 404 }),
    '/api/events/ko/clip.aac': new Response('', { status: 500 }),
    '/api/events/boom/clip.aac': new Response(null, { status: 200 }),
    '/api/events/exc/clip.aac': () => {
      throw new Error('coupé')
    },
  })
  for (const id of ['ok', 'muet', 'muet2', 'ko', 'boom', 'exc']) insertEvent(ctx, { id, clip_path: `clips/cam/${id}.mp4`, clip_web_path: `clips/cam/${id}.h264.mp4` })
  insertEvent(ctx, { id: '../mauvais', clip_path: 'clips/cam/x.mp4', clip_web_path: 'x' })
  insertEvent(ctx, { id: 'sansleger', clip_path: 'clips/cam/z.mp4' })
  assert.equal(await clips.syncAudioClips(), 1)
  assert.equal(readFileSync(clipFile(ctx, 'ok.aac'), 'utf8'), 'AAC')
  assert.equal((eventRow(ctx, 'ok') as { clip_audio_path: string }).clip_audio_path, 'clips/cam/ok.aac')
  const asked = ctx.calls.length
  await clips.syncAudioClips()
  // Le second tour ne redemande pas les deux clips sans son.
  assert.equal(ctx.calls.slice(asked).filter((call) => /muet/.test(call.url)).length, 0)
  assert.deepEqual(ctx.logs.slice(0, 2), ['Son boom non copié : réponse sans corps', 'Son exc non copié : coupé'])
})

test('syncShapesClips : les contours, une fois la copie légère faite ; un 404 n\'est plus redemandé', async () => {
  const { ctx, clips } = setup({
    '/api/events/ok/shapes.json': new Response('{"frames":[]}'),
    '/api/events/vieux/shapes.json': new Response(null, { status: 404 }),
    '/api/events/ko/shapes.json': new Response('', { status: 500 }),
    '/api/events/boom/shapes.json': new Response(null, { status: 200 }),
    '/api/events/exc/shapes.json': () => {
      throw new Error('coupé')
    },
  })
  for (const id of ['ok', 'vieux', 'ko', 'boom', 'exc']) insertEvent(ctx, { id, clip_path: `clips/cam/${id}.mp4`, clip_web_path: `clips/cam/${id}.h264.mp4` })
  insertEvent(ctx, { id: '../mauvais', clip_path: 'clips/cam/x.mp4', clip_web_path: 'x' })
  insertEvent(ctx, { id: 'sansleger', clip_path: 'clips/cam/z.mp4' })
  assert.equal(await clips.syncShapesClips(), 1)
  assert.equal(readFileSync(clipFile(ctx, 'ok.shapes.json'), 'utf8'), '{"frames":[]}')
  assert.equal((eventRow(ctx, 'ok') as { clip_shapes_path: string }).clip_shapes_path, 'clips/cam/ok.shapes.json')
  const asked = ctx.calls.length
  await clips.syncShapesClips()
  assert.equal(ctx.calls.slice(asked).filter((call) => /vieux/.test(call.url)).length, 0)
  assert.deepEqual(ctx.logs.slice(0, 2), ['Contours boom non copiés : réponse sans corps', 'Contours exc non copiés : coupé'])
})

test('syncShapesClips : un 404 dont le corps ne se laisse pas fermer n\'arrête rien', async () => {
  const stubborn = new Response(new ReadableStream({ cancel: () => Promise.reject(new Error('têtu')) }), { status: 404 })
  const { ctx, clips } = setup({ '/api/events/muet/shapes.json': () => stubborn })
  insertEvent(ctx, { id: 'muet', clip_path: 'clips/cam/muet.mp4', clip_web_path: 'clips/cam/muet.h264.mp4' })
  assert.equal(await clips.syncShapesClips(), 0)
})

const expired = (ctx: TestContext, id: string, patch: Record<string, unknown> = {}) =>
  insertEvent(ctx, { id, started_at: seconds(ctx) - 40 * 86400, ended_at: seconds(ctx) - 40 * 86400 + 30, clip_path: `clips/cam/${id}.mp4`, clip_web_path: `clips/cam/${id}.h264.mp4`, clip_audio_path: `clips/cam/${id}.aac`, clip_shapes_path: `clips/cam/${id}.shapes.json`, ...patch })

test('purgeOldClips : efface les clips non sauvegardés trop vieux, garde la trace de l\'événement', async () => {
  const { ctx, clips } = setup()
  ctx.time.set(Date.parse('2026-11-10T10:00:00Z'))
  mkdirSync(`${ctx.dir}/clips/cam`, { recursive: true })
  writeFileSync(`${ctx.dir}/saved.json`, JSON.stringify({ ids: ['garde'] }))
  for (const id of ['vieux', 'garde']) for (const suffix of ['.mp4', '.h264.mp4', '.aac', '.shapes.json']) writeFileSync(clipFile(ctx, `${id}${suffix}`), 'x')
  expired(ctx, 'vieux')
  expired(ctx, 'garde')
  // Un vieux clip dont les fichiers manquent déjà, un clip sans copie légère, un chemin inattendu, un clip récent.
  expired(ctx, 'absent')
  expired(ctx, 'nu', { clip_web_path: null, clip_audio_path: null })
  expired(ctx, 'louche', { clip_path: '../../etc/passwd', clip_web_path: null, clip_audio_path: null })
  insertEvent(ctx, { id: 'recent', clip_path: 'clips/cam/recent.mp4' })
  assert.equal((await clips.purgeOldClips()).clips, 4)
  assert.equal(existsSync(clipFile(ctx, 'vieux.mp4')), false)
  assert.equal(existsSync(clipFile(ctx, 'vieux.aac')), false)
  assert.equal(existsSync(clipFile(ctx, 'vieux.shapes.json')), false)
  assert.equal(existsSync(clipFile(ctx, 'garde.mp4')), true)
  // Son clip effacé, l'événement (plus vieux que la durée de garde) part avec lui ; celui au clip sauvegardé reste.
  assert.equal(eventRow(ctx, 'vieux'), undefined)
  assert.equal((eventRow(ctx, 'garde') as { clip_path: string }).clip_path, 'clips/cam/garde.mp4')
  assert.equal((eventRow(ctx, 'recent') as { clip_path: string }).clip_path, 'clips/cam/recent.mp4')
})

test('purgeOldClips : au plus toutes les 10 minutes ; liste illisible = rien d\'effacé', async () => {
  const { ctx, clips } = setup()
  ctx.time.set(Date.parse('2026-11-10T10:00:00Z'))
  ctx.config.savedClipsFile = `${ctx.dir}/absent/saved.json`
  expired(ctx, 'vieux')
  assert.deepEqual(await clips.purgeOldClips(), NOTHING_PURGED)
  assert.deepEqual(ctx.logs, ['Ménage des clips sauté : la liste des clips sauvegardés est illisible'])
  ctx.time.advance(60_000)
  ctx.config.savedClipsFile = `${ctx.dir}/saved.json`
  assert.deepEqual(await clips.purgeOldClips(), NOTHING_PURGED)
  ctx.time.advance(600_000)
  assert.equal((await clips.purgeOldClips()).clips, 1)
})

test('purgeOldClips : une fois par jour, à heure fixe (04:00 à Paris), pas avant, pas deux fois le même jour', async () => {
  const { ctx, clips } = setup()
  mkdirSync(`${ctx.dir}/clips/cam`, { recursive: true })
  writeFileSync(`${ctx.dir}/saved.json`, JSON.stringify({ ids: [] }))
  // 3 h 30 à Paris (2 h 30 UTC) : trop tôt, rien n'est fait.
  ctx.time.set(Date.parse('2026-11-10T02:30:00Z'))
  expired(ctx, 'un')
  assert.deepEqual(await clips.purgeOldClips(), NOTHING_PURGED)
  // 4 h 05 : le ménage passe.
  ctx.time.set(Date.parse('2026-11-10T03:05:00Z'))
  assert.equal((await clips.purgeOldClips()).clips, 1)
  // Plus tard le même jour : un autre clip trop vieux reste (c'est voulu, il partira demain).
  ctx.time.set(Date.parse('2026-11-10T15:00:00Z'))
  expired(ctx, 'deux')
  assert.deepEqual(await clips.purgeOldClips(), NOTHING_PURGED)
  // Le lendemain, après l'heure : il passe.
  ctx.time.set(Date.parse('2026-11-11T03:10:00Z'))
  assert.equal((await clips.purgeOldClips()).clips, 1)
})

test('le ménage du jour efface aussi images, journal Hue, événements sans clip et fusions, au-delà de la durée de garde', async () => {
  const { ctx, clips } = setup()
  ctx.time.set(Date.parse('2026-11-10T10:00:00Z'))
  writeFileSync(`${ctx.dir}/saved.json`, JSON.stringify({ ids: ['garde'] }))
  const now = seconds(ctx)
  const old = now - 40 * 86400
  const recent = now - 2 * 86400
  // Événements : un vieux sans clip (part), un vieux dont le clip part avec le ménage (part), un vieux au clip sauvegardé (reste), un récent sans clip (reste).
  expired(ctx, 'sans-clip', { clip_path: null, clip_web_path: null, clip_audio_path: null })
  expired(ctx, 'efface')
  expired(ctx, 'garde')
  insertEvent(ctx, { id: 'recent', started_at: recent, ended_at: recent + 30 })
  // Images, journal Hue, fusions.
  const snap = ctx.db.prepare('INSERT INTO snapshots (camera, taken_at, path) VALUES (?, ?, ?)')
  snap.run('cam', old, 'snapshots/cam/vieille.jpg')
  snap.run('cam', recent, 'snapshots/cam/recente.jpg')
  const hue = ctx.db.prepare("INSERT INTO hue_events (happened_at, happened_ms, resource, resource_id, name, change, origin, detail) VALUES (?, ?, 'light', 'L', 'n', '{}', 'unknown', '')")
  hue.run(old, old * 1000)
  hue.run(recent, recent * 1000)
  const merge = ctx.db.prepare('INSERT INTO merges (absorbed_id, kept_id, camera, absorbed_started_at, absorbed_ended_at, merged_at) VALUES (?, ?, ?, ?, ?, ?)')
  merge.run('a1', 'k', 'cam', old, old + 5, old)
  merge.run('a2', 'k', 'cam', recent, recent + 5, recent)
  assert.deepEqual(await clips.purgeOldClips(), { clips: 1, snapshots: 1, journal: 1, events: 2, merges: 1 })
  assert.deepEqual(ctx.db.prepare('SELECT id FROM events ORDER BY id').all().map((r) => r.id), ['garde', 'recent'])
  assert.equal((eventRow(ctx, 'garde') as { clip_path: string }).clip_path, 'clips/cam/garde.mp4')
  assert.deepEqual(ctx.db.prepare('SELECT path FROM snapshots').all().map((r) => r.path), ['snapshots/cam/recente.jpg'])
  assert.equal(ctx.db.prepare('SELECT COUNT(*) AS n FROM hue_events').get()?.n, 1)
  assert.deepEqual(ctx.db.prepare('SELECT absorbed_id FROM merges').all().map((r) => r.absorbed_id), ['a2'])
})

test('liste des clips sauvegardés illisible : rien du tout n est effacé et le jour n est pas marqué fait', async () => {
  const { ctx, clips } = setup()
  ctx.time.set(Date.parse('2026-11-10T10:00:00Z'))
  ctx.config.savedClipsFile = `${ctx.dir}/absent/saved.json`
  const old = seconds(ctx) - 40 * 86400
  expired(ctx, 'sans-clip', { clip_path: null, clip_web_path: null, clip_audio_path: null })
  ctx.db.prepare('INSERT INTO snapshots (camera, taken_at, path) VALUES (?, ?, ?)').run('cam', old, 'snapshots/cam/vieille.jpg')
  ctx.db.prepare('INSERT INTO merges (absorbed_id, kept_id, camera, absorbed_started_at, absorbed_ended_at, merged_at) VALUES (?, ?, ?, ?, ?, ?)').run('a1', 'k', 'cam', old, old + 5, old)
  assert.deepEqual(await clips.purgeOldClips(), NOTHING_PURGED)
  for (const table of ['events', 'snapshots', 'merges']) assert.equal(ctx.db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get()?.n, 1)
  assert.equal(ctx.db.prepare('SELECT COUNT(*) AS n FROM app_settings WHERE key = ?').get(PURGE_DONE_KEY)?.n, 0)
})

test('parisNow : le jour et la minute à l’heure de Paris (heure d’été comprise)', () => {
  assert.deepEqual(parisNow(Date.parse('2026-11-10T23:30:00Z')), { day: '2026-11-11', minutes: 30 })
  assert.deepEqual(parisNow(Date.parse('2026-07-10T02:00:00Z')), { day: '2026-07-10', minutes: 240 })
})

test('purgeOldClips : un fichier qui ne s\'efface pas garde sa ligne pour le prochain ménage', async () => {
  const { ctx, clips } = setup()
  ctx.time.set(Date.parse('2026-11-10T10:00:00Z'))
  // Le « fichier » est un dossier : unlink échoue autrement que par ENOENT.
  mkdirSync(clipFile(ctx, 'bloque.mp4'), { recursive: true })
  expired(ctx, 'bloque', { clip_web_path: null, clip_audio_path: null })
  assert.equal((await clips.purgeOldClips()).clips, 0)
  assert.equal((eventRow(ctx, 'bloque') as { clip_path: string }).clip_path, 'clips/cam/bloque.mp4')
})

test('saveResponse : un dossier absent fait échouer l\'écriture, sans fichier temporaire à nettoyer', async () => {
  const { ctx } = setup()
  await assert.rejects(saveResponse(new Response('x'), `${ctx.dir}/absent/d.mp4`), /ENOENT/)
})

test('syncAudioClips : un 404 dont le corps ne se laisse pas fermer n\'arrête rien', async () => {
  const stubborn = new Response(new ReadableStream({ cancel: () => Promise.reject(new Error('têtu')) }), { status: 404 })
  const { ctx, clips } = setup({ '/api/events/muet/clip.aac': () => stubborn })
  insertEvent(ctx, { id: 'muet', clip_path: 'clips/cam/muet.mp4', clip_web_path: 'clips/cam/muet.h264.mp4' })
  assert.equal(await clips.syncAudioClips(), 0)
})
