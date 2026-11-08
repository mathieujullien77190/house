// Tests des petits outils HTTP : corps JSON borné, entier de réglage, réponse JSON.
import assert from 'node:assert/strict'
import { Readable } from 'node:stream'
import { test } from 'node:test'
import type { IncomingMessage } from 'node:http'
import { intSetting, readBody, readJsonObject, sendJson } from './http.ts'
import { fakeRequest, fakeResponse } from './testing.ts'

test('readBody rend le corps reçu', async () => {
  assert.equal(await readBody(fakeRequest({ body: '{"a":1}' })), '{"a":1}')
})

test('readBody refuse un corps de plus de 16 Ko', async () => {
  await assert.rejects(readBody(fakeRequest({ body: 'x'.repeat(17 * 1024) })), /trop gros/)
})

test('readBody échoue si la requête a une erreur ou si la connexion est coupée', async () => {
  const broken = new Readable({ read() {} }) as unknown as IncomingMessage
  const failing = readBody(broken)
  broken.emit('error', new Error('boom'))
  await assert.rejects(failing, /boom/)
  const cut = new Readable({ read() {} }) as unknown as IncomingMessage
  const closing = readBody(cut)
  cut.emit('close')
  await assert.rejects(closing, /connexion coupée/)
})

test('readJsonObject : un objet passe, le reste donne null', async () => {
  assert.deepEqual(await readJsonObject(fakeRequest({ body: '{"a":1}' })), { a: 1 })
  assert.equal(await readJsonObject(fakeRequest({ body: '[1]' })), null)
  assert.equal(await readJsonObject(fakeRequest({ body: 'null' })), null)
  assert.equal(await readJsonObject(fakeRequest({ body: '3' })), null)
  assert.equal(await readJsonObject(fakeRequest({ body: 'pas du json' })), null)
})

test('intSetting : valeur actuelle si absente, entier borné, null sinon', () => {
  assert.equal(intSetting(undefined, 7, 1, 10), 7)
  assert.equal(intSetting(5, 7, 1, 10), 5)
  assert.equal(intSetting(0, 7, 1, 10), null)
  assert.equal(intSetting(11, 7, 1, 10), null)
  assert.equal(intSetting(2.5, 7, 1, 10), null)
  assert.equal(intSetting('5', 7, 1, 10), null)
  assert.equal(intSetting(true, 7, 1, 10), null)
})

test('sendJson écrit le code, le type et le corps ; des en-têtes en plus au besoin', async () => {
  const res = fakeResponse()
  sendJson(res, 201, { ok: true }, { 'Set-Cookie': 'a=b' })
  await res.done
  assert.equal(res.status, 201)
  assert.equal(res.sentHeaders['Set-Cookie'], 'a=b')
  assert.match(String(res.sentHeaders['Content-Type']), /application\/json/)
  assert.equal(res.text(), '{"ok":true}')
  const plain = fakeResponse()
  sendJson(plain, 200, [])
  assert.equal(plain.text(), '[]')
})
