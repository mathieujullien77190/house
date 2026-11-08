import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import net from 'node:net'
import { test, type TestContext } from 'node:test'
import { createKasaClient, decrypt, encrypt } from './kasaClient.ts'

type Command = Record<string, Record<string, unknown>>
type Reply = Record<string, unknown> | Error | 'close' | 'timeout' | 'garbage'

interface Plug {
  /** Les adresses qui refusent la connexion. */
  refuse: Set<string>
  /** La réponse à une commande reçue par une adresse. */
  reply: (host: string, command: Command) => Reply
  /** Ce que la prise a reçu : « adresse commande ». */
  received: string[]
}

/** Remplace net.createConnection par une fausse prise qui parle le protocole Kasa (chiffré). */
const fakeNet = (t: TestContext, plug: Plug): void => {
  t.mock.method(net, 'createConnection', (options: { host: string }) => {
    let destroyed = false
    let onTimeout: () => void = () => undefined
    const socket = Object.assign(new EventEmitter(), {
      setTimeout: (_ms: number, callback: () => void) => void (onTimeout = callback),
      destroy: () => {
        if (destroyed) return
        destroyed = true
        // comme une vraie connexion, « close » arrive après coup
        setImmediate(() => socket.emit('close'))
      },
      end: () => socket.destroy(),
      write: (data: Buffer) => {
        const command = JSON.parse(decrypt(data.subarray(4))) as Command
        plug.received.push(`${options.host} ${Object.keys(command)[0]}.${Object.keys(Object.values(command)[0])[0]}`)
        const reply = plug.reply(options.host, command)
        if (reply === 'close') return void setImmediate(() => socket.emit('close'))
        if (reply === 'timeout') return void onTimeout()
        if (reply instanceof Error) return void socket.emit('error', reply)
        const payload = encrypt(reply === 'garbage' ? 'pas du json' : JSON.stringify(reply))
        // la réponse arrive en plusieurs morceaux : moins de 4 octets, puis le reste
        socket.emit('data', payload.subarray(0, 2))
        socket.emit('data', payload.subarray(2, 9))
        socket.emit('data', payload.subarray(9))
      },
    })
    setImmediate(() => (plug.refuse.has(options.host) ? socket.emit('error', new Error('ECONNREFUSED')) : socket.emit('connect')))
    return socket
  })
}

const newPlug = (reply: Plug['reply']): Plug => ({ refuse: new Set(), reply, received: [] })

const SYSINFO = { alias: 'chauffage', model: 'HS100(EU)', relay_state: 1, rssi: -61, on_time: 120, mac: 'D8:0D:17:1C:84:E3' }
const config = { host: '192.168.1.200', port: 9999, mac: 'D8:0D:17:1C:84:E3' }

test('le chiffrement XOR en chaîne se défait', () => {
  const text = '{"system":{"get_sysinfo":{}}}'
  const data = encrypt(text)
  assert.equal(data.readUInt32BE(0), text.length)
  assert.equal(decrypt(data.subarray(4)), text)
  assert.equal(data[4], 171 ^ '{'.charCodeAt(0))
})

test('l’état de la prise, avec son minuteur en cours', async (t) => {
  fakeNet(
    t,
    newPlug((_host, command) =>
      'system' in command
        ? { system: { get_sysinfo: SYSINFO } }
        : {
            count_down: {
              get_rules: {
                rule_list: [
                  { enable: 0, act: 0, remain: 5 },
                  { enable: 1, act: 1, remain: 6 },
                  { enable: 1, act: 0, remain: 0 },
                  { enable: 1, act: 0, remain: 90 },
                ],
              },
            },
          },
    ),
  )
  const info = await createKasaClient(config).info()
  assert.deepEqual(info, { alias: 'chauffage', model: 'HS100(EU)', on: true, rssi: -61, onTime: 120, timerSeconds: 90 })
})

test('sans minuteur, ou si le minuteur est illisible, la prise reste visible ; les champs absents ont une valeur par défaut', async (t) => {
  let countdown: Reply = { count_down: {} }
  fakeNet(
    t,
    newPlug((_host, command) => ('system' in command ? { system: { get_sysinfo: { relay_state: 0 } } } : countdown)),
  )
  const client = createKasaClient(config)
  assert.deepEqual(await client.info(), { alias: '', model: '', on: false, rssi: 0, onTime: 0, timerSeconds: null })
  countdown = 'garbage'
  assert.equal((await client.info()).timerSeconds, null)
})

