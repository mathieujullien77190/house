import assert from 'node:assert/strict'
import { X509Certificate, createPublicKey, createPrivateKey } from 'node:crypto'
import { test } from 'node:test'
import { generateIdentity } from './tvCert.ts'

test('generateIdentity : certificat X.509 auto-signé valide avec sa clé', () => {
  const now = new Date('2026-11-12T10:00:00Z')
  const identity = generateIdentity(now)
  const certificate = new X509Certificate(identity.cert)
  assert.equal(certificate.subject, 'CN=House')
  assert.equal(certificate.issuer, 'CN=House')
  assert.equal(certificate.verify(certificate.publicKey), true)
  assert.equal(certificate.checkPrivateKey(createPrivateKey(identity.key)), true)
  assert.equal(certificate.publicKey.asymmetricKeyType, 'rsa')
  assert.equal(createPublicKey(identity.cert).asymmetricKeyDetails?.modulusLength, 2048)
  assert.ok(new Date(certificate.validFrom) < now)
  assert.ok(new Date(certificate.validTo) > new Date('2036-01-01'))
  assert.match(identity.cert, /^-----BEGIN CERTIFICATE-----\n/)
  assert.match(identity.key, /^-----BEGIN PRIVATE KEY-----\n/)
})

test('generateIdentity : deux identités différentes, date par défaut', () => {
  assert.notEqual(generateIdentity().key, generateIdentity().key)
})
