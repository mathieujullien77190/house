import assert from 'node:assert/strict'
import { createHash, X509Certificate } from 'node:crypto'
import { createServer as createNetServer, type AddressInfo } from 'node:net'
import tls from 'node:tls'
import { test } from 'node:test'
import { generateIdentity, type TvIdentity } from './tvCert.ts'
import { connectTls, createTvRemote, findPlayer, isTvKey, normalizePairingCode, PAIRING_PORT, REMOTE_PORT, TV_KEYS, TvRemoteError, type TvConnect, type TvSocket } from './tvRemote.ts'
import type { TvStore } from './tvStore.ts'
import { bytesField, createFrameReader, findField, frame, parseFields, varintField } from './tvWire.ts'

// --- Une fausse TV : des sockets en mémoire qui parlent le protocole, sans réseau ---

const CLIENT = generateIdentity()
const PLAYER = generateIdentity()
const PLAYER_DER = new X509Certificate(PLAYER.cert).raw

class FakeSocket implements TvSocket {
  closed = false
  private dataCallback: ((chunk: Buffer) => void) | null = null
  private closeCallback: (() => void) | null = null
  private readonly reader: (chunk: Buffer) => void
  private readonly certificate: Buffer | null
  constructor(certificate: Buffer | null, onClient: (message: Buffer) => void) {
    this.certificate = certificate
    this.reader = createFrameReader(onClient)
  }
  write(data: Buffer) {
    if (!this.closed) this.reader(data)
  }
  close() {
    if (this.closed) return
    this.closed = true
    this.closeCallback?.()
  }
  serverCertificate() {
    return this.certificate
  }
  onData(callback: (chunk: Buffer) => void) {
    this.dataCallback = callback
  }
  onClose(callback: () => void) {
    this.closeCallback = callback
  }
  push(data: Buffer) {
    this.dataCallback?.(data)
  }
}

const pairMessage = (field: number, body: Buffer = Buffer.alloc(0), status = 200) => frame(Buffer.concat([varintField(1, 2), varintField(2, status), bytesField(field, body)]))

const secretFor = (clientCertificate: string, serverDer: Buffer, tail: string): Buffer => {
  const parts = [clientCertificate, serverDer].map((certificate) => {
    const jwk = new X509Certificate(certificate).publicKey.export({ format: 'jwk' })
    return [Buffer.from(jwk.n as string, 'base64url'), Buffer.from(jwk.e as string, 'base64url')]
  })
  const hash = createHash('sha256')
  for (const part of [...parts[0], ...parts[1], Buffer.from(tail, 'hex')]) hash.update(part)
  return hash.digest()
}

type PairingMode = 'ok' | 'refuse' | 'silent' | 'close' | 'huge' | 'wrongKind' | 'badProto' | 'badSecret' | 'closeAtSecret'

interface Net {
  connect: TvConnect
  connects: { port: number; socket: FakeSocket }[]
  /** Le comportement de la TV pour l'appairage. */
  pairing: PairingMode
  /** Le certificat montré par la TV à l'appairage. */
  serverCertificate: Buffer | null
  /** Le comportement de la TV pour la télécommande. */
  remote: 'ok' | 'silent' | 'closeAtOpen' | 'sendError' | 'huge' | 'noStart'
  down: boolean
  /** La TV répond un instant après (sinon dans l'appel d'écriture). */
  delay: boolean
  keys: { code: number; direction: number }[]
  pongs: number[]
  /** Le code que la TV afficherait pour la dernière connexion d'appairage. */
  code: () => string
}

const TAIL = '0A1B'

