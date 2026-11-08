import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import https from 'node:https'
import { test } from 'node:test'
import { withServer } from '../testing/helpers.ts'
import { createHueClient } from './hueClient.ts'

interface Seen {
  method: string
  url: string
  body: string
  contentType: string | undefined
}

/** Un faux pont : on choisit la réponse à chaque « MÉTHODE chemin », on note les demandes. */
const bridge = (replies: Record<string, { status?: number; body?: unknown }>) => {
  const seen: Seen[] = []
  const handler = (req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse) => {
    let body = ''
    req.on('data', (chunk: Buffer) => (body += chunk))
    req.on('end', () => {
      seen.push({ method: req.method ?? '', url: req.url ?? '', body, contentType: req.headers['content-type'] })
      const reply = replies[`${req.method} ${req.url}`] ?? { status: 404, body: {} }
      res.writeHead(reply.status ?? 200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(reply.body ?? {}))
    })
  }
  return { seen, handler }
}

test('lectures de l’API v1 : capteurs, lampes, pièces, programmations', async () => {
  const { seen, handler } = bridge({
    'GET /api/cle/sensors': { body: { '1': { name: 's' } } },
    'GET /api/cle/lights': { body: { '1': { name: 'l' } } },
    'GET /api/cle/groups': { body: { '1': { name: 'g' } } },
    'GET /api/cle/schedules': { body: { '1': { name: 'x' } } },
  })
  await withServer(handler, async (url) => {
    // une barre finale dans l'adresse du pont est ignorée
    const hue = createHueClient({ url: `${url}/`, key: 'cle' })
    assert.deepEqual(await hue.sensors(), { '1': { name: 's' } })
    assert.deepEqual(await hue.lights(), { '1': { name: 'l' } })
    assert.deepEqual(await hue.groups(), { '1': { name: 'g' } })
    assert.deepEqual(await hue.schedules(), { '1': { name: 'x' } })
    assert.equal(hue.commandBase, '/api/cle')
    assert.equal(seen[0].contentType, undefined)
    assert.equal(seen[0].body, '')
  })
})

test('ordres : lampe avec ou sans transition, pièce, minuteur, suppression', async () => {
  const { seen, handler } = bridge({
    'PUT /api/cle/lights/3/state': { body: [{ success: {} }] },
    'PUT /api/cle/groups/4/action': { body: [{ success: {} }] },
    'POST /api/cle/schedules': { body: [{ success: { id: '7' } }] },
    'DELETE /api/cle/schedules/7': { body: [{ success: 'deleted' }] },
  })
  await withServer(handler, async (url) => {
    const hue = createHueClient({ url, key: 'cle' })
    await hue.setLight('3', { on: true, bri: 10 })
    await hue.setLight('3', { bri: 1, transition: 50 })
    await hue.setGroup('4', { on: false })
    const id = await hue.createTimer({
      name: 'n',
      description: 'd',
      localtime: 'PT00:00:10',
      command: { address: '/a', method: 'PUT', body: { on: false } },
    })
    await hue.deleteSchedule('7')
    assert.equal(id, '7')
    assert.deepEqual(
      seen.map((call) => [call.method, call.url, call.body ? JSON.parse(call.body) : null, call.contentType]),
      [
        ['PUT', '/api/cle/lights/3/state', { on: true, bri: 10 }, 'application/json'],
        ['PUT', '/api/cle/lights/3/state', { bri: 1, transitiontime: 50 }, 'application/json'],
        ['PUT', '/api/cle/groups/4/action', { on: false }, 'application/json'],
        [
          'POST',
          '/api/cle/schedules',
          {
            name: 'n',
            description: 'd',
            localtime: 'PT00:00:10',
            command: { address: '/a', method: 'PUT', body: { on: false } },
            status: 'enabled',
            autodelete: true,
          },
          'application/json',
        ],
        ['DELETE', '/api/cle/schedules/7', null, undefined],
      ],
    )
  })
})

