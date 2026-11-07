import assert from 'node:assert/strict'
import { test } from 'node:test'
import { clientIp } from './client.ts'

test('une connexion directe garde son adresse, même avec un en-tête X-Forwarded-For (on ne le croit pas)', () => {
  assert.equal(clientIp('::ffff:192.168.1.66', undefined), '192.168.1.66')
  assert.equal(clientIp('::ffff:192.168.1.66', '8.8.8.8'), '192.168.1.66')
  assert.equal(clientIp('203.0.113.9', '1.2.3.4'), '203.0.113.9')
})

test('depuis le mini PC (Funnel), l’adresse du visiteur est la dernière du X-Forwarded-For', () => {
  assert.equal(clientIp('::ffff:172.21.0.1', '203.0.113.7'), '203.0.113.7')
  assert.equal(clientIp('127.0.0.1', '6.6.6.6, 203.0.113.7'), '203.0.113.7')
  assert.equal(clientIp('::1', ['6.6.6.6', '2001:db8::5']), '2001:db8::5')
})

test('sans en-tête valable, l’adresse reste celle du mini PC', () => {
  assert.equal(clientIp('::ffff:172.21.0.1', undefined), '172.21.0.1')
  assert.equal(clientIp('::ffff:172.21.0.1', 'pas une adresse'), '172.21.0.1')
  assert.equal(clientIp('::ffff:172.21.0.1', ''), '172.21.0.1')
})