const createNet = (): Net => {
  const net: Net = {
    connects: [],
    pairing: 'ok',
    serverCertificate: PLAYER_DER,
    remote: 'ok',
    down: false,
    delay: false,
    keys: [],
    pongs: [],
    code: () => {
      const last = net.connects.filter((item) => item.port === PAIRING_PORT).at(-1)
      assert.ok(last)
      return `${secretFor(CLIENT.cert, PLAYER_DER, TAIL)[0].toString(16).padStart(2, '0')}${TAIL}`
    },
    connect: async (port) => {
      if (net.down) throw new Error('ECONNREFUSED')
      const socket: FakeSocket = new FakeSocket(port === PAIRING_PORT ? net.serverCertificate : null, (message) => (port === PAIRING_PORT ? onPairing(message, socket) : onRemote(message, socket)))
      net.connects.push({ port, socket })
      if (port === REMOTE_PORT) {
        setImmediate(() => {
          if (net.remote === 'closeAtOpen') socket.close()
          else if (net.remote === 'huge') socket.push(Buffer.from([0x80, 0x80, 0x80, 0x01]))
          else if (net.remote !== 'silent') socket.push(frame(bytesField(1, varintField(1, 622))))
        })
      }
      return socket
    },
  }
  const onPairing = (message: Buffer, fake: FakeSocket) => {
    const socket = net.delay ? { push: (data: Buffer) => void setImmediate(() => fake.push(data)), close: () => void setImmediate(() => fake.close()) } : fake
    if (net.pairing === 'silent') return
    if (net.pairing === 'close') return socket.close()
    if (net.pairing === 'huge') return socket.push(Buffer.from([0x80, 0x80, 0x80, 0x01]))
    if (net.pairing === 'badProto') return socket.push(frame(Buffer.from([0x12, 0x09, 0x61])))
    const field = parseFields(message).find((item) => item.field >= 10)?.field
    if (net.pairing === 'refuse') return socket.push(pairMessage(11, Buffer.alloc(0), 400))
    if (net.pairing === 'wrongKind' && field === 10) return socket.push(pairMessage(31))
    if (field === 10) socket.push(pairMessage(11))
    else if (field === 20) socket.push(pairMessage(20))
    else if (field === 30) socket.push(pairMessage(31))
    else if (field === 40) {
      if (net.pairing === 'closeAtSecret') return socket.close()
      if (net.pairing === 'badSecret') return socket.push(pairMessage(41, Buffer.alloc(0), 402))
      socket.push(pairMessage(41, bytesField(1, Buffer.alloc(32))))
    }
  }
  const onRemote = (message: Buffer, socket: FakeSocket) => {
    const first = parseFields(message)[0]
    const body = first.value as Buffer
    if (first.field === 1) socket.push(frame(bytesField(2, varintField(1, 622))))
    else if (first.field === 2) {
      if (net.remote === 'sendError') socket.push(frame(bytesField(3, Buffer.alloc(0))))
      else if (net.remote !== 'noStart') socket.push(frame(bytesField(40, varintField(1, 1))))
    } else if (first.field === 9) net.pongs.push(findField(parseFields(body), 1) as number)
    else if (first.field === 10) {
      const fields = parseFields(body)
      net.keys.push({ code: findField(fields, 1) as number, direction: findField(fields, 2) as number })
    }
  }
  return net
}

const createMemoryStore = (identity: TvIdentity | null = null): TvStore & { current: () => TvIdentity | null } => {
  let current = identity
  return { load: () => current, paired: () => current !== null, save: (value) => void (current = value), clear: () => void (current = null), current: () => current }
}

const remoteWith = (net: Net, store: TvStore, extra: Partial<Parameters<typeof createTvRemote>[0]> = {}) =>
  createTvRemote({ store, connect: net.connect, timeoutMs: 40, generate: () => CLIENT, sleep: async () => undefined, ...extra })

const expectCode = (code: string) => (error: unknown) => error instanceof TvRemoteError && error.code === code

// --- Appairage ---

test('pairStart puis pairFinish : le certificat est gardé, le code peut être saisi en minuscules', async () => {
  const net = createNet()
  const store = createMemoryStore()
  const tv = remoteWith(net, store)
  assert.equal(tv.paired(), false)
  await tv.pairStart()
  assert.equal(net.connects[0].port, PAIRING_PORT)
  await tv.pairFinish(net.code().toLowerCase())
  assert.equal(tv.paired(), true)
  assert.equal(store.current()?.cert, CLIENT.cert)
  assert.equal(net.connects[0].socket.closed, true)
})

test('pairFinish : code mal formé, aucun appairage ouvert, code faux (ressaisissable)', async () => {
  const net = createNet()
  const store = createMemoryStore()
  const tv = remoteWith(net, store)
  await assert.rejects(tv.pairFinish('12'), expectCode('bad_code'))
  await assert.rejects(tv.pairFinish('1A2B3C'), expectCode('no_pairing'))
  await tv.pairStart()
  const good = net.code()
  const wrong = `${((parseInt(good.slice(0, 2), 16) + 1) % 256).toString(16).padStart(2, '0')}${TAIL}`
  await assert.rejects(tv.pairFinish(wrong), expectCode('bad_code'))
  assert.equal(net.connects[0].socket.closed, false)
  await tv.pairFinish(good)
  assert.equal(tv.paired(), true)
})

