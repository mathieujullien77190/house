import assert from 'node:assert/strict'
import { test } from 'node:test'
import { listen } from '../testing/helpers.ts'
import { checksum, commandFrame, createHttpPost, createMitsubishiClient, decrypt, encrypt, parseReading, VANE_POSITIONS, WIDE_VANE_POSITIONS, type Post } from './mitsubishiClient.ts'

const bytesOf = (hex: string): number[] => [...Buffer.from(hex, 'hex')]

test('une trame de commande : les drapeaux disent quels champs comptent, l’octet de contrôle termine', () => {
  const frame = bytesOf(commandFrame({ power: true, mode: 'heat', temperature: 21, fan: '2', vane: '3' }))
  // en-tête (5 octets) puis 16 octets de données puis le contrôle
  assert.equal(frame.length, 5 + 16 + 1)
  const data = frame.slice(5, 21)
  assert.equal(data[1], 0x01 | 0x02 | 0x04 | 0x08 | 0x10)
  assert.deepEqual([data[3], data[4], data[14], data[6], data[7]], [1, 1, 0x80 + 42, 3, 3])
  assert.equal(frame[21], checksum(frame.slice(0, 21)))
})

test('l’ailette gauche / droite : second drapeau et 14e octet de données', () => {
  const codes: Record<string, number> = { left: 1, 'left-center': 2, center: 3, 'right-center': 4, right: 5, swing: 12 }
  assert.deepEqual([...WIDE_VANE_POSITIONS].sort(), Object.keys(codes).sort())
  for (const [position, code] of Object.entries(codes)) {
    const data = bytesOf(commandFrame({ wideVane: position })).slice(5, 21)
    assert.equal(data[2], 0x01, position)
    assert.equal(data[13], code, position)
    // les autres réglages ne bougent pas
    assert.equal(data[1], 0, position)
  }
  assert.ok(VANE_POSITIONS.includes('swing'))
})

test('la lecture : l’ailette gauche / droite vient des 4 bits du bas du 11e octet', () => {
  const frame = (wide: number): string => {
    const head = [0xfc, 0x62, 0x01, 0x30, 0x10]
    const data = new Array<number>(16).fill(0)
    data[0] = 0x02
    data[3] = 1
    data[4] = 1
    data[6] = 0
    data[7] = 4
    data[10] = wide
    const body = [...head, ...data]
    return Buffer.from([...body, checksum(body)]).toString('hex')
  }
  const names: [number, string | null][] = [
    [0x81, 'left'],
    [0x82, 'left-center'],
    [0x83, 'center'],
    [0x84, 'right-center'],
    [0x85, 'right'],
    [0x8c, 'swing'],
    [0x87, null],
  ]
  for (const [byte, name] of names) {
    const reading = parseReading([frame(byte)], -40)
    assert.equal(reading.wideVane, name, `0x${byte.toString(16)}`)
    assert.equal(reading.vane, '4')
    assert.equal(reading.power, true)
  }
  assert.equal(parseReading([], null).wideVane, null)
})

test('le chiffrement fait l’aller-retour ; une réponse illisible lève', () => {
  const xml = '<CSV><CONNECT>ON</CONNECT></CSV>'
  assert.equal(decrypt(encrypt(xml)), xml)
  assert.throws(() => decrypt('rien'), /illisible/)
  assert.throws(() => decrypt('<ESV>AAAA</ESV>'), /illisible/)
  assert.throws(() => decrypt(`<ESV>${Buffer.alloc(40).toString('base64')}</ESV>`), /illisible/)
})

test('une trame de commande : alimentation éteinte, rien d’autre', () => {
  const data = bytesOf(commandFrame({ power: false })).slice(5, 21)
  assert.deepEqual([data[1], data[3]], [0x01, 0])
})

const reading = (type: number, set: Record<number, number>): string => {
  const data = new Array<number>(16).fill(0)
  data[0] = type
  for (const [index, value] of Object.entries(set)) data[Number(index)] = value
  const body = [0xfc, 0x62, 0x01, 0x30, 0x10, ...data]
  return Buffer.from([...body, checksum(body)]).toString('hex')
}

test('la lecture : consigne et température de la pièce, nouvelle et ancienne forme ; trames étrangères ignorées', () => {
  const state = parseReading(
    [
      'fc62',
      Buffer.from([0xfd, ...new Array<number>(21).fill(0)]).toString('hex'),
      reading(0x02, { 3: 1, 4: 3, 6: 2, 7: 0, 11: 0x80 + 43 }),
      reading(0x03, { 6: 0x80 + 41 }),
      reading(0x09, {}),
    ],
    -50,
  )
  assert.deepEqual(state, { power: true, mode: 'cool', targetTemp: 21.5, roomTemp: 20.5, fan: '1', vane: 'auto', wideVane: null, rssi: -50 })
  const old = parseReading([reading(0x02, { 3: 0, 4: 9, 5: 10, 6: 9, 7: 9 }), reading(0x03, { 3: 12 })], null)
  assert.deepEqual(old, { power: false, mode: null, targetTemp: 21, roomTemp: 22, fan: null, vane: null, wideVane: null, rssi: null })
})

test('le client : lecture, changement, file par module, erreurs', async () => {
  const sent: string[] = []
  let status = 200
  let answer = ''
  const post: Post = async (host, body) => {
    sent.push(`${host} ${decrypt(body)}`)
    return { status, text: encrypt(answer) }
  }
  const client = createMitsubishiClient(post)
  answer = `<LSV><RSSI>-61</RSSI><CODE><VALUE>${reading(0x02, { 3: 1, 4: 1, 11: 0x80 + 40 })}</VALUE></CODE></LSV>`
  const [first, second] = await Promise.all([client.read('a'), client.read('a')])
  assert.equal(first.rssi, -61)
  assert.equal(second.targetTemp, 20)
  answer = '<LSV></LSV>'
  assert.equal((await client.read('b')).rssi, null)
  await client.apply('a', { power: true })
  assert.match(sent.at(-1) ?? '', /^a <CSV><CONNECT>ON<\/CONNECT><CODE><VALUE>fc41/)
  status = 500
  await assert.rejects(client.read('a'), /HTTP 500/)
  status = 200
  assert.equal((await client.read('a')).power, false)
})

test('le POST réel : réponse, port, refus de connexion et délai dépassé', async () => {
  let hang = false
  const server = await listen((req, res) => {
    if (hang) return
    let body = ''
    req.on('data', (chunk: Buffer) => (body += chunk.toString()))
    req.on('end', () => {
      res.statusCode = 201
      res.end(`${req.method} ${req.url} ${body}`)
    })
  })
  try {
    const host = new URL(server.url).host
    assert.deepEqual(await createHttpPost()(host, 'x'), { status: 201, text: 'POST /smart x' })
    hang = true
    await assert.rejects(createHttpPost(30)(host, 'x'), /pas de réponse/)
  } finally {
    await server.close()
  }
  await assert.rejects(createHttpPost()('127.0.0.1:1', 'x'))
})
