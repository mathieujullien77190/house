import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import type { request } from 'node:https'
import { test } from 'node:test'
import { createJournalPost, type JournalTarget } from './journalClient.ts'

const TARGET: JournalTarget = { url: 'https://sync:8081', key: 'cle', ca: 'CA', servername: 'localhost' }

interface Sent {
  url: string
  options: Record<string, unknown>
  body: string
}

/** Un faux `https.request` : note l'envoi, puis répond `status`, ou lève l'erreur / le délai demandé. */
const fakeRequest = (behavior: { status?: number; error?: Error; timeout?: boolean }) => {
  const sent: Sent[] = []
  const send = ((url: string, options: Record<string, unknown>, onReply: (res: { statusCode: number; resume: () => void }) => void) => {
    const req = new EventEmitter() as EventEmitter & { end: (body: string) => void; destroy: (error: Error) => void }
    req.destroy = (error) => void req.emit('error', error)
    req.end = (body) => {
      sent.push({ url, options, body })
      if (behavior.error) req.emit('error', behavior.error)
      else if (behavior.timeout) req.emit('timeout')
      else onReply({ statusCode: behavior.status ?? 200, resume: () => undefined })
    }
    return req
  }) as unknown as typeof request
  return { send, sent }
}

test('sans cible, rien n’est envoyé', () => {
  const fake = fakeRequest({})
  createJournalPost(null, undefined, fake.send)('heating', { at: 1 })
  assert.deepEqual(fake.sent, [])
})

test('une ligne part en POST JSON avec la clé, la CA et le nom du certificat', () => {
  const fake = fakeRequest({})
  const errors: string[] = []
  createJournalPost(TARGET, (message) => errors.push(message), fake.send)('shutters', { at: 1, shutter: '1' })
  assert.equal(fake.sent.length, 1)
  assert.equal(fake.sent[0].url, 'https://sync:8081/api/journal/shutters')
  assert.equal(fake.sent[0].body, '{"at":1,"shutter":"1"}')
  assert.deepEqual(
    { method: fake.sent[0].options.method, ca: fake.sent[0].options.ca, servername: fake.sent[0].options.servername, headers: fake.sent[0].options.headers },
    { method: 'POST', ca: 'CA', servername: 'localhost', headers: { 'Content-Type': 'application/json', 'Content-Length': 22, 'X-House-Key': 'cle' } },
  )
  assert.deepEqual(errors, [])
})

test('une réponse refusée, une erreur réseau ou un délai dépassé sont signalés sans lever', () => {
  const errors: string[] = []
  createJournalPost(TARGET, (message) => errors.push(message), fakeRequest({ status: 401 }).send)('heating', {})
  createJournalPost(TARGET, (message) => errors.push(message), fakeRequest({ error: new Error('refusé') }).send)('heating', {})
  createJournalPost(TARGET, (message) => errors.push(message), fakeRequest({ timeout: true }).send)('shutters', {})
  assert.deepEqual(errors, ['journal heating : réponse 401', 'journal heating : refusé', 'journal shutters : délai dépassé'])
})

test('sans fonction d’erreur, une erreur ne gêne personne', () => {
  assert.doesNotThrow(() => createJournalPost(TARGET, undefined, fakeRequest({ error: new Error('x') }).send)('heating', {}))
})