test('pairStart : le Player injoignable, muet, fermé ou qui refuse', async () => {
  const net = createNet()
  const tv = remoteWith(net, createMemoryStore())
  net.down = true
  await assert.rejects(tv.pairStart(), expectCode('unreachable'))
  net.down = false
  for (const [mode, code] of [
    ['silent', 'timeout'],
    ['close', 'unreachable'],
    ['huge', 'unreachable'],
    ['refuse', 'refused'],
    ['wrongKind', 'refused'],
    ['badProto', 'refused'],
  ] as const) {
    net.pairing = mode
    await assert.rejects(tv.pairStart(), expectCode(code), mode)
    assert.equal(net.connects.at(-1)?.socket.closed, true, mode)
  }
})

test('pairFinish : la TV refuse le secret ou se ferme, la TV sans certificat RSA', async () => {
  const net = createNet()
  const store = createMemoryStore()
  const tv = remoteWith(net, store)
  await tv.pairStart()
  net.pairing = 'badSecret'
  await assert.rejects(tv.pairFinish(net.code()), expectCode('bad_code'))
  assert.equal(tv.paired(), false)
  await assert.rejects(tv.pairFinish(net.code()), expectCode('no_pairing'))

  net.pairing = 'ok'
  await tv.pairStart()
  net.pairing = 'closeAtSecret'
  await assert.rejects(tv.pairFinish(net.code()), expectCode('unreachable'))

  net.pairing = 'ok'
  net.serverCertificate = null
  await tv.pairStart()
  await assert.rejects(tv.pairFinish(net.code()), expectCode('refused'))
  net.serverCertificate = Buffer.from('pas un certificat')
  await tv.pairStart()
  await assert.rejects(tv.pairFinish(net.code()), expectCode('refused'))
  assert.equal(tv.paired(), false)
})

test('pairStart : un nouvel appairage ferme le précédent ; il expire sans code', async () => {
  const net = createNet()
  const tv = remoteWith(net, createMemoryStore(), { pairingMs: 15 })
  await tv.pairStart()
  await tv.pairStart()
  assert.equal(net.connects[0].socket.closed, true)
  assert.equal(net.connects[1].socket.closed, false)
  await new Promise((resolve) => setTimeout(resolve, 40))
  assert.equal(net.connects[1].socket.closed, true)
  await assert.rejects(tv.pairFinish(net.code()), expectCode('no_pairing'))
})

test('unpair : oublie le certificat et ferme l\'appairage ouvert', async () => {
  const net = createNet()
  const store = createMemoryStore(CLIENT)
  const tv = remoteWith(net, store)
  await tv.pairStart()
  tv.unpair()
  assert.equal(tv.paired(), false)
  assert.equal(net.connects[0].socket.closed, true)
})

// --- Télécommande ---

test('press : non appairé, Player injoignable', async () => {
  const net = createNet()
  await assert.rejects(remoteWith(net, createMemoryStore()).press('power'), expectCode('not_paired'))
  net.down = true
  await assert.rejects(remoteWith(net, createMemoryStore(CLIENT)).press('power'), expectCode('unreachable'))
})

test('press : poignée de main, touche brève en KeyCode Android, connexion réutilisée, ping répondu', async () => {
  const net = createNet()
  const tv = remoteWith(net, createMemoryStore(CLIENT))
  await tv.press('vol_inc')
  await tv.press('power')
  await tv.press('ok')
  assert.equal(net.connects.length, 1)
  assert.equal(net.connects[0].port, REMOTE_PORT)
  assert.deepEqual(net.keys, [
    { code: 24, direction: 3 },
    { code: 26, direction: 3 },
    { code: 23, direction: 3 },
  ])
  net.connects[0].socket.push(frame(bytesField(8, varintField(1, 5))))
  assert.deepEqual(net.pongs, [5])
})

test('press : appui long = START_LONG, attente, END_LONG', async () => {
  const net = createNet()
  const waits: number[] = []
  const tv = remoteWith(net, createMemoryStore(CLIENT), {
    sleep: async (ms) => {
      waits.push(ms)
    },
  })
  await tv.press('up', true)
  assert.deepEqual(net.keys, [
    { code: 19, direction: 1 },
    { code: 19, direction: 2 },
  ])
  assert.deepEqual(waits, [800])
})

test('press : la connexion tombe pendant l\'appui long', async () => {
  const net = createNet()
  const tv = remoteWith(net, createMemoryStore(CLIENT), {
    sleep: async () => net.connects[0].socket.close(),
  })
  await assert.rejects(tv.press('up', true), expectCode('unreachable'))
})