test('les erreurs du pont : HTTP, tableau d’erreurs, minuteur non créé', async () => {
  const { handler } = bridge({
    'GET /api/cle/sensors': { status: 503 },
    'GET /api/cle/lights': { body: [{ error: { description: 'unauthorized user' } }] },
    'GET /api/cle/groups': { body: [{ error: {} }] },
    'POST /api/cle/schedules': { body: [{ success: {} }] },
  })
  await withServer(handler, async (url) => {
    const hue = createHueClient({ url, key: 'cle' })
    await assert.rejects(() => hue.sensors(), /HTTP 503/)
    await assert.rejects(() => hue.lights(), /unauthorized user/)
    await assert.rejects(() => hue.groups(), /pont Hue : erreur/)
    await assert.rejects(
      () => hue.createTimer({ name: 'n', description: 'd', localtime: 'PT00:00:10', command: { address: '/a', method: 'PUT', body: {} } }),
      /minuteur non créé/,
    )
  })
})

/** Une fausse réponse HTTPS : on choisit ce qu'elle émet. */
const fakeHttps = (behavior: (req: EventEmitter & { destroy: (error?: Error) => void }, answer: (res: EventEmitter) => void) => void) => {
  const calls: unknown[] = []
  const original = https.get
  https.get = ((options: unknown, callback: (res: EventEmitter) => void) => {
    calls.push(options)
    const req = Object.assign(new EventEmitter(), { destroy: (error?: Error) => void (error && req.emit('error', error)) })
    setImmediate(() => behavior(req, (res) => callback(res)))
    return req
  }) as unknown as typeof https.get
  return { calls, restore: () => void (https.get = original) }
}

const response = (statusCode: number, complete = true) =>
  Object.assign(new EventEmitter(), { statusCode, complete, setEncoding: () => undefined })

test('API v2 : la ressource est lue en HTTPS sans vérifier le certificat', async () => {
  const fake = fakeHttps((_req, answer) => {
    const res = response(200)
    answer(res)
    res.emit('data', '{"data":')
    res.emit('data', '[{"id":"a"}]}')
    res.emit('end')
    res.emit('close')
  })
  try {
    const hue = createHueClient({ url: 'http://192.168.1.81:8080', key: 'cle' })
    assert.deepEqual(await hue.v2('room'), [{ id: 'a' }])
    assert.deepEqual(fake.calls[0], {
      host: '192.168.1.81:8080',
      path: '/clip/v2/resource/room',
      headers: { 'hue-application-key': 'cle' },
      rejectUnauthorized: false,
      timeout: 5000,
    })
  } finally {
    fake.restore()
  }
})

test('API v2 : statut, JSON illisible, réponse coupée, délai, erreur réseau', async () => {
  const hue = createHueClient({ url: 'http://192.168.1.81', key: 'cle' })
  const scenarios: [string, RegExp, Parameters<typeof fakeHttps>[0]][] = [
    [
      'statut',
      /HTTP 403/,
      (_req, answer) => {
        const res = response(403)
        answer(res)
        res.emit('end')
      },
    ],
    [
      'json',
      /JSON|Unexpected/,
      (_req, answer) => {
        const res = response(200)
        answer(res)
        res.emit('data', 'pas du json')
        res.emit('end')
      },
    ],
    [
      'coupée',
      /réponse coupée/,
      (_req, answer) => {
        const res = response(200, false)
        answer(res)
        res.emit('close')
      },
    ],
    ['délai', /délai dépassé/, (req) => void req.emit('timeout')],
    ['réseau', /ECONNRESET/, (req) => void req.emit('error', new Error('ECONNRESET'))],
  ]
  for (const [name, expected, behavior] of scenarios) {
    const fake = fakeHttps(behavior)
    try {
      await assert.rejects(() => hue.v2('room'), expected, name)
    } finally {
      fake.restore()
    }
  }
})
