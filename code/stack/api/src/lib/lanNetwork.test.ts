import assert from 'node:assert/strict'
import { test } from 'node:test'
import { expandIpv6, isLocalAddress, parsePrefix } from './lanNetwork.ts'

test('les adresses IPv4 privées et de bouclage sont locales, les autres non', () => {
  for (const address of ['10.1.2.3', '127.0.0.1', '172.16.0.1', '172.31.255.255', '192.168.1.40']) assert.equal(isLocalAddress(address), true, address)
  for (const address of ['8.8.8.8', '172.15.0.1', '172.32.0.1', '192.169.0.1', '300.168.1.1', '192.168.1', 'abc']) assert.equal(isLocalAddress(address), false, address)
})

test('une adresse absente n’est pas locale', () => {
  assert.equal(isLocalAddress(undefined), false)
  assert.equal(isLocalAddress(''), false)
})

test('la forme IPv6 d’une IPv4 : ::ffff:a.b.c.d', () => {
  assert.equal(isLocalAddress('::ffff:192.168.1.5'), true)
  assert.equal(isLocalAddress('::FFFF:8.8.8.8'), false)
})

test('IPv6 : bouclage, lien local et unique local sont locaux', () => {
  for (const address of ['::1', 'fe80::1', 'fe80::1%eth0', 'febf::1', 'fc00::1', 'fd12:3456::9']) assert.equal(isLocalAddress(address), true, address)
  for (const address of ['::2', '2001:db8::1', 'fec0::1', 'fe00::1', '1:2:3:4:5:6:7:8']) assert.equal(isLocalAddress(address), false, address)
})

test('le préfixe /64 de la maison rend locales les adresses publiques qui le partagent', () => {
  const prefixes = ['2a01:e0a:a16:58d0::/64', 'faux', '2a01:e0a:1::/48']
  assert.equal(isLocalAddress('2a01:e0a:a16:58d0:1:2:3:4', prefixes), true)
  assert.equal(isLocalAddress('2a01:e0a:a16:58d1:1:2:3:4', prefixes), false)
  assert.equal(isLocalAddress('2a01:e0a:a16:58d0:1:2:3:4'), false)
  assert.equal(isLocalAddress('pas une adresse', prefixes), false)
})

test('expandIpv6 : déplie « :: » et refuse le faux', () => {
  assert.deepEqual(expandIpv6('1:2:3:4:5:6:7:8'), [1, 2, 3, 4, 5, 6, 7, 8])
  assert.deepEqual(expandIpv6('::1'), [0, 0, 0, 0, 0, 0, 0, 1])
  assert.deepEqual(expandIpv6('1::'), [1, 0, 0, 0, 0, 0, 0, 0])
  assert.deepEqual(expandIpv6('::'), [0, 0, 0, 0, 0, 0, 0, 0])
  assert.equal(expandIpv6('1.2.3.4'), null)
  assert.equal(expandIpv6('1::2::3'), null)
  assert.equal(expandIpv6('1:2:3'), null)
  assert.equal(expandIpv6('1:2:3:4:5:6:7:8:9'), null)
  assert.equal(expandIpv6('g::1'), null)
  assert.equal(expandIpv6('::g'), null)
  assert.equal(expandIpv6('1:2:3:4:5:6:7::8'), null)
})

test('parsePrefix : les quatre premiers groupes d’un /64, sinon null', () => {
  assert.deepEqual(parsePrefix('2a01:e0a:a16:58d0::/64'), [0x2a01, 0xe0a, 0xa16, 0x58d0])
  assert.deepEqual(parsePrefix(' 2a01:e0a:a16:58d0:: '), [0x2a01, 0xe0a, 0xa16, 0x58d0])
  assert.equal(parsePrefix('2a01:e0a::/48'), null)
  assert.equal(parsePrefix('nimporte'), null)
})
