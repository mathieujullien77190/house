import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DIRECTION, parsePairing, parseRemote, pairingConfiguration, pairingOptions, pairingRequest, pairingSecret, remoteConfigure, remoteKey, remotePong, remoteSetActive } from './tvMessages.ts'
import { bytesField, findField, parseFields, varintField } from './tvWire.ts'

const sub = (data: Buffer, field: number): Buffer => findField(parseFields(data), field) as Buffer

test('messages d appairage : version, statut et corps', () => {
  const request = parseFields(pairingRequest('House'))
  assert.equal(findField(request, 1), 2)
  assert.equal(findField(request, 2), 200)
  const names = parseFields(sub(pairingRequest('House'), 10))
  assert.equal((findField(names, 1) as Buffer).toString(), 'atvremote')
  assert.equal((findField(names, 2) as Buffer).toString(), 'House')
  const options = sub(pairingOptions(), 20)
  assert.deepEqual(parseFields(sub(options, 1)).map((f) => f.value), [3, 6])
  assert.equal(findField(parseFields(options), 3), 1)
  const configuration = sub(pairingConfiguration(), 30)
  assert.equal(findField(parseFields(configuration), 2), 1)
  assert.deepEqual(sub(sub(pairingSecret(Buffer.from([1, 2])), 40), 1), Buffer.from([1, 2]))
})

test('parsePairing : nature et statut', () => {
  const outer = (status: number, field: number) => Buffer.concat([varintField(1, 2), varintField(2, status), bytesField(field, Buffer.alloc(0))])
  assert.deepEqual(parsePairing(outer(200, 11)), { status: 200, kind: 'request_ack' })
  assert.deepEqual(parsePairing(outer(200, 20)), { status: 200, kind: 'options' })
  assert.deepEqual(parsePairing(outer(200, 31)), { status: 200, kind: 'configuration_ack' })
  assert.deepEqual(parsePairing(outer(402, 41)), { status: 402, kind: 'secret_ack' })
  assert.deepEqual(parsePairing(varintField(1, 2)), { status: 0, kind: 'other' })
})

test('messages de télécommande', () => {
  assert.deepEqual(parseRemote(remoteConfigure(622)), { kind: 'configure', features: 622 & (1 + 2 + 4 + 8 + 32 + 64 + 512) })
  assert.deepEqual(parseRemote(remoteSetActive(622)), { kind: 'set_active' })
  assert.deepEqual(parseRemote(bytesField(40, varintField(1, 1))), { kind: 'start' })
  assert.deepEqual(parseRemote(bytesField(8, varintField(1, 5))), { kind: 'ping', val1: 5 })
  assert.deepEqual(parseRemote(bytesField(8, Buffer.alloc(0))), { kind: 'ping', val1: 0 })
  assert.deepEqual(parseRemote(bytesField(3, Buffer.alloc(0))), { kind: 'error' })
  assert.deepEqual(parseRemote(bytesField(1, Buffer.alloc(0))), { kind: 'configure', features: 0 })
  assert.deepEqual(parseRemote(bytesField(90, Buffer.alloc(0))), { kind: 'other' })
  assert.deepEqual(parseRemote(Buffer.alloc(0)), { kind: 'other' })
  assert.deepEqual(parseRemote(varintField(2, 1)), { kind: 'other' })
  const pong = sub(remotePong(9), 9)
  assert.equal(findField(parseFields(pong), 1), 9)
  const key = parseFields(sub(remoteKey(24, DIRECTION.startLong), 10))
  assert.equal(findField(key, 1), 24)
  assert.equal(findField(key, 2), 1)
})
