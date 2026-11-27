import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createReolinkClient, ReolinkError } from './reolinkClient.ts'

const CAMERA = { host: '10.0.0.7', user: 'ad min', password: 's&cret' }

const READ = [
  {
    cmd: 'GetZoomFocus',
    code: 0,
    range: { ZoomFocus: { zoom: { pos: { max: 28, min: 0 } }, focus: { pos: { max: 223, min: 0 } } } },
    value: { ZoomFocus: { zoom: { pos: 7 }, focus: { pos: 30 } } },
  },
]

const fake = (reply: unknown, status = 200) => {
  const calls: { url: string; init: RequestInit }[] = []
  const fetcher = (async (url: string, init: RequestInit) => {
    calls.push({ url, init })
    return new Response(JSON.stringify(reply), { status })
  }) as unknown as typeof fetch
  return { calls, client: createReolinkClient(fetcher) }
}

test('getZoom : POST GetZoomFocus, rend la position et la plage', async () => {
  const { calls, client } = fake(READ)
  assert.deepEqual(await client.getZoom(CAMERA), { pos: 7, min: 0, max: 28 })
  assert.equal(calls[0].url, 'http://10.0.0.7/cgi-bin/api.cgi?cmd=GetZoomFocus&user=ad%20min&password=s%26cret')
  assert.equal(calls[0].init.method, 'POST')
  assert.deepEqual(JSON.parse(calls[0].init.body as string), [{ cmd: 'GetZoomFocus', action: 1, param: { channel: 0 } }])
})

test('setZoom : POST StartZoomFocus avec ZoomPos', async () => {
  const { calls, client } = fake([{ cmd: 'StartZoomFocus', code: 0, value: { rspCode: 200 } }])
  await client.setZoom(CAMERA, 12)
  assert.match(calls[0].url, /cmd=StartZoomFocus&/)
  assert.deepEqual(JSON.parse(calls[0].init.body as string), [{ cmd: 'StartZoomFocus', action: 0, param: { ZoomFocus: { channel: 0, pos: 12, op: 'ZoomPos' } } }])
})

test('une réponse fausse est une erreur : HTTP, code, tableau vide, zoom illisible', async () => {
  await assert.rejects(fake(READ, 500).client.getZoom(CAMERA), /HTTP 500/)
  await assert.rejects(fake([{ cmd: 'StartZoomFocus', code: 1, error: { rspCode: -1 } }]).client.setZoom(CAMERA, 3), /StartZoomFocus refusé/)
  await assert.rejects(fake([]).client.getZoom(CAMERA), /refusé/)
  await assert.rejects(fake(null).client.getZoom(CAMERA), /refusé/)
  await assert.rejects(fake([{ code: 0 }]).client.getZoom(CAMERA), /illisible/)
  await assert.rejects(fake([{ code: 0, value: READ[0].value }]).client.getZoom(CAMERA), /illisible/)
  await assert.rejects(fake([{ code: 0, value: { ZoomFocus: { zoom: { pos: 'x' } } }, range: READ[0].range }]).client.getZoom(CAMERA), /illisible/)
  await assert.rejects(fake([{ code: 0, value: READ[0].value, range: { ZoomFocus: { zoom: { pos: { min: 0 } } } } }]).client.getZoom(CAMERA), /illisible/)
  await assert.rejects(fake([{ code: 0, value: READ[0].value, range: { ZoomFocus: { zoom: { pos: { min: 5, max: 5 } } } } }]).client.getZoom(CAMERA), /illisible/)
})

test('aucune erreur ne porte l’adresse, le compte ni le mot de passe', async () => {
  const leaking = (async (url: string) => {
    throw new Error(`fetch failed: ${url}`)
  }) as unknown as typeof fetch
  const failures = [
    createReolinkClient(leaking).getZoom(CAMERA),
    fake('pas du json', 200).client.getZoom(CAMERA),
    fake(READ, 401).client.getZoom(CAMERA),
    fake([{ code: 1 }]).client.setZoom(CAMERA, 1),
  ]
  for (const failure of failures) {
    await assert.rejects(failure, (error: unknown) => {
      assert.ok(error instanceof ReolinkError)
      assert.doesNotMatch(`${error.message} ${String(error.cause ?? '')}`, /10\.0\.0\.7|s&cret|s%26cret|ad min|password/)
      return true
    })
  }
})

test('utilise fetch par défaut', async () => {
  await assert.rejects(createReolinkClient().getZoom({ host: '127.0.0.1:1', user: 'u', password: 'p' }), /injoignable/)
})
