import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { call, routerApp, withServer, withTempDir } from '../testing/helpers.ts'
import { caRouter, readCertificate } from './ca.ts'

test('ca : seul un certificat sans clé privée est servi', async () => {
  await withTempDir(async (dir) => {
    const cert = join(dir, 'rootCA.crt')
    const withKey = join(dir, 'both.pem')
    const junk = join(dir, 'junk.pem')
    writeFileSync(cert, '-----BEGIN CERTIFICATE-----\nabc\n-----END CERTIFICATE-----\n')
    writeFileSync(withKey, '-----BEGIN CERTIFICATE-----\n-----BEGIN PRIVATE KEY-----\n')
    writeFileSync(junk, 'rien')
    assert.equal(readCertificate(''), null)
    assert.equal(readCertificate(join(dir, 'absent.pem')), null)
    assert.equal(readCertificate(withKey), null)
    assert.equal(readCertificate(junk), null)
    assert.ok(readCertificate(cert))

    await withServer(routerApp(caRouter(cert)), async (url) => {
      const reply = await call(`${url}/rootCA.crt`)
      assert.equal(reply.status, 200)
      assert.match(reply.headers.get('content-type') ?? '', /application\/x-x509-ca-cert/)
      assert.equal(reply.headers.get('content-disposition'), 'attachment; filename="rootCA.crt"')
      assert.match(String(reply.body), /BEGIN CERTIFICATE/)
    })
    await withServer(routerApp(caRouter(withKey)), async (url) => {
      assert.equal((await call(`${url}/rootCA.crt`)).status, 404)
    })
  })
})
