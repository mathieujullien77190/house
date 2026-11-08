import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { test } from 'node:test'
import express from 'express'
import { withServer, withTempDir } from '../testing/helpers.ts'
import { createBackupFiles } from './backupFiles.ts'

test('un fichier du disque est envoyé avec son type, jamais un fichier hors du disque, 404 s’il manque', async () => {
  await withTempDir(async (dir) => {
    const root = resolve(dir, 'backup')
    mkdirSync(join(root, 'clips'), { recursive: true })
    writeFileSync(join(root, 'clips', 'a.mp4'), 'video!')
    writeFileSync(join(dir, 'secret.txt'), 'secret')
    const files = createBackupFiles(root)
    const app = express()
    app.get('/f', (req, res) => files.send(res, String(req.query.p), 'video/mp4'))
    await withServer(app, async (url) => {
      const ok = await fetch(`${url}/f?p=clips/a.mp4`, { headers: { Range: 'bytes=0-2' } })
      assert.equal(ok.status, 206)
      assert.equal(ok.headers.get('content-type'), 'video/mp4')
      assert.equal(await ok.text(), 'vid')
      assert.equal((await fetch(`${url}/f?p=${encodeURIComponent('../secret.txt')}`)).status, 404)
      assert.equal((await fetch(`${url}/f?p=clips/absent.mp4`)).status, 404)
    })
  })
})

test('une erreur d’envoi après les en-têtes ne répond plus', () => {
  let answered = false
  const res = {
    headersSent: true,
    sendFile: (_file: string, _options: unknown, done: (error?: Error) => void) => done(new Error('coupé')),
    status: () => {
      answered = true
      return { json: () => undefined }
    },
  }
  createBackupFiles(resolve('/x')).send(res as never, 'a.mp4', 'video/mp4')
  assert.equal(answered, false)
})
