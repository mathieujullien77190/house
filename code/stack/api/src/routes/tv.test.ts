import assert from 'node:assert/strict'
import { test } from 'node:test'
import { TvRemoteError, type TvErrorCode, type TvRemote } from '../lib/tvRemote.ts'
import type { BoxDevice, BoxService } from '../services/boxService.ts'
import { call, routerApp, withServer } from '../testing/helpers.ts'
import { tvRouter } from './tv.ts'

const device = (name: string, type: string | null, active: boolean): BoxDevice => ({ name, ip: null, mac: 'AA', active, staticLease: null, type, vendor: null })

const setup = (devices: BoxDevice[] | Error) => {
  const log: string[] = []
  const state: { fail: TvErrorCode | 'plain' | null; paired: boolean } = { fail: null, paired: false }
  const maybeFail = () => {
    if (state.fail === 'plain') throw new Error('boom secret-material')
    if (state.fail) throw new TvRemoteError('refused with details', state.fail)
  }
  const tv: TvRemote = {
    press: async (key, long) => {
      maybeFail()
      log.push(`${key}${long ? ' long' : ''}`)
    },
    paired: () => state.paired,
    pairStart: async () => {
      maybeFail()
      log.push('start')
    },
    pairFinish: async (code) => {
      maybeFail()
      log.push(`code ${code}`)
    },
    unpair: () => void log.push('unpair'),
  }
  const box = {
    lanDevices: async () => {
      if (devices instanceof Error) throw devices
      return devices
    },
  } as unknown as BoxService
  return { tv, box, log, state }
}

test('GET /tv : non configurée, sans box', async () => {
  await withServer(routerApp(tvRouter(null, null)), async (url) => {
    assert.deepEqual((await call(`${url}/tv`)).body, { configured: false, paired: false, online: null })
  })
})

test('GET /tv : paired, online et name viennent du service et du Player de la box', async () => {
  const on = setup([device('Freebox', 'router', true), device('Freebox Player POP', 'freebox_pop', true)])
  on.state.paired = true
  await withServer(routerApp(tvRouter(on.tv, on.box)), async (url) => {
    assert.deepEqual((await call(`${url}/tv`)).body, { configured: true, paired: true, online: true, name: 'Freebox Player POP' })
  })
  const off = setup([device('Mon Player', null, false)])
  await withServer(routerApp(tvRouter(off.tv, off.box)), async (url) => {
    assert.deepEqual((await call(`${url}/tv`)).body, { configured: true, paired: false, online: false, name: 'Mon Player' })
  })
  const none = setup([device('Autre', null, true)])
  await withServer(routerApp(tvRouter(none.tv, none.box)), async (url) => {
    assert.deepEqual((await call(`${url}/tv`)).body, { configured: true, paired: false, online: null })
  })
  const broken = setup(new Error('box down'))
  await withServer(routerApp(tvRouter(broken.tv, broken.box)), async (url) => {
    assert.deepEqual((await call(`${url}/tv`)).body, { configured: true, paired: false, online: null })
  })
})

test('POST /tv/pair/start, POST /tv/pair/code, DELETE /tv/pair', async () => {
  const s = setup([])
  await withServer(routerApp(tvRouter(s.tv, s.box)), async (url) => {
    assert.deepEqual((await call(`${url}/tv/pair/start`, 'POST')).body, { started: true })
    assert.equal((await call(`${url}/tv/pair/code`, 'POST', { code: '12' })).status, 400)
    assert.equal((await call(`${url}/tv/pair/code`, 'POST')).status, 400)
    assert.deepEqual((await call(`${url}/tv/pair/code`, 'POST', { code: '1a2b3c' })).body, { paired: true })
    assert.deepEqual((await call(`${url}/tv/pair`, 'DELETE')).body, { paired: false })
    assert.deepEqual(s.log, ['start', 'code 1A2B3C', 'unpair'])
  })
})

test('l\'appairage : erreurs lisibles, jamais le détail interne', async () => {
  const s = setup([])
  await withServer(routerApp(tvRouter(s.tv, s.box)), async (url) => {
    for (const [fail, status] of [
      ['unreachable', 502],
      ['refused', 502],
      ['timeout', 504],
      ['no_pairing', 409],
      ['not_paired', 409],
      ['bad_code', 422],
    ] as const) {
      s.state.fail = fail
      const start = await call(`${url}/tv/pair/start`, 'POST')
      assert.equal(start.status, status, fail)
      assert.equal((start.body as { reason: string }).reason, fail)
      assert.equal((await call(`${url}/tv/pair/code`, 'POST', { code: '1A2B3C' })).status, status)
    }
    s.state.fail = 'plain'
    const plain = await call(`${url}/tv/pair/start`, 'POST')
    assert.equal(plain.status, 502)
    assert.equal(JSON.stringify(plain.body).includes('secret-material'), false)
  })
})

test('503 sans télécommande', async () => {
  await withServer(routerApp(tvRouter(null, null)), async (url) => {
    assert.equal((await call(`${url}/tv/pair/start`, 'POST')).status, 503)
    assert.equal((await call(`${url}/tv/pair/code`, 'POST', { code: '1A2B3C' })).status, 503)
    assert.equal((await call(`${url}/tv/pair`, 'DELETE')).status, 503)
    assert.equal((await call(`${url}/tv/key`, 'POST', { key: 'power' })).status, 503)
  })
})

test('POST /tv/key : 400 corps faux, envoie la touche, 409 non appairé, 502 Player éteint', async () => {
  const s = setup([])
  await withServer(routerApp(tvRouter(s.tv, s.box)), async (url) => {
    assert.equal((await call(`${url}/tv/key`, 'POST', { key: 'nope' })).status, 400)
    assert.equal((await call(`${url}/tv/key`, 'POST', { key: 'ok', long: 'yes' })).status, 400)
    assert.equal((await call(`${url}/tv/key`, 'POST')).status, 400)
    assert.deepEqual(s.log, [])
    assert.deepEqual((await call(`${url}/tv/key`, 'POST', { key: 'vol_inc' })).body, { key: 'vol_inc', long: false })
    assert.equal((await call(`${url}/tv/key`, 'POST', { key: 'ok', long: true })).status, 200)
    assert.deepEqual(s.log, ['vol_inc', 'ok long'])
    s.state.fail = 'not_paired'
    assert.equal((await call(`${url}/tv/key`, 'POST', { key: 'ok' })).status, 409)
    s.state.fail = 'unreachable'
    assert.equal((await call(`${url}/tv/key`, 'POST', { key: 'ok' })).status, 502)
  })
})
