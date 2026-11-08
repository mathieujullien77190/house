import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import http from 'node:http'
import { test, type TestContext } from 'node:test'
import { createSwitchClient, parsePorts } from './switchClient.ts'

interface Call {
  method: string
  path: string
  cookie: string | undefined
  body: string
  headers: Record<string, string | number>
  options: Record<string, unknown>
}

type Answer = { status?: number; text?: string; cookies?: string[] } | Error | 'timeout' | 'cut'

/** La page poe_port_config.cgi : huit ports, le premier coupé. */
const page = (state: number[] = [0, 1, 1, 1, 1, 1, 1, 1], extra = ''): string =>
  `<script>var portConfig = {\n state:[${state.join(',')}${extra}],\n power:[0, 55, 120, 0, 0, 0, 0, 0],\n powerstatus:[1, 2, 2, 1, 1, 1, 1, 1],\n priority:[2, 2, 2, 2, 2, 2, 2, 2],\n powerlimit:[300, 300, 150, 300, 300, 300, 300, 300] };</script>`

/** Remplace http.request par un faux switch : `answer` décide de la réponse à chaque demande. */
const fakeSwitch = (t: TestContext, answer: (call: Call) => Answer) => {
  const calls: Call[] = []
  let running = 0
  let maxRunning = 0
  t.mock.method(http, 'request', (options: Record<string, unknown>, callback: (res: EventEmitter) => void) => {
    let body = ''
    const request = Object.assign(new EventEmitter(), {
      write: (chunk: string) => void (body += chunk),
      destroy: (error?: Error) => void (error && setImmediate(() => request.emit('error', error))),
      end: () => {
        const headers = options.headers as Record<string, string | number>
        const call: Call = {
          method: String(options.method),
          path: String(options.path),
          cookie: headers.Cookie as string | undefined,
          body,
          headers,
          options,
        }
        calls.push(call)
        running += 1
        maxRunning = Math.max(maxRunning, running)
        setImmediate(() => {
          running -= 1
          const reply = answer(call)
          if (reply === 'timeout') return void request.emit('timeout')
          if (reply instanceof Error) return void request.emit('error', reply)
          const res = Object.assign(new EventEmitter(), {
            statusCode: reply === 'cut' ? 200 : reply.status,
            complete: reply !== 'cut',
            headers: reply !== 'cut' && reply.cookies ? { 'set-cookie': reply.cookies } : {},
            setEncoding: () => undefined,
          })
          callback(res)
          if (reply === 'cut') return void res.emit('close')
          res.emit('data', reply.text ?? '')
          res.emit('end')
          res.emit('close')
        })
      },
    })
    return request
  })
  return { calls, maxRunning: () => maxRunning }
}

/** Le comportement d'un switch qui accepte le compte et garde l'état de ses ports. */
const workingSwitch = () => {
  let state = [0, 1, 1, 1, 1, 1, 1, 1]
  return (call: Call): Answer => {
    if (call.path === '/logon.cgi') return { status: 200, text: 'allow = 1', cookies: ['session=abc; path=/', 'autre=1'] }
    if (call.path === '/logout.cgi') return { status: 200, text: '' }
    if (call.path.startsWith('/poe_port_config.cgi?')) {
      const query = new URLSearchParams(call.path.split('?')[1])
      const bit = Number(query.get('selBit'))
      state = state.map((value, index) => ((bit >> index) & 1 ? Number(query.get('poe_status')) : value))
    }
    return { status: 200, text: page(state) }
  }
}

test('la page des ports est lue : état, puissance, priorité, limite', () => {
  const { statuses, priority, limit } = parsePorts(page([0, 1, 1, 1, 1, 1, 1, 1], ', 1, 1'))
  assert.equal(statuses.length, 8)
  assert.deepEqual(statuses[0], { port: 1, enabled: false, powered: false, watts: 0 })
  assert.deepEqual(statuses[1], { port: 2, enabled: true, powered: true, watts: 5.5 })
  assert.deepEqual(statuses[2], { port: 3, enabled: true, powered: true, watts: 12 })
  assert.deepEqual(priority, [2, 2, 2, 2, 2, 2, 2, 2])
  assert.deepEqual(limit.slice(0, 3), [300, 300, 150])
  assert.deepEqual(parsePorts('var portConfig = { state:[ ], power:[], powerstatus:[], priority:[], powerlimit:[] };').statuses, [])
})

test('une page inattendue est refusée', () => {
  assert.throws(() => parsePorts('<html>login</html>'), /page PoE inattendue/)
  assert.throws(() => parsePorts('var portConfig = { state:[1] };'), /champ power introuvable/)
})

test('lire les ports : connexion, lecture, déconnexion, avec le cookie du switch', async (t) => {
  const fake = fakeSwitch(t, workingSwitch())
  const client = createSwitchClient({ url: 'http://192.168.1.33', user: 'admin', password: 'pw' })
  const ports = await client.ports()
  assert.equal(ports.length, 8)
  assert.deepEqual(
    fake.calls.map((call) => [call.method, call.path, call.cookie]),
    [
      ['POST', '/logon.cgi', undefined],
      ['GET', '/poe_port_config.cgi', 'session=abc; autre=1'],
      ['GET', '/logout.cgi', 'session=abc; autre=1'],
    ],
  )
  assert.equal(fake.calls[0].body, 'username=admin&password=pw&logon=Login')
  assert.equal(fake.calls[0].headers['Content-Type'], 'application/x-www-form-urlencoded')
  assert.equal(fake.calls[0].headers['Content-Length'], fake.calls[0].body.length)
  assert.equal(fake.calls[1].headers['Content-Length'], undefined)
  assert.equal(fake.calls[0].options.port, 80)
})

