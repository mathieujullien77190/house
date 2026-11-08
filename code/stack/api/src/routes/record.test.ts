import assert from 'node:assert/strict'
import { join } from 'node:path'
import { test } from 'node:test'
import { createSavedClipsStore } from '../lib/savedClipsStore.ts'
import { call, listen, routerApp, withServer, withTempDir } from '../testing/helpers.ts'
import { recordRouter } from './record.ts'

/** Un faux enregistreur : on choisit sa réponse, on note ce qu'on lui demande. */
const recorder = async () => {
  const seen: string[] = []
  const reply: { status: number; body: unknown; raw?: string } = { status: 200, body: { recording: false } }
  const server = await listen((req, res) => {
    seen.push(`${req.method} ${req.url}`)
    res.writeHead(reply.status, { 'Content-Type': 'application/json' })
    res.end(reply.raw ?? JSON.stringify(reply.body))
  })
  return { server, seen, reply }
}

test('l’enregistrement est relayé ; un clip commencé à la main est sauvegardé d’office', async () => {
  const fake = await recorder()
  try {
    await withTempDir(async (dir) => {
      const saved = createSavedClipsStore(join(dir, 'saved.json'))
      await withServer(routerApp(recordRouter(fake.server.url, saved)), async (url) => {
        assert.deepEqual((await call(`${url}/record/cam-1`)).body, { recording: false })

        fake.reply.body = { recording: true, id: 'clip-9' }
        assert.deepEqual((await call(`${url}/record/cam-1`, 'POST')).body, { recording: true, id: 'clip-9' })
        assert.deepEqual([...saved.ids()], ['clip-9'])

        // l'arrêt ne touche pas la liste
        fake.reply.body = { recording: false, id: 'clip-10' }
        await call(`${url}/record/cam-1`, 'DELETE')
        assert.deepEqual([...saved.ids()], ['clip-9'])

        // un refus de l'enregistreur est rendu tel quel, sans sauvegarde
        fake.reply.status = 409
        fake.reply.body = { id: 'clip-11', error: 'déjà en cours' }
        const refused = await call(`${url}/record/cam-1`, 'POST')
        assert.equal(refused.status, 409)
        assert.deepEqual([...saved.ids()], ['clip-9'])

        // une réponse sans identifiant texte n'ajoute rien
        fake.reply.status = 200
        fake.reply.body = { id: 5 }
        await call(`${url}/record/cam-1`, 'POST')
        assert.deepEqual([...saved.ids()], ['clip-9'])
        // un identifiant que la liste refuse n'empêche pas de répondre : l'enregistrement a bien commencé
        fake.reply.body = { recording: true, id: 'clip 12' }
        const odd = await call(`${url}/record/cam-1`, 'POST')
        assert.equal(odd.status, 200)
        assert.deepEqual([...saved.ids()], ['clip-9'])
        assert.deepEqual(fake.seen[0], 'GET /api/cameras/cam-1/record')
      })
    })
  } finally {
    await fake.server.close()
  }
})

test('nom de caméra invalide : 400 ; méthode inconnue : 405 ; sans enregistreur : 503', async () => {
  const fake = await recorder()
  try {
    await withTempDir(async (dir) => {
      const saved = createSavedClipsStore(join(dir, 'saved.json'))
      await withServer(routerApp(recordRouter(fake.server.url, saved)), async (url) => {
        assert.equal((await call(`${url}/record/${'a'.repeat(41)}`)).status, 400)
        assert.equal((await call(`${url}/record/cam-1`, 'PUT', {})).status, 405)
      })
      await withServer(routerApp(recordRouter(null, saved)), async (url) => {
        assert.equal((await call(`${url}/record/cam-1`)).status, 503)
      })
    })
    assert.deepEqual(fake.seen, [])
  } finally {
    await fake.server.close()
  }
})

test('un enregistreur muet ou qui répond autre chose que du JSON donne 502', async () => {
  const fake = await recorder()
  await withTempDir(async (dir) => {
    const saved = createSavedClipsStore(join(dir, 'saved.json'))
    await withServer(routerApp(recordRouter(fake.server.url, saved)), async (url) => {
      fake.reply.raw = 'pas du json'
      assert.equal((await call(`${url}/record/cam-1`)).status, 502)
    })
    await fake.server.close()
    await withServer(routerApp(recordRouter(fake.server.url, saved)), async (url) => {
      assert.deepEqual((await call(`${url}/record/cam-1`)).body, { error: 'recorder does not answer' })
    })
  })
})
