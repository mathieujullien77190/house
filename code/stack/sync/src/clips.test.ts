// Tests de la copie des clips et du ménage.
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { test } from 'node:test'
import { createClips, saveResponse } from './clips.ts'
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
  const row = { id: 'ev1', camera: 'cam', label: 'x', started_at: seconds(ctx) - 200, ended_at: seconds(ctx) - 100, clip_path: null, clip_web_path: null, clip_audio_path: null, ...patch }
  ctx.db
    .prepare('INSERT INTO events (id, camera, label, started_at, ended_at, clip_path, clip_web_path, clip_audio_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(row.id as string, row.camera as string, row.label as string, row.started_at as number, row.ended_at as number | null, row.clip_path as string | null, row.clip_web_path as string | null, row.clip_audio_path as string | null)
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

const expired = (ctx: TestContext, id: string, patch: Record<string, unknown> = {}) =>
  insertEvent(ctx, { id, started_at: seconds(ctx) - 40 * 86400, ended_at: seconds(ctx) - 40 * 86400 + 30, clip_path: `clips/cam/${id}.mp4`, clip_web_path: `clips/cam/${id}.h264.mp4`, clip_audio_path: `clips/cam/${id}.aac`, ...patch })

test('purgeOldClips : efface les clips non sauvegardés trop vieux, garde la trace de l\'événement', async () => {
  const { ctx, clips } = setup()
  mkdirSync(`${ctx.dir}/clips/cam`, { recursive: true })
  writeFileSync(`${ctx.dir}/saved.json`, JSON.stringify({ ids: ['garde'] }))
  for (const id of ['vieux', 'garde']) for (const suffix of ['.mp4', '.h264.mp4', '.aac']) writeFileSync(clipFile(ctx, `${id}${suffix}`), 'x')
  expired(ctx, 'vieux')
  expired(ctx, 'garde')
  // Un vieux clip dont les fichiers manquent déjà, un clip sans copie légère, un chemin inattendu, un clip récent.
  expired(ctx, 'absent')
  expired(ctx, 'nu', { clip_web_path: null, clip_audio_path: null })
  expired(ctx, 'louche', { clip_path: '../../etc/passwd', clip_web_path: null, clip_audio_path: null })
  insertEvent(ctx, { id: 'recent', clip_path: 'clips/cam/recent.mp4' })
  assert.equal(await clips.purgeOldClips(), 4)
  assert.equal(existsSync(clipFile(ctx, 'vieux.mp4')), false)
  assert.equal(existsSync(clipFile(ctx, 'vieux.aac')), false)
  assert.equal(existsSync(clipFile(ctx, 'garde.mp4')), true)
  const row = eventRow(ctx, 'vieux') as { clip_path: null; clip_web_path: null; clip_audio_path: null }
  assert.deepEqual([row.clip_path, row.clip_web_path, row.clip_audio_path], [null, null, null])
  assert.equal((eventRow(ctx, 'garde') as { clip_path: string }).clip_path, 'clips/cam/garde.mp4')
  assert.equal((eventRow(ctx, 'recent') as { clip_path: string }).clip_path, 'clips/cam/recent.mp4')
})

test('purgeOldClips : au plus toutes les 10 minutes ; liste illisible = rien d\'effacé', async () => {
  const { ctx, clips } = setup()
  ctx.config.savedClipsFile = `${ctx.dir}/absent/saved.json`
  expired(ctx, 'vieux')
  assert.equal(await clips.purgeOldClips(), 0)
  assert.deepEqual(ctx.logs, ['Ménage des clips sauté : la liste des clips sauvegardés est illisible'])
  ctx.time.advance(60_000)
  ctx.config.savedClipsFile = `${ctx.dir}/saved.json`
  assert.equal(await clips.purgeOldClips(), 0)
  ctx.time.advance(600_000)
  assert.equal(await clips.purgeOldClips(), 1)
})

test('purgeOldClips : un fichier qui ne s\'efface pas garde sa ligne pour le prochain ménage', async () => {
  const { ctx, clips } = setup()
  // Le « fichier » est un dossier : unlink échoue autrement que par ENOENT.
  mkdirSync(clipFile(ctx, 'bloque.mp4'), { recursive: true })
  expired(ctx, 'bloque', { clip_web_path: null, clip_audio_path: null })
  assert.equal(await clips.purgeOldClips(), 0)
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
