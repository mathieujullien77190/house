import assert from 'node:assert/strict'
import { join } from 'node:path'
import { mock, test } from 'node:test'
import { createPlanStore, type PlanStore } from '../lib/planStore.ts'
import { call, routerApp, withServer, withTempDir } from '../testing/helpers.ts'
import { planRouter } from './plan.ts'

test('plan : vide, remplacé, puis relu', async () => {
  await withTempDir(async (dir) => {
    await withServer(routerApp(planRouter(createPlanStore(join(dir, 'plan.json')))), async (url) => {
      assert.deepEqual((await call(`${url}/plan`)).body, { plan: null })
      const saved = await call(`${url}/plan`, 'PUT', { version: 2, cage: { x: 1, y: 2 } })
      assert.deepEqual((saved.body as { plan: { cage: unknown } }).plan.cage, { x: 1, y: 2 })
      assert.deepEqual(((await call(`${url}/plan`)).body as { plan: { cage: unknown } }).plan.cage, { x: 1, y: 2 })
    })
  })
})

test('plan : un corps qui n’est pas un document donne 400, une erreur d’écriture 500', async () => {
  const log = mock.method(console, 'error', () => undefined)
  try {
    const plan = {
      get: () => null,
      set: () => {
        throw new Error('disque plein')
      },
    } as unknown as PlanStore
    await withServer(routerApp(planRouter(plan)), async (url) => {
      assert.equal((await call(`${url}/plan`, 'PUT', [])).status, 400)
      assert.equal((await call(`${url}/plan`, 'PUT', 'null')).status, 400)
      assert.equal((await call(`${url}/plan`, 'PUT', 'texte')).status, 400)
      assert.equal((await call(`${url}/plan`, 'PUT', {})).status, 500)
    })
  } finally {
    log.mock.restore()
  }
})