test('press : deux appuis en même temps partagent une connexion', async () => {
  const net = createNet()
  const tv = remoteWith(net, createMemoryStore(CLIENT))
  await Promise.all([tv.press('vol_inc'), tv.press('vol_dec'), tv.press('mute')])
  assert.equal(net.connects.length, 1)
  assert.equal(net.keys.length, 3)
})

test('press : connexion fermée ou muette depuis trop longtemps = nouvelle connexion', async () => {
  const net = createNet()
  let clock = 1000
  const tv = remoteWith(net, createMemoryStore(CLIENT), { now: () => clock })
  await tv.press('ok')
  net.connects[0].socket.close()
  await tv.press('ok')
  assert.equal(net.connects.length, 2)
  clock += 25_000
  await tv.press('ok')
  assert.equal(net.connects.length, 3)
  assert.equal(net.connects[1].socket.closed, true)
})

test('press : échec de poignée de main, puis nouvel essai', async () => {
  const net = createNet()
  const tv = remoteWith(net, createMemoryStore(CLIENT))
  for (const [mode, code] of [
    ['silent', 'timeout'],
    ['closeAtOpen', 'unreachable'],
  ] as const) {
    net.remote = mode
    await assert.rejects(tv.press('ok'), expectCode(code), mode)
  }
  net.remote = 'huge'
  await assert.rejects(tv.press('ok'), expectCode('unreachable'))
  net.remote = 'noStart'
  await tv.press('ok')
  assert.deepEqual(net.keys.length, 1)
})

test('press : la TV signale une erreur, la connexion est refermée puis rouverte', async () => {
  const net = createNet()
  const tv = remoteWith(net, createMemoryStore(CLIENT))
  await tv.press('ok')
  net.connects[0].socket.push(frame(bytesField(3, Buffer.alloc(0))))
  assert.equal(net.connects[0].socket.closed, true)
  await tv.press('ok')
  assert.equal(net.connects.length, 2)
  net.connects[1].socket.push(Buffer.from([0x80, 0x80, 0x80, 0x01]))
  assert.equal(net.connects[1].socket.closed, true)
})

test('press : une connexion inutilisée est refermée', async () => {
  const net = createNet()
  const tv = remoteWith(net, createMemoryStore(CLIENT), { idleMs: 10 })
  await tv.press('ok')
  await tv.press('ok')
  await new Promise((resolve) => setTimeout(resolve, 40))
  assert.equal(net.connects[0].socket.closed, true)
  await tv.press('ok')
  assert.equal(net.connects.length, 2)
})

test('l\'appairage termine la session de télécommande en cours', async () => {
  const net = createNet()
  const store = createMemoryStore(CLIENT)
  const tv = remoteWith(net, store)
  await tv.press('ok')
  await tv.pairStart()
  await tv.pairFinish(net.code())
  assert.equal(net.connects[0].socket.closed, true)
  tv.unpair()
})

test('une session qui a échoué n\'empêche pas la suivante (échec avant fermeture)', async () => {
  const net = createNet()
  const tv = remoteWith(net, createMemoryStore(CLIENT))
  net.remote = 'silent'
  await assert.rejects(tv.press('ok'), expectCode('timeout'))
  tv.unpair()
})

test('isTvKey, normalizePairingCode, findPlayer', () => {
  assert.equal(isTvKey('vol_inc'), true)
  assert.equal(isTvKey('reboot'), false)
  assert.equal(isTvKey(3), false)
  assert.equal(isTvKey('toString'), false)
  assert.equal(TV_KEYS.length, 46)
  assert.equal(normalizePairingCode(' 1a2b3c '), '1A2B3C')
  assert.equal(normalizePairingCode('1A2B3'), null)
  assert.equal(normalizePairingCode('1A2B3G'), null)
  assert.equal(normalizePairingCode(123456), null)
  const d = (name: string, type: string | null) => ({ name, ip: null, mac: 'A', active: true, staticLease: null, type, vendor: null })
  assert.equal(findPlayer([d('Freebox', 'freebox_pop'), d('Freebox Player POP', 'freebox_pop')])?.name, 'Freebox Player POP')
  assert.equal(findPlayer([d('x', null), d('Freebox Player', null)])?.name, 'Freebox Player')
  assert.equal(findPlayer([d('x', null)]), null)
})

// --- La vraie connexion TLS, sur la boucle locale (jamais le Player) ---

