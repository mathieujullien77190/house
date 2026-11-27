import assert from 'node:assert/strict'
import { test } from 'node:test'
import { UnknownZoomCamera, type ZoomService } from '../services/zoomService.ts'
import { call, routerApp, withServer } from '../testing/helpers.ts'
import { zoomRouter } from './zoom.ts'

const setup = () => {
  const sets: number[] = []
  const fail = { error: null as Error | null }
  const check = (name: string) => {
    if (fail.error) throw fail.error
    if (name !== 'pommier') throw new UnknownZoomCamera(name)
  }
  const zoom: ZoomService = {
    get: async (name) => {
      check(name)
      return { pos: 3, min: 0, max: 28, paused: false }
    },
    set: async (name, pos) => {
      check(name)
      sets.push(pos)
      return { pos, min: 0, max: 28, paused: pos > 0 }
    },
  }
  return { zoom, sets, fail }
}

test('sans caméra à zoom : 404', async () => {
  await withServer(routerApp(zoomRouter(null)), async (url) => {
    assert.equal((await call(`${url}/cameras/pommier/zoom`)).status, 404)
    assert.equal((await call(`${url}/cameras/pommier/zoom`, 'PUT', { pos: 1 })).status, 404)
  })
})

test('lire et régler le zoom', async () => {
  const { zoom, sets } = setup()
  await withServer(routerApp(zoomRouter(zoom)), async (url) => {
    const read = await call(`${url}/cameras/pommier/zoom`)
    assert.equal(read.status, 200)
    assert.deepEqual(read.body, { pos: 3, min: 0, max: 28, paused: false })
    const written = await call(`${url}/cameras/pommier/zoom`, 'PUT', { pos: 14 })
    assert.equal(written.status, 200)
    assert.deepEqual(written.body, { pos: 14, min: 0, max: 28, paused: true })
    assert.deepEqual(sets, [14])
  })
})

test('un corps faux : 400', async () => {
  const { zoom, sets } = setup()
  await withServer(routerApp(zoomRouter(zoom)), async (url) => {
    assert.equal((await call(`${url}/cameras/pommier/zoom`, 'PUT')).status, 400)
    for (const body of [{}, { pos: '3' }, { pos: 2.5 }, { pos: null }]) {
      assert.equal((await call(`${url}/cameras/pommier/zoom`, 'PUT', body)).status, 400, JSON.stringify(body))
    }
    assert.deepEqual(sets, [])
  })
})

test('une caméra sans zoom : 404 ; une caméra muette : 502, sans le détail de l’erreur', async () => {
  const { zoom, fail } = setup()
  await withServer(routerApp(zoomRouter(zoom)), async (url) => {
    assert.equal((await call(`${url}/cameras/voliere-toit/zoom`)).status, 404)
    assert.equal((await call(`${url}/cameras/voliere-toit/zoom`, 'PUT', { pos: 1 })).status, 404)
    fail.error = new Error('http://10.0.0.7/?password=secret')
    const read = await call(`${url}/cameras/pommier/zoom`)
    assert.equal(read.status, 502)
    assert.deepEqual(read.body, { error: 'camera unreachable' })
    const written = await call(`${url}/cameras/pommier/zoom`, 'PUT', { pos: 1 })
    assert.equal(written.status, 502)
    assert.deepEqual(written.body, { error: 'camera unreachable' })
  })
})