test('un port explicite dans l’adresse du switch est respecté', async (t) => {
  const fake = fakeSwitch(t, workingSwitch())
  await createSwitchClient({ url: 'http://192.168.1.33:8081', user: 'a', password: 'b' }).ports()
  assert.equal(fake.calls[0].options.port, '8081')
})

test('changer le PoE d’un port renvoie les réglages du port et relit son état', async (t) => {
  const fake = fakeSwitch(t, workingSwitch())
  const client = createSwitchClient({ url: 'http://192.168.1.33', user: 'a', password: 'b' })
  // port 1 : limite 30 W (classe 4) ; port 3 : 15 W (réglage manuel)
  const first = await client.setPoe(1, true)
  assert.deepEqual(first, { port: 1, enabled: true, powered: false, watts: 0 })
  const third = await client.setPoe(3, false)
  assert.equal(third.enabled, false)
  const changes = fake.calls
    .filter((call) => call.path.includes('poe_status'))
    .map((call) => Object.fromEntries(new URLSearchParams(call.path.split('?')[1])))
  assert.deepEqual(changes, [
    { poe_status: '1', poe_priority: '2', power_limit: '4', power_limit_value: '30', selBit: '1' },
    { poe_status: '0', poe_priority: '2', power_limit: '5', power_limit_value: '15', selBit: '4' },
  ])
})

test('un port qui ne change pas d’état est une erreur, et la session est fermée quand même', async (t) => {
  const fake = fakeSwitch(t, (call) => {
    if (call.path === '/logon.cgi') return { text: 'allow = 1', cookies: ['s=1'] }
    return { text: page() }
  })
  const client = createSwitchClient({ url: 'http://192.168.1.33', user: 'a', password: 'b' })
  await assert.rejects(() => client.setPoe(2, false), /le port 2 n'a pas changé d'état/)
  assert.equal(fake.calls.at(-1)?.path, '/logout.cgi')
})

test('après un refus de connexion, le switch n’est pas dérangé pendant une minute', async (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: 1_000_000 })
  let accept = false
  const fake = fakeSwitch(t, (call) => (call.path === '/logon.cgi' ? { text: accept ? 'allow = 1' : 'allow = 0' } : { text: page() }))
  const client = createSwitchClient({ url: 'http://192.168.1.33', user: 'a', password: 'b' })
  await assert.rejects(() => client.ports(), /connexion refusée/)
  assert.equal(fake.calls.length, 1)
  await assert.rejects(() => client.ports(), /connexion refusée/)
  assert.equal(fake.calls.length, 1)
  t.mock.timers.tick(60_000)
  accept = true
  assert.equal((await client.ports()).length, 8)
})

test('une panne du switch : pas de réponse, erreur réseau, réponse coupée ; la déconnexion qui échoue est ignorée', async (t) => {
  let failure: Answer = 'timeout'
  fakeSwitch(t, (call) =>
    call.path === '/logon.cgi' ? failure : call.path === '/logout.cgi' ? new Error('plus de session') : { text: page() },
  )
  const client = createSwitchClient({ url: 'http://192.168.1.33', user: 'a', password: 'b' })
  await assert.rejects(() => client.ports(), /pas de réponse/)
  failure = new Error('ECONNRESET')
  await assert.rejects(() => client.ports(), /ECONNRESET/)
  failure = 'cut'
  await assert.rejects(() => client.ports(), /réponse coupée/)
  // une réponse sans cookie ni statut est acceptée si la page dit allow = 1
  failure = { text: 'allow = 1' }
  assert.equal((await client.ports()).length, 8)
})

test('les opérations passent une par une', async (t) => {
  const fake = fakeSwitch(t, workingSwitch())
  const client = createSwitchClient({ url: 'http://192.168.1.33', user: 'a', password: 'b' })
  const results = await Promise.all([client.ports(), client.ports(), client.setPoe(2, true)])
  assert.equal(results.length, 3)
  assert.equal(fake.maxRunning(), 1)
  // chaque session est complète avant que la suivante ne commence
  const paths = fake.calls.map((call) => call.path)
  assert.deepEqual(paths.slice(0, 3), ['/logon.cgi', '/poe_port_config.cgi', '/logout.cgi'])
  assert.deepEqual(paths.slice(3, 6), ['/logon.cgi', '/poe_port_config.cgi', '/logout.cgi'])
})

test('une opération qui échoue ne bloque pas les suivantes', async (t) => {
  fakeSwitch(t, (call) => (call.path === '/logon.cgi' ? { text: 'allow = 0' } : { text: page() }))
  const client = createSwitchClient({ url: 'http://192.168.1.33', user: 'a', password: 'b' })
  const first = client.ports()
  const second = client.ports()
  await assert.rejects(first, /connexion refusée/)
  await assert.rejects(second, /connexion refusée/)
})