test('connectTls : poignée TLS locale, échanges, certificat du serveur, fermeture', async () => {
  const received: Buffer[] = []
  const held: { destroy: () => void }[] = []
  const server = tls.createServer({ key: PLAYER.key, cert: PLAYER.cert, requestCert: true, rejectUnauthorized: false }, (socket) => {
    held.push(socket)
    socket.on('data', (chunk) => {
      received.push(Buffer.from(chunk))
      socket.write(Buffer.from('pong'))
    })
    socket.on('error', () => undefined)
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo
  try {
    const socket = await connectTls('127.0.0.1')(port, CLIENT)
    const answer = new Promise<Buffer>((resolve) => socket.onData(resolve))
    const closed = new Promise<void>((resolve) => socket.onClose(resolve))
    socket.write(Buffer.from('ping'))
    assert.equal((await answer).toString(), 'pong')
    assert.equal(received[0].toString(), 'ping')
    assert.deepEqual(socket.serverCertificate(), PLAYER_DER)
    socket.close()
    await closed
  } finally {
    await new Promise<void>((resolve) => {
      server.close(() => resolve())
      held.forEach((socket) => socket.destroy())
    })
  }
})

test('connectTls : port fermé ou poignée qui n\'aboutit pas', async () => {
  const silent = createNetServer(() => undefined)
  await new Promise<void>((resolve) => silent.listen(0, '127.0.0.1', resolve))
  const { port } = silent.address() as AddressInfo
  await new Promise<void>((resolve) => silent.close(() => resolve()))
  await assert.rejects(connectTls('127.0.0.1', 200)(port, CLIENT), expectCode('unreachable'))

  const held: { destroy: () => void }[] = []
  const stuck = createNetServer((socket) => void held.push(socket))
  await new Promise<void>((resolve) => stuck.listen(0, '127.0.0.1', resolve))
  try {
    await assert.rejects(connectTls('127.0.0.1', 50)((stuck.address() as AddressInfo).port, CLIENT), expectCode('unreachable'))
  } finally {
    stuck.close()
    held.forEach((socket) => socket.destroy())
  }
})

test('appairage : la TV répond après coup, ou se ferme en cours d attente', async () => {
  const net = createNet()
  net.delay = true
  const tv = remoteWith(net, createMemoryStore())
  await tv.pairStart()
  await tv.pairFinish(net.code())
  assert.equal(tv.paired(), true)
  net.pairing = 'close'
  await assert.rejects(tv.pairStart(), expectCode('unreachable'))
})

test('press : deux appuis sur une connexion devenue trop vieille ouvrent une seule connexion', async () => {
  const net = createNet()
  let clock = 1000
  const tv = remoteWith(net, createMemoryStore(CLIENT), { now: () => clock })
  await tv.press('ok')
  clock += 25_000
  await Promise.all([tv.press('ok'), tv.press('ok')])
  assert.equal(net.connects.length, 2)
})

test('press : deux appuis pendant une poignée de main qui échoue échouent tous les deux', async () => {
  const net = createNet()
  net.remote = 'silent'
  const tv = remoteWith(net, createMemoryStore(CLIENT))
  const results = await Promise.allSettled([tv.press('ok'), tv.press('ok')])
  assert.deepEqual(results.map((result) => result.status), ['rejected', 'rejected'])
})

test('réglages par défaut : délais, horloge, identité neuve, appui long réel', async () => {
  const net = createNet()
  const tv = createTvRemote({ store: createMemoryStore(CLIENT), connect: net.connect })
  await tv.press('ok')
  await tv.press('ok', true)
  assert.equal(net.keys.length, 3)
  tv.unpair()
  const fresh = createTvRemote({ store: createMemoryStore(), connect: net.connect })
  await fresh.pairStart()
  fresh.unpair()
})

test('unpair pendant une poignée de main en cours', async () => {
  const net = createNet()
  net.remote = 'silent'
  const tv = remoteWith(net, createMemoryStore(CLIENT))
  const pending = tv.press('ok')
  tv.unpair()
  await assert.rejects(pending)
})

test('press : la connexion tombe pendant l’attente avant un lien d’application', async () => {
  const net = createNet()
  const tv = remoteWith(net, createMemoryStore(CLIENT), { sleep: async () => net.connects[0].socket.close() })
  await assert.rejects(tv.press('netflix'), expectCode('unreachable'))
})

test('press : Netflix réveille puis lance l’application (KeyCode 224, pas de KeyCode de touche)', async () => {
  const net = createNet()
  await remoteWith(net, createMemoryStore(CLIENT)).press('netflix')
  assert.deepEqual(net.keys, [{ code: 224, direction: 3 }])
})
