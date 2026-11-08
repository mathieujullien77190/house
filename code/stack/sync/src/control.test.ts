// Tests de ce que House Sync commande : détection, sensibilité, zone, cadence des directs.
import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { test } from 'node:test'
import { createControl } from './control.ts'
import { testContext } from './testing.ts'

const BASE = 'http://rec1:8080'
const SQUARE = [[0, 0], [1, 0], [0, 1]]

test('syncDetection : envoie détection, sensibilité et zone, puis seulement quand ça change ou chaque minute', async () => {
  const ctx = testContext(() => new Response('ok'))
  writeFileSync(`${ctx.dir}/zones.json`, JSON.stringify({ cam: SQUARE }))
  const control = createControl(ctx)
  await control.syncDetection(BASE, ['cam', 'autre'])
  assert.deepEqual(
    ctx.calls.filter((c) => c.url.includes('/cam/')).map((c) => [c.method, c.url.replace(BASE, ''), c.body]),
    [
      ['PUT', '/api/cameras/cam/detection?enabled=1', undefined],
      ['PUT', '/api/cameras/cam/sensitivity?level=3', undefined],
      ['PUT', '/api/cameras/cam/zone', JSON.stringify({ points: SQUARE })],
    ],
  )
  assert.match(ctx.calls.map((c) => c.url).join(' '), /autre\/zone/)
  const sent = ctx.calls.length
  await control.syncDetection(BASE, ['cam'])
  assert.equal(ctx.calls.length, sent)
  // Après une minute, tout est renvoyé.
  ctx.time.advance(60_000)
  await control.syncDetection(BASE, ['cam'])
  assert.equal(ctx.calls.length, sent + 3)
  // Un réglage qui change est renvoyé tout de suite.
  ctx.settings.saveCameraSettings({ camera: 'cam', mode: 'off', fps: 25, light: 25, fpsMobile: 25, lightMobile: 25, sensitivity: 5, seconds: 60, orientation: 'landscape' })
  writeFileSync(`${ctx.dir}/zones.json`, '{}')
  await control.syncDetection(BASE, ['cam'])
  const last = ctx.calls.slice(sent + 3)
  assert.deepEqual(last.map((c) => c.url.replace(BASE, '')), ['/api/cameras/cam/detection?enabled=0', '/api/cameras/cam/sensitivity?level=5', '/api/cameras/cam/zone'])
  assert.equal(last[2]?.body, '{"points":null}')
})

test('syncDetection : un enregistreur muet ou qui refuse sera réessayé au tour suivant ; sans zones lisibles, la zone n\'est pas envoyée', async () => {
  let answer: () => Response = () => {
    throw new Error('hors ligne')
  }
  const ctx = testContext(() => answer())
  ctx.config.zonesFile = `${ctx.dir}/absent/zones.json`
  const control = createControl(ctx)
  await control.syncDetection(BASE, ['cam'])
  assert.equal(ctx.calls.length, 2)
  answer = () => new Response('', { status: 500 })
  await control.syncDetection(BASE, ['cam'])
  assert.equal(ctx.calls.length, 4)
  answer = () => new Response('ok')
  await control.syncDetection(BASE, ['cam'])
  assert.equal(ctx.calls.length, 6)
  await control.syncDetection(BASE, ['cam'])
  assert.equal(ctx.calls.length, 6)
})

test('syncDetection : une zone dont l\'envoi échoue est renvoyée', async () => {
  let ok = false
  let calls = 0
  const ctx = testContext((url) => {
    if (!url.endsWith('/zone') || ok) return new Response('ok')
    calls += 1
    if (calls === 2) throw new Error('hors ligne')
    return new Response('', { status: 500 })
  })
  const control = createControl(ctx)
  await control.syncDetection(BASE, ['cam'])
  const zoneCalls = () => ctx.calls.filter((c) => c.url.endsWith('/zone')).length
  assert.equal(zoneCalls(), 1)
  await control.syncDetection(BASE, ['cam'])
  assert.equal(zoneCalls(), 2)
  ok = true
  await control.syncDetection(BASE, ['cam'])
  await control.syncDetection(BASE, ['cam'])
  assert.equal(zoneCalls(), 3)
})

