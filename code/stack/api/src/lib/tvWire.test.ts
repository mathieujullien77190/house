import assert from 'node:assert/strict'
import { test } from 'node:test'
import { bytesField, createFrameReader, encodeVarint, findField, frame, parseFields, TvWireError, varintField } from './tvWire.ts'

test('varint : petits et grands nombres', () => {
  assert.deepEqual([...encodeVarint(0)], [0])
  assert.deepEqual([...encodeVarint(300)], [0xac, 0x02])
  assert.deepEqual(parseFields(varintField(1, 2 ** 40)), [{ field: 1, value: 2 ** 40 }])
})

test('parseFields : entiers, octets, nombres fixes sautés', () => {
  const message = Buffer.concat([varintField(1, 150), bytesField(2, 'abc'), Buffer.from([0x0d, 1, 2, 3, 4]), Buffer.from([0x11, 1, 2, 3, 4, 5, 6, 7, 8]), varintField(3, 7)])
  const fields = parseFields(message)
  assert.equal(fields.length, 3)
  assert.equal(findField(fields, 1), 150)
  assert.equal((findField(fields, 2) as Buffer).toString(), 'abc')
  assert.equal(findField(fields, 3), 7)
  assert.equal(findField(fields, 9), undefined)
})

test('parseFields : message tronqué ou type inconnu', () => {
  assert.throws(() => parseFields(Buffer.from([0x08])), TvWireError)
  assert.throws(() => parseFields(Buffer.from([0x12, 0x05, 0x61])), TvWireError)
  assert.throws(() => parseFields(Buffer.from([0x0d, 1, 2])), TvWireError)
  assert.throws(() => parseFields(Buffer.from([0x09, 1, 2])), TvWireError)
  assert.throws(() => parseFields(Buffer.from([0x0b])), TvWireError)
  assert.throws(() => parseFields(Buffer.from([0x88, 0x88, 0x88, 0x88, 0x88, 0x88, 0x88, 0x88, 0x88, 0x01])), TvWireError)
})

test('createFrameReader : recolle les morceaux, rend chaque trame', () => {
  const seen: string[] = []
  const read = createFrameReader((message) => seen.push(message.toString()))
  const data = Buffer.concat([frame(Buffer.from('un')), frame(Buffer.from('deux'))])
  read(data.subarray(0, 1))
  assert.deepEqual(seen, [])
  read(data.subarray(1, 5))
  assert.deepEqual(seen, ['un'])
  read(data.subarray(5))
  assert.deepEqual(seen, ['un', 'deux'])
})

test('createFrameReader : une trame trop grosse est refusée', () => {
  const read = createFrameReader(() => undefined)
  assert.throws(() => read(encodeVarint(10_000_000)), TvWireError)
})