test('les pannes de la prise : pas de réponse, connexion fermée, réponse inattendue', async (t) => {
  let reply: Reply = 'timeout'
  fakeNet(
    t,
    newPlug(() => reply),
  )
  const client = createKasaClient({ ...config, mac: '' })
  await assert.rejects(() => client.info(), /ne répond pas/)
  reply = 'close'
  await assert.rejects(() => client.info(), /a fermé la connexion/)
  reply = new Error('ECONNRESET')
  await assert.rejects(() => client.info(), /ECONNRESET/)
  reply = 'garbage'
  await assert.rejects(() => client.info(), SyntaxError)
  reply = {}
  await assert.rejects(() => client.info(), /réponse inattendue/)
})

test('allumer ou éteindre efface le minuteur puis commande le relais', async (t) => {
  const plug = newPlug(() => ({}))
  fakeNet(t, plug)
  const client = createKasaClient(config)
  await client.set(true)
  await client.set(false)
  assert.deepEqual(plug.received, [
    '192.168.1.200 count_down.delete_all_rules',
    '192.168.1.200 system.set_relay_state',
    '192.168.1.200 count_down.delete_all_rules',
    '192.168.1.200 system.set_relay_state',
  ])
})

test('le minuteur de la prise : programmé, ou refusé et la prise est rééteinte', async (t) => {
  const states: unknown[] = []
  let errCode: number | undefined = 0
  let failOff = false
  const plug = newPlug((_host, command) => {
    if (command.system) {
      states.push(command.system.set_relay_state)
      return command.system.set_relay_state && (command.system.set_relay_state as { state: number }).state === 0 && failOff
        ? new Error('coupée')
        : {}
    }
    if (command.count_down.add_rule) return { count_down: { add_rule: errCode === undefined ? {} : { err_code: errCode } } }
    return {}
  })
  fakeNet(t, plug)
  const client = createKasaClient({ ...config, mac: '' })

  await client.startTimer(300)
  assert.deepEqual(states, [{ state: 1 }])

  states.length = 0
  errCode = 7
  await assert.rejects(() => client.startTimer(300), /refusé le minuteur/)
  assert.deepEqual(states, [{ state: 1 }, { state: 0 }])

  // pas de code d'erreur du tout : refusé aussi ; et si la réextinction échoue, l'erreur d'origine reste
  states.length = 0
  errCode = undefined
  failOff = true
  await assert.rejects(() => client.startTimer(300), /refusé le minuteur/)
  assert.deepEqual(states, [{ state: 1 }, { state: 0 }])
})

test('la prise a changé d’adresse : retrouvée par sa MAC, puis gardée ; une recherche par minute', async (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: 1_000_000_000 })
  const plug = newPlug((host) => {
    if (host === '192.168.1.57') return { system: { get_sysinfo: SYSINFO } }
    if (host === '192.168.1.58') return { system: { get_sysinfo: { ...SYSINFO, mac: 'AA:AA:AA:AA:AA:AA' } } }
    // une autre prise sans MAC dans sa réponse
    if (host === '192.168.1.59') return { system: { get_sysinfo: { alias: 'x' } } }
    return { count_down: { get_rules: { rule_list: [] } } }
  })
  plug.refuse = new Set(
    Array.from({ length: 254 }, (_, index) => `192.168.1.${index + 1}`).filter(
      (host) => !['192.168.1.57', '192.168.1.58', '192.168.1.59'].includes(host),
    ),
  )
  fakeNet(t, plug)
  const client = createKasaClient(config)
  const info = await client.info()
  assert.equal(info.alias, 'chauffage')
  // la nouvelle adresse est utilisée tout de suite : la commande n'essaie plus l'ancienne
  plug.received.length = 0
  await client.info()
  assert.ok(plug.received.every((line) => line.startsWith('192.168.1.57 ')))

  // elle disparaît : une nouvelle recherche dans la minute est refusée
  plug.refuse.add('192.168.1.57')
  await assert.rejects(() => client.info(), /ECONNREFUSED/)
  // une minute plus tard, la recherche a lieu mais ne trouve rien
  t.mock.timers.tick(60_001)
  plug.refuse.add('192.168.1.58')
  plug.refuse.add('192.168.1.59')
  await assert.rejects(() => client.info(), /ECONNREFUSED/)
})

test('sans MAC, ou avec un nom plutôt qu’une adresse, pas de recherche', async (t) => {
  const plug = newPlug(() => ({}))
  plug.refuse.add('prise.local')
  plug.refuse.add('192.168.1.200')
  fakeNet(t, plug)
  await assert.rejects(() => createKasaClient({ host: 'prise.local', port: 9999, mac: 'AA' }).info(), /ECONNREFUSED/)
  await assert.rejects(() => createKasaClient({ host: '192.168.1.200', port: 9999, mac: '' }).info(), /ECONNREFUSED/)
  assert.deepEqual(plug.received, [])
})