const streamUrl = (name: string) => `http://go2rtc:1984/api/streams?src=${name}`

test('syncLiveFps : règle à chaud les six flux de chaque caméra, au plus une fois par minute', async () => {
  const ctx = testContext((url, init) => {
    if (init?.method === 'PATCH') return new Response('', { status: 200 })
    if (url === streamUrl('cam_main_mjpeg')) return new Response('["ffmpeg:cam_main#video=mjpeg10"]')
    if (url === streamUrl('cam_sub_mjpeg')) return new Response('["ffmpeg:cam_sub#video%3Dmjpeg5"]')
    if (url === streamUrl('cam_main_mjpeg_m')) return new Response('', { status: 404 })
    if (url === streamUrl('cam_sub_mjpeg_m')) return new Response('["cam_sub"]')
    return new Response('["ffmpeg:cam_sub#video=mjpeg2"]')
  })
  ctx.settings.saveCameraSettings({ camera: 'cam', mode: 'always', fps: 10, light: 25, fpsMobile: 25, lightMobile: 12, sensitivity: 3, seconds: 60, orientation: 'landscape' })
  const control = createControl(ctx)
  await control.syncLiveFps(['cam'])
  const patches = ctx.calls.filter((c) => c.method === 'PATCH').map((c) => decodeURIComponent(c.url.replace('http://go2rtc:1984/api/streams?', '')))
  assert.deepEqual(patches, ['name=cam_sub_mjpeg&src=ffmpeg:cam_sub#video=mjpeg', 'name=cam_sub_mjpeg_m&src=ffmpeg:cam_sub#video=mjpeg12'])

  assert.match(ctx.logs.join('\n'), /Direct léger de cam : 25 images\/s \(go2rtc : HTTP 200\)/)
  assert.match(ctx.logs.join('\n'), /Direct léger \(téléphone\) de cam : 12 images\/s/)
  const count = ctx.calls.length
  await control.syncLiveFps(['cam'])
  assert.equal(ctx.calls.length, count)
  ctx.time.advance(60_000)
  await control.syncLiveFps(['cam'])
  assert.ok(ctx.calls.length > count)
})

test('syncLiveFps : go2rtc qui refuse ou ne répond pas est réessayé sans attendre une minute', async () => {
  let mode: 'refuse' | 'muet' | 'bon' = 'refuse'
  const ctx = testContext((_url, init) => {
    if (mode === 'muet') throw new Error('hors ligne')
    if (init?.method === 'PATCH') return new Response('', { status: mode === 'refuse' ? 500 : 200 })
    return new Response('["x#video=mjpeg3"]')
  })
  const control = createControl(ctx)
  await control.syncLiveFps(['cam'])
  assert.ok(ctx.logs.some((line) => /HTTP 500/.test(line)))
  const first = ctx.calls.length
  // L'échec a effacé la mémoire de la vérification : le tour suivant recommence.
  await control.syncLiveFps(['cam'])
  assert.ok(ctx.calls.length > first)
  mode = 'muet'
  control.resetLiveFpsCheck()
  await control.syncLiveFps(['cam'])
  mode = 'bon'
  control.resetLiveFpsCheck()
  const before = ctx.calls.length
  await control.syncLiveFps(['cam'])
  assert.ok(ctx.calls.length > before)
})

test('resetLiveFpsCheck : la prochaine vérification n\'attend pas', async () => {
  const ctx = testContext(() => new Response('["x#video=mjpeg25"]'))
  const control = createControl(ctx)
  await control.syncLiveFps(['cam'])
  const count = ctx.calls.length
  control.resetLiveFpsCheck()
  await control.syncLiveFps(['cam'])
  assert.equal(ctx.calls.length, count * 2)
})
