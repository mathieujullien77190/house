import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createFreeboxClient, FreeboxError } from './freebox.ts'

type Reply = { status?: number; body: unknown }

/** Une box simulée : aucune requête réelle. */
const fakeBox = (answer: (method: string, path: string) => Reply) => {
  const calls: { method: string; path: string; body: unknown; auth: string | null }[] = []
  const fetcher = (async (url: string, init: RequestInit) => {
    const path = url.replace(/^.*\/api\/v16/, '')
    const headers = new Headers(init.headers)
    calls.push({ method: init.method ?? 'GET', path, body: init.body ? JSON.parse(init.body as string) : undefined, auth: headers.get('X-Fbx-App-Auth') })
    const reply = answer(init.method ?? 'GET', path)
    return new Response(JSON.stringify(reply.body), { status: reply.status ?? 200 })
  }) as unknown as typeof fetch
  return { fetcher, calls }
}
const login = (path: string): Reply | null =>
  path === '/login/' ? { body: { success: true, result: { challenge: 'abc' } } } : path === '/login/session/' ? { body: { success: true, result: { session_token: 'tok' } } } : null

test('get, put, post et del passent par une session ouverte une seule fois', async () => {
  const box = fakeBox((method, path) => login(path) ?? { body: { success: true, result: { method, path } } })
  const client = createFreeboxClient({ url: 'http://box/', appId: 'app', appToken: 'secret' }, box.fetcher)
  assert.deepEqual(await client.get('/a/'), { method: 'GET', path: '/a/' })
  assert.deepEqual(await client.put('/b/', { x: 1 }), { method: 'PUT', path: '/b/' })
  assert.deepEqual(await client.post('/c/', { y: 2 }), { method: 'POST', path: '/c/' })
  assert.deepEqual(await client.del('/d/1'), { method: 'DELETE', path: '/d/1' })
  assert.equal(box.calls.filter((call) => call.path === '/login/session/').length, 1)
  const post = box.calls.find((call) => call.method === 'POST' && call.path === '/c/')
  assert.deepEqual([post?.body, post?.auth], [{ y: 2 }, 'tok'])
  assert.equal(box.calls.find((call) => call.method === 'DELETE')?.body, undefined)
})

test('une session refusée est rouverte une fois ; un droit manquant remonte avec son code', async () => {
  let refused = true
  const box = fakeBox((_method, path) => {
    const opening = login(path)
    if (opening) return opening
    if (path === '/old/' && refused) {
      refused = false
      return { status: 403, body: { success: false, error_code: 'auth_required', msg: 'x' } }
    }
    if (path === '/rights/') return { status: 403, body: { success: false, error_code: 'insufficient_rights', msg: 'droit manquant' } }
    return { body: { success: true, result: 1 } }
  })
  const client = createFreeboxClient({ url: 'http://box', appId: 'app', appToken: 'secret' }, box.fetcher)
  assert.equal(await client.del('/old/'), 1)
  await assert.rejects(client.post('/rights/', {}), (error: unknown) => error instanceof FreeboxError && error.code === 'insufficient_rights' && error.status === 403)
})

test('une réponse qui n’est pas du JSON ou sans message : erreur avec le statut HTTP', async () => {
  const html = createFreeboxClient({ url: 'http://box', appId: 'a', appToken: 't' }, (async () => new Response('<html>', { status: 502 })) as unknown as typeof fetch)
  await assert.rejects(html.get('/x'), (error: unknown) => error instanceof FreeboxError && error.message === 'HTTP 502' && error.status === 502 && error.code === '')
})

test('une box muette : erreur de statut 0', async () => {
  const client = createFreeboxClient({ url: 'http://box', appId: 'a', appToken: 't' }, (async () => {
    throw new Error('down')
  }) as unknown as typeof fetch)
  await assert.rejects(client.get('/x'), (error: unknown) => error instanceof FreeboxError && error.status === 0)
})
